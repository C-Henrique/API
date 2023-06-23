const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();

// Função para obter o endereço IP do cliente
const getClientIP = (req) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  return ipAddress.split(',')[0];
};

// Função para registrar o log
const log = (message) => {
  const timestamp = new Date().toLocaleString();
  fs.appendFile('log.log', `[${timestamp}] ${message}\n`, (err) => {
    if (err) {
      console.error('Erro ao registrar o log:', err);
    }
  });
};

const configPath = './config.json';
let config;

try {
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configFile);
} catch (err) {
  console.error('Erro ao ler o arquivo de configuração:', err);
  log(`Erro ao ler o arquivo de configuração: ${err}`);
  process.exit(1);
}

const stopService = (ip, service) => {
  return new Promise((resolve, reject) => {
    exec(`taskkill /S ${ip} /u ${config.user} /p ${config.pw} /F /FI "SERVICES eq ${service}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro durante a execução do comando:', error);
        console.error('Erro no stderr:', stderr);
        reject(error);
      } else {
        console.log('Serviço parado:', stdout);
        resolve();
      }
    });
  });
};

const startService = (ip, service) => {
  return new Promise((resolve, reject) => {
    exec(`sc \\\\${ip} start ${service} type=own obj="${config.user} password="${config.pw}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro durante a execução do comando:', error);
        console.error('Erro no stderr:', stderr);
        reject(error);
      } else {
        console.log('Serviço iniciado:', stdout);
        resolve();
      }
    });
  });
};

const restartService = async (ip, service) => {
  try {
    await stopService(ip, service);
    await sleep(5000);
    await startService(ip, service);
  } catch (error) {
    console.error('Erro ao reiniciar o serviço:', error);
    throw error; // Lança o erro novamente para que seja tratado adequadamente no ponto de chamada.
  }
};

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

app.get('/restart/:ip', async (req, res) => {
  const { baseIP, service } = config;
  const ip = req.params.ip;
  const windowsIP = `${baseIP}${ip}`;
  const clientIP = getClientIP(req);

  log(`Requisição para reiniciar o serviço iniciada. IP do servidor: ${windowsIP}. Cliente: ${clientIP}`);

  try {
    const command = `powershell.exe -Command "& {Get-Service -ComputerName ${windowsIP} -Name '${service}' | Select-Object -ExpandProperty Status}" -Credential (New-Object System.Management.Automation.PSCredential ('${config.user}', (ConvertTo-SecureString -String '${config.pw}' -AsPlainText -Force)))`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Erro durante a execução do comando:', stderr);
      res.status(500).json({ message: 'Erro ao reiniciar o serviço.', server: windowsIP });
      log(`Erro ao reiniciar o serviço. IP do servidor: ${windowsIP}. Cliente: ${clientIP}`);
      return;
    }

    const status = stdout.trim();
    if (status !== 'Running') {
      await restartService(windowsIP, service);
    } else {
      log(`${clientIP} - O serviço ${service} já está em execução no ${windowsIP}. Ele será reiniciado!`);
      await restartService(windowsIP, service);
    }

    res.status(200).json({ message: 'Serviço reiniciado com sucesso.', server: windowsIP });
    log(`Serviço reiniciado com sucesso. IP do servidor: ${windowsIP}. Cliente: ${clientIP}`);
  } catch (error) {
    console.error('Erro ao reiniciar o serviço:', error);
    log(`Erro ao reiniciar o serviço: ${error}`);
    res.status(500).json({ message: 'Erro ao reiniciar o serviço.', server: windowsIP });
  }
});

// Função auxiliar para executar comandos assincronamente
const execAsync = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

// Inicia o servidor da API
app.listen(config.port, () => {
  console.log(`API rodando no caminho: http://localhost:${config.port}/restart/`);
});

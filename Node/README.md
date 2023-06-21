# API 
Reiniciar serviços via NodeJS

## O que é
Dentro do projeto deve conter os seguintes arquivos

* config.json - arquivo de configuração
* index.js - código base

O ``config.json`` deve conter em os seguintes parametros:

* service - nome do serviço em questão
* port - porta onde API vai iniciar
* baseIP - base de IP dos host que contem esse serviço

## Como usar
No seu navegador coloque a URL 
```sh
http://ip_do_servidor/restart/IP
```
O campo ``IP`` diz respeito ao ultimo octeto do IP já preconfigurado no arquivo ``config.json``.
Por exemplo,
```sh
http://192.168.16.50/restart/120
```

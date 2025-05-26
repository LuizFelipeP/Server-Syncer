##  1. Clone o Repositório

git clone https://github.com/LuizFelipeP/Server-Syncer.git

ou

No WebStorm clicar no nome do projeto e selecionar 'Clone Repository'.

![img.png](img.png)

Depois informar o link
https://github.com/LuizFelipeP/Server-Syncer.git

## 2. Instalar Dependências

npm install

## 3. Criar um arquivo dentro do projeto chamado '.env' com as seguintes informações dentro do arquivo:



```
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_NAME=syncer
JWT_SECRET=rnWtzfKGHvlUwZc0cTUPESGQayvDwbt2ZPCFIkU2SYoW30sOrw0aE0MgLPZP2cqh

```
## 4. Iniciar a aplicação

``` bash

node ./bin/www

```
## 5. Testar com a aplicação rodando



# Controle de Estoque

Sistema simples de estoque com:

- Frontend em React direto no navegador.
- Backend em PHP puro.
- Dados salvos em `data/storage.json`.
- Sem Laravel, sem Composer, sem build de frontend.

## Estrutura

```text
api/
  config.php       Configuracao do arquivo de dados
  helpers.php      Funcoes comuns de JSON, leitura e gravacao
  index.php        Rotas simples da API
data/
  storage.json     Banco simples em arquivo JSON
database/
  schema.sql       Modelo opcional para MySQL no futuro
public/
  index.html       Entrada do frontend
  api/index.php    Ponte publica para a API PHP
  assets/app.jsx   Aplicacao React
  assets/styles.css
  manifest.json
  sw.js
docs/
  architecture.md  Explicacao do fluxo simples
```

## Como rodar no PC

Voce precisa apenas de PHP instalado.

Na pasta do projeto:

```bash
php -S 127.0.0.1:8000 -t public
```

Acesse:

```text
http://127.0.0.1:8000
```

## Como abrir no celular na mesma rede

Rode o servidor aceitando conexoes externas:

```bash
php -S 0.0.0.0:8000 -t public
```

Descubra o IP do PC:

```powershell
ipconfig
```

No celular, conectado ao mesmo Wi-Fi, acesse:

```text
http://IP-DO-SEU-PC:8000
```

Exemplo:

```text
http://192.168.0.10:8000
```

## Endpoints da API

Todos ficam em `public/api/index.php`.

```text
GET  /api/index.php?resource=dashboard
GET  /api/index.php?resource=suppliers
POST /api/index.php?resource=suppliers
GET  /api/index.php?resource=products
POST /api/index.php?resource=products
GET  /api/index.php?resource=movements
POST /api/index.php?resource=movements
GET  /api/index.php?resource=invoices
POST /api/index.php?resource=invoices
POST /api/index.php?resource=invoices&action=cancel
```

## Observacao

Essa versao foi feita para ser facil de entender. Para producao real com varios usuarios ao mesmo tempo, o ideal e trocar `data/storage.json` por MySQL usando o modelo em `database/schema.sql`.

# Arquitetura simples

O projeto agora nao usa Laravel. A separacao ficou assim:

```text
Navegador
  -> public/index.html
      -> public/assets/app.jsx
          -> fetch('/api/index.php?resource=...')
              -> public/api/index.php
                  -> api/index.php
                      -> data/storage.json
```

## Frontend

O frontend esta em `public/assets/app.jsx`.

Ele usa React via CDN, sem Vite, npm ou build. O arquivo cria telas para:

- Dashboard
- Fornecedores
- Produtos
- Movimentacoes

## Backend

O backend esta em `api/index.php`.

Ele le o parametro `resource` da URL e decide o que fazer:

- `dashboard`
- `suppliers`
- `products`
- `movements`
- `invoices`

## Dados

Os dados ficam em `data/storage.json`.

Esse arquivo funciona como um banco simples. Ele guarda listas de fornecedores, produtos, movimentacoes e notas.

## Quando usar MySQL

Use MySQL quando o sistema precisar crescer, ter muitos acessos ao mesmo tempo ou autenticar usuarios. O arquivo `database/schema.sql` ja deixa um modelo inicial de tabelas.


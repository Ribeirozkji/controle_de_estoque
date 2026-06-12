# Controle de Estoque

Sistema de controle de estoque em migracao para Laravel.

O repositório original era um PWA React/Babel de arquivo unico, persistindo tudo em `localStorage`. A estrutura atual preserva essa interface como tela inicial, mas adiciona uma base Laravel para separar rotas, validacoes, regras de negocio, models e migrations.

## Estrutura atual

```text
app/
  Http/Controllers/Api/   Controllers JSON por modulo
  Http/Requests/          Validacao de entrada
  Models/                 Entidades Eloquent e relacionamentos
  Services/               Regras de negocio
database/migrations/      Schema versionado do banco
docs/
  architecture.md         Fluxo do projeto e separacao de responsabilidades
  legacy/db.php           PDO/SQL antigo mantido como referencia
public/                   Front controller, PWA manifest, service worker
resources/
  views/stock/app.php     Interface React/Babel legada
  js/legacy-app.js        JS legado como referencia
  css/legacy-style.css    CSS legado como referencia
routes/
  web.php                 Tela principal
  api.php                 API REST
```

## Fluxo da aplicacao

```text
Navegador
  -> Laravel public/index.php
      -> routes/web.php
          -> resources/views/stock/app.php
      -> routes/api.php
          -> Controllers
          -> Requests
          -> Services
          -> Models
          -> Banco via migrations
```

## Modulos implementados no backend

- `GET /api/dashboard`
- `apiResource /api/fornecedores`
- `apiResource /api/produtos`
- `GET|POST|GET by id /api/movimentacoes`
- `GET|POST|GET by id /api/notas-fiscais`
- `POST /api/notas-fiscais/{notaFiscal}/cancelar`

## Como rodar

Requisitos:

- PHP 8.3+
- Composer
- MySQL ou SQLite

Passos:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Acesse `http://127.0.0.1:8000`.

## Observacao importante

O ambiente atual desta maquina nao tem `php` nem `composer` instalados, entao a validacao local com `php artisan` nao foi executada aqui. A estrutura foi preparada para instalar as dependencias e rodar assim que essas ferramentas estiverem disponiveis.

## Proximo passo tecnico

A interface ainda usa `localStorage`. O proximo passo e trocar os pontos de persistencia do `legacy-app.js` por chamadas `fetch('/api/...')` e, depois, migrar React/Babel via CDN para Vite.

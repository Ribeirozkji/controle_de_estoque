# Controle de Estoque

Sistema simples de estoque com:

- Frontend em React com Vite.
- Backend proprio em Node/Express.
- Firebase Auth para login.
- Firestore acessado apenas pelo backend com Firebase Admin SDK.
- Comanda digital com interface de cliente e painel administrativo.

## Estrutura

```text
public/
  assets/styles.css
  manifest.json
  sw.js
src/
  main.jsx         Aplicacao React
  services/        Cliente Firebase/Auth + API
backend/
  server.js        API propria segura
  set-role.js      Script para aplicar roles
docs/
  architecture.md  Explicacao do fluxo simples
  firebase-migration.md  Migracao prioritaria para Firebase
  backend-api.md  Backend proprio seguro com Firebase Admin
```

## Como rodar no PC

Instale dependencias:

```bash
npm install
npm run api:install
```

Configure `.env` a partir de `.env.example`.

Rode a API:

```bash
npm run api:dev
```

Em outro terminal, rode o frontend:

```bash
npm run dev
```

Acesse:

```text
http://127.0.0.1:5173
```

## Como abrir no celular na mesma rede

Para testar na rede local, rode o Vite aceitando conexoes externas:

```bash
npm run dev -- --host 0.0.0.0
```

Descubra o IP do PC:

```powershell
ipconfig
```

No celular, conectado ao mesmo Wi-Fi, acesse:

```text
http://IP-DO-SEU-PC:5173
```

Exemplo:

```text
http://192.168.0.10:5173
```

Para publicar o frontend:

```bash
npm run build
npm run firebase:deploy
```

## Endpoints da API

Consulte a API propria em `docs/backend-api.md`.

## Comanda digital

A aba `Cliente` simula a tela mobile usada por QR code.

Para abrir direto uma mesa, use:

```text
http://127.0.0.1:5173/?view=client&mesa=01&token=TOKEN_DA_MESA
```

O cliente pode abrir a comanda, adicionar produtos, informar observacoes por item, acompanhar o status e solicitar a conta.

No painel administrativo, use:

- `Comandas`: mesas/clientes ativos e fechamento da comanda.
- `Pendentes`: itens aguardando preparo, prontos e entregues.
- `Historico`: comandas fechadas e consumo por horario.

## Migracao para Firebase

A primeira etapa da migracao para Firebase ja foi estruturada para as prioridades:

- Produtos
- Comandas digitais
- Estoque/movimentacoes
- Frontend conectado a API propria usando Firebase Auth
- Sem Cloud Functions para manter compatibilidade com o plano gratuito
- Backend proprio Node/Express para operacoes sensiveis
- Firestore fechado para acesso direto pelo navegador
- Login por Firebase Auth com roles no backend

Arquivos principais:

```text
firebase.json
firestore.rules
firestore.indexes.json
src/main.jsx
src/services/firebaseClient.js
backend/server.js
scripts/migrate-storage-to-firestore.js
docs/backend-api.md
```

Leia o passo a passo em:

```text
docs/backend-api.md
```

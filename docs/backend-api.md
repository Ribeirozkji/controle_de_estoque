~;/         # Backend proprio

Este projeto agora usa um backend Node/Express proprio para as operacoes sensiveis.

## Arquitetura

```text
PWA no Firebase Hosting
  -> Firebase Auth
  -> Backend Node/Express com Bearer token
  -> Firebase Admin SDK
  -> Firestore
```

O frontend nao le nem escreve diretamente no Firestore. As regras do Firestore bloqueiam acesso direto:

```text
allow read, write: if false;
```

O backend usa Firebase Admin SDK, valida o ID token do Firebase Auth e executa as regras de negocio.

## Rodar local

Na raiz:

```bash
npm install
npm run api:install
```

Configure uma service account do Firebase:

```text
service-account.json
```

Coloque esse arquivo na raiz do projeto. O backend carrega automaticamente em desenvolvimento. Se preferir usar variavel de ambiente, no PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\user\controle_de_estoque\service-account.json"
npm run api:dev
```

Ou simplesmente:

```powershell
npm run api:dev
```

A API roda em:

```text
http://127.0.0.1:3001
```

No frontend Vite, configure `.env` com:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
```

Use como base:

```text
.env.example
```

## Variaveis

```text
PORT=3001
GOOGLE_APPLICATION_CREDENTIALS=/caminho/service-account.json
ALLOWED_ORIGINS=http://127.0.0.1:8000,https://stockapp-28944.web.app
APP_CHECK_REQUIRED=false
```

## Endpoints

Todos exigem:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

```text
GET  /api/dashboard
GET  /api/suppliers
POST /api/suppliers
GET  /api/products
POST /api/products
GET  /api/movements
POST /api/movements
GET  /api/tables
POST /api/tables
GET  /api/commands
GET  /api/commands?id=COMMAND_ID
POST /api/commands
POST /api/commands?action=add-item
POST /api/commands?action=remove-item
POST /api/commands?action=request-bill
POST /api/commands?action=close
POST /api/commands?action=mark-ready
POST /api/commands?action=mark-delivered
```

## Permissoes

O backend usa custom claims no Firebase Auth:

```text
admin
staff
kitchen
```

Por enquanto:

- Cliente autenticado pode abrir comanda, adicionar/remover item e solicitar conta.
- `admin` ou `staff` pode cadastrar produto, fornecedor, movimentar estoque e fechar comanda.
- `admin`, `staff` ou `kitchen` pode marcar item como pronto/entregue.

## QR code por mesa

Cadastre uma mesa pela API:

```http
POST /api/tables
```

Corpo:

```json
{
  "number": "01"
}
```

A resposta inclui um `token`. O link do QR code deve usar:

```text
https://stockapp-28944.web.app/?view=client&mesa=01&token=TOKEN_DA_MESA
```

Se uma mesa estiver cadastrada, a API exige token correto para abrir comanda nela.

Para aplicar uma role:

```bash
cd backend
npm run set-role -- UID_DO_USUARIO admin
```

Depois o usuario precisa sair e entrar de novo para receber o token atualizado.

## Testes

```bash
npm run api:test
```

## Deploy

O PWA continua no Firebase Hosting:

```bash
npm run firebase:deploy
```

O backend deve ser hospedado separadamente, por exemplo:

- Render
- Railway
- VPS
- Hostinger com Node
- Fly.io
- Cloud Run

Depois de hospedar, atualize:

```text
VITE_API_BASE_URL=https://sua-api.com
```

E configure `ALLOWED_ORIGINS` no backend com a URL do seu app.

## App Check

O frontend ja tem suporte opcional a App Check:

```text
VITE_FIREBASE_APPCHECK_SITE_KEY=
```

Quando voce criar uma chave reCAPTCHA v3/App Check no Firebase Console, preencha esse valor e configure no backend:

```text
APP_CHECK_REQUIRED=true
```

Com isso, a API passa a exigir o header:

```text
X-Firebase-AppCheck
```

## Protecoes implementadas

- Firestore bloqueado para acesso direto do navegador.
- API valida ID token do Firebase Auth.
- CORS limitado por `ALLOWED_ORIGINS`.
- Rate limit em memoria por IP.
- Headers basicos de seguranca.
- Transacoes para estoque/comanda.
- Roles para operacoes administrativas.

## Ainda recomendado para venda

- Hospedar a API em ambiente com HTTPS.
- Usar banco Firestore em modo producao.
- Ativar App Check.
- Criar tela dedicada de login/admin.
- Criar logs/auditoria de acoes criticas.
- Adicionar testes automatizados da API.
- Usar rate limit persistente em Redis se escalar para muitos usuarios/instancias.

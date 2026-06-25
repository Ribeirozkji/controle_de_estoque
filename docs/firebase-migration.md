# Migracao prioritaria para Firebase

Esta etapa migra primeiro o que mais ganha velocidade no Firebase:

- Produtos
- Estoque/movimentacoes
- Comandas digitais

O PHP ainda fica no projeto durante a transicao. A ideia e validar Firebase em paralelo antes de remover `api/` e `data/storage.json`.

## Nova estrutura

```text
firebase.json
firestore.rules
firestore.indexes.json
package.json
functions/
  index.js
  package.json
scripts/
  migrate-storage-to-firestore.js
```

## Colecoes Firestore

```text
products/{productId}
suppliers/{supplierId}
stockMovements/{movementId}
commands/{commandId}
commands/{commandId}/items/{itemId}
tables/{tableId}
users/{userId}
```

## Modo atual sem Cloud Functions

Este projeto foi ajustado para funcionar sem Cloud Functions, porque Functions normalmente exige plano Blaze.

Agora o frontend grava direto no Firestore usando:

- `addDoc`
- `updateDoc`
- `runTransaction`
- `serverTimestamp`
- `increment`

As transacoes client-side cuidam de:

- adicionar item na comanda
- baixar estoque
- remover item da comanda
- devolver estoque
- registrar movimentacao
- atualizar total da comanda

Importante: isso e bom para MVP e plano gratuito, mas e menos seguro que Cloud Functions.

## Instalar ferramentas

Na raiz do projeto:

```bash
npm install
cd functions
npm install
cd ..
```

Depois faca login:

```bash
npx firebase login
```

Associe o projeto local ao projeto Firebase:

```bash
npx firebase use --add
```

## Rodar local com emuladores

```bash
npm run firebase:emulators
```

Em geral, a interface dos emuladores abre em:

```text
http://127.0.0.1:4000
```

## Migrar dados atuais do JSON

Baixe uma chave de service account no Firebase Console e coloque na raiz com o nome:

```text
service-account.json
```

Esse arquivo ja esta no `.gitignore`.

Depois rode:

```bash
npm run migrate:firestore
```

O script le:

```text
data/storage.json
```

E cria documentos no Firestore.

## Publicar regras e Hosting

```bash
npm run firebase:deploy:rules
```

Para publicar Hosting + regras + indices:

```bash
npm run firebase:deploy
```

## Proxima etapa

O frontend ja tem conexao com Firebase:

```text
public/assets/firebase-config.js
public/assets/firebase-client.js
public/assets/app.jsx
```

Quando `public/assets/firebase-config.js` estiver preenchido, o app usa Firebase. Quando estiver vazio, ele continua usando PHP como fallback.

Preencha:

```js
window.FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

Para usar emuladores locais, altere:

```js
window.FIREBASE_USE_EMULATORS = true;
```

O frontend agora usa:

- `onSnapshot` para produtos, fornecedores, movimentacoes e comandas.
- gravacoes diretas no Firestore para cadastro, estoque e comandas.
- Login anonimo automatico para permitir fluxo de cliente/mesa.

Antes, o app usava:

```js
fetch("/api/index.php?resource=...")
```

Agora, quando Firebase esta configurado, o adaptador usa:

- `onSnapshot` para leituras em tempo real.
- `runTransaction` para operacoes que envolvem estoque e comanda.

## Limitacoes da segunda etapa

- Ainda nao existe tela de login para admin/equipe/cozinha.
- Como o app usa login anonimo, qualquer visitante autenticado anonimamente pode tentar gravar dados.
- As regras estao abertas para `signedIn()` para manter o MVP no plano gratuito.
- Para producao, o ideal e voltar operacoes sensiveis para Cloud Functions ou criar login/perfis com regras mais fechadas.
- O React, ReactDOM, Babel e Firebase SDK ainda carregam por CDN.
- Para PWA offline completo, o ideal e migrar o frontend para Vite e empacotar dependencias.
- As leituras em tempo real estao no adaptador, mas ainda nao ha telas separadas por perfil.

## Observacoes de seguranca

- As regras bloqueiam escrita direta em `products`, `commands`, `items` e `stockMovements`.
- Escritas sensiveis passam por Cloud Functions.
- Cliente precisa estar autenticado para criar/usar comanda.
- Admin/cozinha precisa de custom claim `role` com `admin`, `staff` ou `kitchen`.
- Para velocidade no MVP, use login anonimo para cliente e email/senha para equipe.

# 📦 Controle de Estoque

Sistema web de gestão de estoque desenvolvido como **PWA (Progressive Web App)**, funcionando direto no navegador sem necessidade de instalação. Ideal para pequenos e médios negócios.

---

## 🚀 Funcionalidades

| Módulo | O que faz |
|---|---|
| **Dashboard** | Visão geral com KPIs: valor em estoque, total de produtos, alertas e fornecedores |
| **Fornecedores** | Cadastro completo com CNPJ, contato, endereço e histórico de compras |
| **Produtos** | CRUD com SKU, categoria, preços, estoque mínimo/máximo, localização e validade |
| **Movimentações** | Registro de entradas e saídas com motivo, data e observação |
| **Notas Fiscais** | Emissão e cancelamento de NF-e (mock local com estrutura real da API Focus NFe) |
| **Relatórios** | Análises de giro de estoque, valor por categoria e histórico de preços |
| **Alertas** | Lista automática de produtos zerados ou abaixo do estoque mínimo |
| **Autenticação** | Login e cadastro com hash de senha via PBKDF2 (Web Crypto API) |
| **PWA** | Instalável na tela inicial do celular, com Service Worker para cache offline |

---

## 🗂️ Estrutura de Arquivos

```
projeto/
├── index.html      # HTML principal — monta a aplicação React
├── style.css       # Referência dos estilos (ver nota abaixo)
├── app.js          # Referência do código JavaScript/JSX (ver nota abaixo)
├── db.php          # Conexão com MySQL via PDO + SQL das tabelas
├── manifest.json   # Configuração do PWA (nome, ícone, cores)
├── sw.js           # Service Worker (cache offline)
├── icon-192.png    # Ícone do app (192x192)
└── README.md       # Este arquivo
```

> **⚠️ Importante sobre CSS e JS:**
> O Babel Standalone (usado para processar JSX no navegador) **não suporta** carregar arquivos externos com `src=""` em tags `type="text/babel"`. Por isso, o CSS e o JS ficam **inline dentro do `index.html`**. Os arquivos `style.css` e `app.js` são cópias de referência para leitura e edição — após editar, cole o conteúdo de volta no `index.html`. Para separação real dos arquivos, veja a seção [Migração para Bundler](#-migração-para-bundler).

---

## 🛠️ Como Rodar

### Opção 1 — Sem servidor (só HTML)
Abra o `index.html` direto no navegador. Os dados ficam salvos no `localStorage` do dispositivo.

> O Service Worker e o PWA só funcionam com HTTPS ou `localhost`.

### Opção 2 — Com servidor local simples
```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```
Acesse `http://localhost:8080`.

### Opção 3 — Com PHP + MySQL
Para usar o banco de dados MySQL, você precisará de um servidor PHP (Apache/Nginx + PHP 8+):

1. Coloque os arquivos na pasta pública do servidor (ex: `/var/www/html/estoque/`)
2. Configure as credenciais no `db.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'estoque_db');
   define('DB_USER', 'seu_usuario');
   define('DB_PASS', 'sua_senha');
   ```
3. Execute o SQL contido no `db.php` para criar as tabelas
4. Inclua o `db.php` nos scripts PHP que precisam do banco:
   ```php
   require_once 'db.php';
   // $pdo já está disponível
   ```

---

## 🗄️ Banco de Dados

O arquivo `db.php` usa **PDO** para conectar ao MySQL. As tabelas necessárias estão documentadas como SQL comentado dentro do próprio arquivo:

| Tabela | Descrição |
|---|---|
| `usuarios` | Contas de acesso com senha hasheada |
| `fornecedores` | Dados completos dos fornecedores |
| `produtos` | Cadastro de produtos com estoque e preços |
| `movimentacoes` | Histórico de entradas e saídas |
| `historico_precos` | Variação do preço de custo ao longo do tempo |
| `notas_fiscais` | Cabeçalho das NF-e emitidas |
| `nf_itens` | Itens de cada nota fiscal |

---

## 🔐 Autenticação

O sistema usa autenticação local com:
- **PBKDF2** (Web Crypto API nativa do navegador) para hash seguro das senhas
- **Salt aleatório** por usuário (evita ataques de rainbow table)
- **Token de sessão** com expiração de 7 dias
- Dados de sessão salvos no `localStorage`

> Em produção com PHP, migre a autenticação para o servidor usando `password_hash()` / `password_verify()` do PHP e sessões server-side.

---

## 📱 PWA — Instalação no Celular

O app pode ser instalado na tela inicial do smartphone:

**Android (Chrome):** Acesse pelo navegador → menu (⋮) → *Adicionar à tela inicial*

**iOS (Safari):** Acesse pelo Safari → botão de compartilhar → *Adicionar à Tela de Início*

Para o PWA funcionar corretamente você precisa dos arquivos:
- `manifest.json` com `name`, `short_name`, `start_url`, `display: standalone` e `icons`
- `sw.js` registrado via `navigator.serviceWorker.register()`
- Servido via **HTTPS** (ou `localhost` para desenvolvimento)

---

## 📦 Tecnologias Utilizadas

| Tecnologia | Versão | Função |
|---|---|---|
| React | 18.2.0 | Interface e gerenciamento de estado |
| ReactDOM | 18.2.0 | Renderização no DOM |
| Babel Standalone | 7.23.2 | Transpila JSX no navegador |
| Web Crypto API | nativa | Hash de senhas (PBKDF2) |
| localStorage | nativa | Persistência dos dados no dispositivo |
| Service Worker | nativa | Cache offline (PWA) |
| PHP 8+ / PDO | — | Conexão com MySQL (backend opcional) |
| MySQL | — | Banco de dados relacional (opcional) |

Sem frameworks CSS — todos os estilos são escritos como objetos JavaScript inline (padrão React).

---

## 🔄 Migração para Bundler

Para ter CSS e JS verdadeiramente separados (e melhor performance em produção), migre para o **Vite**:

```bash
npm create vite@latest estoque -- --template react
cd estoque
npm install
```

Mova o conteúdo de `app.js` para `src/App.jsx` e o de `style.css` para `src/index.css`. O Babel será substituído pelo transpilador nativo do Vite, permitindo `import` de arquivos externos normalmente.

---

## 📋 Dados e Privacidade

Todos os dados são armazenados **localmente no dispositivo** via `localStorage`. Nenhuma informação é enviada para servidores externos. Ao limpar os dados do navegador, os registros serão apagados.

---

## 📄 Licença

Projeto de uso livre para fins pessoais e comerciais.

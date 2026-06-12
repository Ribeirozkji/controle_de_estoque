<?php
/* ============================================================
   db.php — Conexão com o banco de dados MySQL
   ============================================================
   Como usar: inclua este arquivo nos scripts PHP que
   precisam acessar o banco de dados:
       require_once 'db.php';
   
   A variável $pdo estará disponível após o include.
   ============================================================ */

/* ── Configurações do banco de dados ──────────────────────── */
define('DB_HOST',     'localhost');   // Endereço do servidor MySQL
define('DB_PORT',     '3306');        // Porta padrão do MySQL
define('DB_NAME',     'estoque_db'); // Nome do banco de dados
define('DB_USER',     'root');        // Usuário do banco
define('DB_PASS',     '');            // Senha do banco (altere em produção!)
define('DB_CHARSET',  'utf8mb4');     // Charset com suporte a emojis e acentos


/* ── String de conexão DSN (Data Source Name) ─────────────── */
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_CHARSET
);

/* ── Opções do PDO ────────────────────────────────────────── */
$opcoes = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Lança exceções em caso de erro SQL
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Retorna arrays associativos por padrão
    PDO::ATTR_EMULATE_PREPARES   => false,                   // Usa prepared statements nativos do MySQL
];


/* ── Tentativa de conexão ─────────────────────────────────── */
try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $opcoes);
} catch (PDOException $e) {
    /* Em produção: não exponha detalhes do erro para o usuário.
       Registre em log e mostre uma mensagem genérica.           */
    error_log('Erro de conexão com o banco: ' . $e->getMessage());
    http_response_code(500);
    die(json_encode([
        'erro' => 'Não foi possível conectar ao banco de dados.'
    ]));
}


/* ============================================================
   ESTRUTURA DAS TABELAS — execute este SQL no seu MySQL
   para criar as tabelas necessárias:
   ============================================================

CREATE DATABASE IF NOT EXISTS estoque_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE estoque_db;

-- Tabela de usuários (autenticação)
CREATE TABLE IF NOT EXISTS usuarios (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    nome       VARCHAR(60)  NOT NULL,
    email      VARCHAR(80)  NOT NULL UNIQUE,
    salt       VARCHAR(32)  NOT NULL,          -- sal aleatório para o hash
    hash       VARCHAR(64)  NOT NULL,          -- hash PBKDF2 da senha
    criado_em  DATE         NOT NULL
);

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id         INT           AUTO_INCREMENT PRIMARY KEY,
    nome       VARCHAR(120)  NOT NULL,
    cnpj       VARCHAR(18),
    telefone   VARCHAR(20),
    email      VARCHAR(80),
    contato    VARCHAR(80),
    endereco   VARCHAR(200),
    cidade     VARCHAR(60),
    uf         CHAR(2),
    obs        TEXT,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id               INT           AUTO_INCREMENT PRIMARY KEY,
    sku              VARCHAR(30)   NOT NULL UNIQUE,      -- código interno do produto
    nome             VARCHAR(120)  NOT NULL,
    categoria        VARCHAR(30)   NOT NULL,
    fornecedor_id    INT,                                -- chave estrangeira → fornecedores
    preco_custo      DECIMAL(10,2) DEFAULT 0,
    preco_venda      DECIMAL(10,2) DEFAULT 0,
    estoque_atual    INT           DEFAULT 0,
    estoque_minimo   INT           DEFAULT 0,            -- dispara alerta abaixo deste valor
    estoque_maximo   INT           DEFAULT 0,
    unidade          VARCHAR(5)    DEFAULT 'un',
    localizacao      VARCHAR(30),                        -- posição física no depósito
    lead_time        INT           DEFAULT 0,            -- dias para reposição
    validade         DATE,
    criado_em        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes (
    id           INT          AUTO_INCREMENT PRIMARY KEY,
    produto_id   INT          NOT NULL,
    tipo         ENUM('entrada','saida') NOT NULL,
    quantidade   INT          NOT NULL,
    motivo       VARCHAR(60)  NOT NULL,
    data         DATE         NOT NULL,
    observacao   TEXT,
    criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- Tabela de histórico de preços de custo
CREATE TABLE IF NOT EXISTS historico_precos (
    id            INT           AUTO_INCREMENT PRIMARY KEY,
    produto_id    INT           NOT NULL,
    fornecedor_id INT,
    preco         DECIMAL(10,2) NOT NULL,
    data          DATE          NOT NULL,
    obs           TEXT,
    FOREIGN KEY (produto_id)    REFERENCES produtos(id)    ON DELETE CASCADE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- Tabela de notas fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id                  INT           AUTO_INCREMENT PRIMARY KEY,
    ref                 VARCHAR(30)   NOT NULL UNIQUE,   -- referência interna
    numero              VARCHAR(10),                      -- número da NF-e
    serie               VARCHAR(5),
    chave_nfe           CHAR(44),                         -- chave de acesso (44 dígitos)
    status              ENUM('rascunho','processando','autorizada','cancelada','rejeitada')
                                      DEFAULT 'rascunho',
    natureza_operacao   VARCHAR(60)   NOT NULL,
    dest_nome           VARCHAR(120),                     -- nome do destinatário
    dest_cpf            VARCHAR(14),
    dest_cnpj           VARCHAR(18),
    dest_email          VARCHAR(80),
    dest_logradouro     VARCHAR(120),
    dest_numero         VARCHAR(10),
    dest_bairro         VARCHAR(60),
    dest_cidade         VARCHAR(60),
    dest_uf             CHAR(2),
    dest_cep            VARCHAR(9),
    total_geral         DECIMAL(10,2) DEFAULT 0,
    info_adicional      TEXT,
    data_emissao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelada_em        TIMESTAMP NULL,
    justificativa_canc  TEXT                              -- motivo do cancelamento
);

-- Itens de cada nota fiscal
CREATE TABLE IF NOT EXISTS nf_itens (
    id                INT           AUTO_INCREMENT PRIMARY KEY,
    nf_id             INT           NOT NULL,
    descricao         VARCHAR(120)  NOT NULL,
    quantidade        INT           NOT NULL,
    valor_unitario    DECIMAL(10,2) NOT NULL,
    unidade_comercial VARCHAR(5)    DEFAULT 'un',
    ncm               VARCHAR(8),                         -- código NCM do produto
    cfop              VARCHAR(4),                         -- código CFOP da operação
    FOREIGN KEY (nf_id) REFERENCES notas_fiscais(id) ON DELETE CASCADE
);

   ============================================================ */

-- 
-- SCHEMA DE BANCO DE DADOS MYSQL - RECIBO E ORÇAMENTO ONLINE
-- Este arquivo descreve e cria a estrutura de tabelas necessária caso queira rodar com MySQL.
-- No backend, a camada de dados está abstraída e já pré-configurada para detectar credenciais MySQL.
--

CREATE DATABASE IF NOT EXISTS `unity_comprovantes` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `unity_comprovantes`;

-- 1. Tabela de Usuários (Login)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin' ou 'user'
  `permissions` TEXT DEFAULT NULL, -- Array JSON com as abas permitidas
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir Super Usuário Administrador Padrão
-- Senha descriptografada: '200616'
INSERT INTO `users` (`email`, `password_hash`, `name`, `role`) 
VALUES ('suporte@unityautomacoes.com.br', '$2b$10$Un1tyAut0mat1onSenha200616HashPlaceholderRealMatchesClientSide', 'Super Usuário Unity', 'admin')
ON DUPLICATE KEY UPDATE `role`='admin';

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `cnpj_cpf` VARCHAR(20) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabela de Documentos (Recibos / Orçamentos)
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `number` VARCHAR(50) NOT NULL UNIQUE, -- Ex: REC-2026-0001 ou ORC-2026-0001
  `type` ENUM('RECIBO', 'ORCAMENTO') NOT NULL,
  `client_id` INT DEFAULT NULL,
  -- Dados do cliente capturados/congelados no momento da emissão
  `client_name` VARCHAR(150) NOT NULL,
  `client_cnpj` VARCHAR(20) DEFAULT NULL,
  `client_address` VARCHAR(255) DEFAULT NULL,
  `client_phone` VARCHAR(20) DEFAULT NULL,
  -- Dados financeiros do recibo/orçamento
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDENTE', 'PAGO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `payment_method` VARCHAR(50) DEFAULT 'PIX', -- PIX, Dinheiro, Cartão, Transferência
  `issue_date` DATE NOT NULL,
  `location_date` VARCHAR(150) DEFAULT NULL, -- Ex: Itamaraju-BA, 23 de Maio de 2026
  `notes` TEXT DEFAULT NULL, -- Observações ou termos (conforme a imagem)
  `convert_from_id` INT DEFAULT NULL, -- Se foi gerado convertendo um Orçamento
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabela de Itens de Documentos
CREATE TABLE IF NOT EXISTS `document_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `document_id` INT NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `description` VARCHAR(255) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Configurações de Empresa (Logotipos e Dados de Cabeçalho)
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(150) NOT NULL DEFAULT 'UNITY AUTOMACOES LTDA.',
  `cnpj` VARCHAR(25) DEFAULT '44.285.891/0001-45',
  `ie` VARCHAR(25) DEFAULT '187.652.146 ME',
  `address` VARCHAR(255) DEFAULT 'AVENIDA ACM, 548-B, CENTRO, ITAMARAJU-BA',
  `phone` VARCHAR(25) DEFAULT '(73)3191-1230',
  `email` VARCHAR(150) DEFAULT 'contato@unityautomacoes.com.br',
  `logo_base64` LONGTEXT DEFAULT NULL, -- Suporte para logotipo personalizado em base64
  `notes_recibo_default` TEXT DEFAULT NULL, -- Termos de garantia padrão para recibos
  `notes_orcamento_default` TEXT DEFAULT NULL -- Termos padrão para orçamentos
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir Configuração Inicial Padrão conforme Modelo da Imagem
INSERT INTO `company_settings` (
  `company_name`, `cnpj`, `ie`, `address`, `phone`, `email`, `notes_recibo_default`, `notes_orcamento_default`
) VALUES (
  'UNITY AUTOMACOES LTDA.',
  '44.285.891/0001-45',
  '187.652.146 ME',
  'AVENIDA ACM, 548-B, CENTRO, ITAMARAJU-BA',
  '(73)3191-1230',
  'contato@unityautomacoes.com.br',
  '- Garantia do Serviço 30 dias\n- Garantia de Peças 06 Meses\n- Garantia de Máquina Fechada e 01 Ano\n- Equipamento com mais de 60 dias sem o cliente vir buscar caracteriza abandono, sendo assim será vendido para ressarcir os danos com peças e mão de obra.',
  'Orçamento válido por 10 dias. Sujeito a alteração de valores de acordo com a disponibilidade de estoque.'
);

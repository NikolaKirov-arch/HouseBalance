-- HouseBalance database schema
-- In phpMyAdmin, first select the database assigned to you, then import this file.
-- Balances are intentionally NOT stored. They are calculated from expense,
-- expense_split, and settlement records by the Express API.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS settlement;
DROP TABLE IF EXISTS expense_split;
DROP TABLE IF EXISTS expense;
DROP TABLE IF EXISTS expense_category;
DROP TABLE IF EXISTS group_invitation;
DROP TABLE IF EXISTS group_member;
DROP TABLE IF EXISTS household_group;
DROP TABLE IF EXISTS user_account;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE user_account (
  id INT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_account_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE household_group (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_member (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  group_id INT NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  member_status ENUM('active', 'removed') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_group_member_user_group (user_id, group_id),
  KEY idx_group_member_user_id (user_id),
  KEY idx_group_member_group_id (group_id),
  CONSTRAINT fk_group_member_user
    FOREIGN KEY (user_id) REFERENCES user_account (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_group_member_group
    FOREIGN KEY (group_id) REFERENCES household_group (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE group_invitation (
  id INT NOT NULL AUTO_INCREMENT,
  group_id INT NOT NULL,
  invited_user_id INT NOT NULL,
  invited_by_member_id INT NOT NULL,
  invitation_code VARCHAR(100) NOT NULL,
  status ENUM('pending', 'accepted', 'expired', 'revoked') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_group_invitation_code (invitation_code),
  KEY idx_group_invitation_group_id (group_id),
  KEY idx_group_invitation_invited_user_id (invited_user_id),
  KEY idx_group_invitation_invited_by_member_id (invited_by_member_id),
  CONSTRAINT chk_group_invitation_expiry
    CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT fk_group_invitation_group
    FOREIGN KEY (group_id) REFERENCES household_group (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_group_invitation_user
    FOREIGN KEY (invited_user_id) REFERENCES user_account (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_group_invitation_inviter
    FOREIGN KEY (invited_by_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expense_category (
  id INT NOT NULL AUTO_INCREMENT,
  group_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expense_category_group_name (group_id, name),
  KEY idx_expense_category_group_id (group_id),
  CONSTRAINT fk_expense_category_group
    FOREIGN KEY (group_id) REFERENCES household_group (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expense (
  id INT NOT NULL AUTO_INCREMENT,
  group_id INT NOT NULL,
  payer_member_id INT NOT NULL,
  category_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NULL,
  expense_date DATE NOT NULL,
  split_type ENUM('equal', 'exact', 'percentage') NOT NULL,
  created_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expense_group_id (group_id),
  KEY idx_expense_payer_member_id (payer_member_id),
  KEY idx_expense_category_id (category_id),
  KEY idx_expense_created_by_member_id (created_by_member_id),
  CONSTRAINT chk_expense_amount CHECK (amount > 0),
  CONSTRAINT fk_expense_group
    FOREIGN KEY (group_id) REFERENCES household_group (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_expense_payer
    FOREIGN KEY (payer_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_expense_category
    FOREIGN KEY (category_id) REFERENCES expense_category (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_expense_creator
    FOREIGN KEY (created_by_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expense_split (
  id INT NOT NULL AUTO_INCREMENT,
  expense_id INT NOT NULL,
  member_id INT NOT NULL,
  owed_amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expense_split_expense_member (expense_id, member_id),
  KEY idx_expense_split_expense_id (expense_id),
  KEY idx_expense_split_member_id (member_id),
  CONSTRAINT chk_expense_split_owed_amount CHECK (owed_amount >= 0),
  CONSTRAINT chk_expense_split_percentage
    CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100)),
  CONSTRAINT fk_expense_split_expense
    FOREIGN KEY (expense_id) REFERENCES expense (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_expense_split_member
    FOREIGN KEY (member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settlement (
  id INT NOT NULL AUTO_INCREMENT,
  group_id INT NOT NULL,
  payer_member_id INT NOT NULL,
  receiver_member_id INT NOT NULL,
  created_by_member_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  settlement_date DATE NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_settlement_group_id (group_id),
  KEY idx_settlement_payer_member_id (payer_member_id),
  KEY idx_settlement_receiver_member_id (receiver_member_id),
  KEY idx_settlement_created_by_member_id (created_by_member_id),
  CONSTRAINT chk_settlement_amount CHECK (amount > 0),
  CONSTRAINT chk_settlement_members CHECK (payer_member_id <> receiver_member_id),
  CONSTRAINT fk_settlement_group
    FOREIGN KEY (group_id) REFERENCES household_group (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_settlement_payer
    FOREIGN KEY (payer_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_settlement_receiver
    FOREIGN KEY (receiver_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_settlement_creator
    FOREIGN KEY (created_by_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id INT NOT NULL AUTO_INCREMENT,
  group_id INT NOT NULL,
  actor_member_id INT NOT NULL,
  action_type ENUM(
    'group_created',
    'member_invited',
    'member_joined',
    'expense_created',
    'expense_updated',
    'expense_deleted',
    'settlement_created',
    'category_created',
    'category_deactivated'
  ) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_log_group_id (group_id),
  KEY idx_audit_log_actor_member_id (actor_member_id),
  CONSTRAINT fk_audit_log_group
    FOREIGN KEY (group_id) REFERENCES household_group (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_audit_log_actor
    FOREIGN KEY (actor_member_id) REFERENCES group_member (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


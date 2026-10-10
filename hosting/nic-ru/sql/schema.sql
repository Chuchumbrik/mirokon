-- Mirokon — схема MySQL/MariaDB для виртуального хостинга nic.ru
-- Кодировка: utf8mb4
-- Запуск: mysql -u USER -p DBNAME < schema.sql

SET NAMES utf8mb4;
SET time_zone = '+03:00';

CREATE TABLE IF NOT EXISTS admins (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  name       VARCHAR(190) NOT NULL,
  sort       INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_name (name),
  KEY idx_categories_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS works (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  title           VARCHAR(255)  NOT NULL,
  category        VARCHAR(190)  NULL,
  description     TEXT          NULL,
  image_url       VARCHAR(500)  NULL,
  sort            INT           NOT NULL DEFAULT 0,
  published       TINYINT(1)    NOT NULL DEFAULT 0,
  scope           JSON          NULL,
  system_name     VARCHAR(100)  NULL,
  duration_days   INT           NULL,
  area            VARCHAR(190)  NULL,
  warranty        VARCHAR(100)  NULL,
  price_from      INT           NULL,
  tpl_window_type VARCHAR(100)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_works_pub (published, sort, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_photos (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  work_id      CHAR(36)     NOT NULL,
  url          VARCHAR(500) NOT NULL,
  sort         INT          NOT NULL DEFAULT 0,
  storage_path VARCHAR(500) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_work_photos (work_id, sort),
  CONSTRAINT fk_work_photos_work
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  author_name   VARCHAR(120) NOT NULL,
  author_city   VARCHAR(120) NULL,
  rating        TINYINT      NOT NULL,
  text          TEXT         NOT NULL,
  approved      TINYINT(1)   NOT NULL DEFAULT 0,
  tg_chat_id    VARCHAR(64)  NULL,
  tg_message_id BIGINT       NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reviews_appr (approved, created_at),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  preview_text TEXT         NULL,
  body         TEXT         NULL,
  image_url    VARCHAR(500) NULL,
  published    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_news_pub (published, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(40)  NOT NULL,
  message       TEXT         NULL,
  cart_items    JSON         NULL,
  processed     TINYINT(1)   NOT NULL DEFAULT 0,
  tg_chat_id    VARCHAR(64)  NULL,
  tg_message_id BIGINT       NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leads (processed, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id         INT          NOT NULL PRIMARY KEY,
  data       JSON         NOT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip         VARCHAR(64)     NOT NULL,
  endpoint   VARCHAR(64)     NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rl (endpoint, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

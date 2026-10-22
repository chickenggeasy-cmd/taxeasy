-- ฐานข้อมูลของภาษีง่ายๆ (TaxEasy)
-- วิธีใช้: เปิด phpMyAdmin → แท็บ Import → เลือกไฟล์นี้ → Go แล้วนำเข้า seed.sql ต่อ
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS taxeasy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taxeasy;

-- บัญชีผู้ดูแลระบบ (สร้างบัญชีแรกผ่าน admin/setup.php)
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- กฎภาษีแต่ละปี เก็บทุกฉบับไว้เป็นประวัติ
-- status: draft = ร่าง (แอปยังไม่เห็น), published = ใช้งานอยู่, archived = ฉบับเก่า
CREATE TABLE IF NOT EXISTS rule_sets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tax_year SMALLINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  rules_json LONGTEXT NOT NULL,
  change_note VARCHAR(500) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  UNIQUE KEY uq_year_revision (tax_year, revision),
  KEY idx_status (status, tax_year),
  CONSTRAINT fk_rule_sets_admin FOREIGN KEY (created_by) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- บันทึกการกระทำในหลังบ้าน
CREATE TABLE IF NOT EXISTS audit_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  detail VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_created (created_at),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- นับจำนวนข้อความที่ส่งถึง AI ผู้ช่วย เพื่อจำกัดการใช้งานต่อเครื่อง (เก็บเฉพาะค่าแฮชของ IP)
CREATE TABLE IF NOT EXISTS chat_usage (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_hash CHAR(64) NOT NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_client_time (client_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตลาดหุ้นที่ดึงมาแล้ว เก็บไว้ชั่วคราวเพื่อไม่ให้เรียกผู้ให้บริการบ่อยเกินไป (api/market.php สร้างให้เองถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS market_cache (
  cache_key VARCHAR(40) PRIMARY KEY,
  payload MEDIUMTEXT NOT NULL,
  fetched_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

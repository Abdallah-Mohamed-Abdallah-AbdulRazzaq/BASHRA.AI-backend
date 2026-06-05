USE `bashraai_bashraai`;

-- =========================================================
-- Bashra AI - AI Dermatology Module Migration
-- Independent AI chat/diagnosis system for users
-- =========================================================

-- ---------------------------------------------------------
-- 1) AI usage policies controlled by admin
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_usage_policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_name` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_type` ENUM('global','user','package') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'global',
  `user_id` INT DEFAULT NULL,
  `package_id` INT DEFAULT NULL,

  `max_total_requests_per_month` INT NOT NULL DEFAULT 30,
  `max_chat_messages_per_month` INT NOT NULL DEFAULT 30,
  `max_image_analyses_per_month` INT NOT NULL DEFAULT 10,
  `max_document_analyses_per_month` INT NOT NULL DEFAULT 5,
  `max_files_per_session` INT NOT NULL DEFAULT 5,
  `max_tokens_per_request` INT NOT NULL DEFAULT 4000,

  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `priority` INT NOT NULL DEFAULT 100,

  `created_by_admin_id` INT DEFAULT NULL,
  `updated_by_admin_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_ai_usage_policies_scope` (`scope_type`, `is_active`, `priority`),
  KEY `idx_ai_usage_policies_user` (`user_id`),
  KEY `idx_ai_usage_policies_package` (`package_id`),
  CONSTRAINT `fk_ai_usage_policies_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_usage_policies_package`
    FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_usage_policies_created_admin`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_usage_policies_updated_admin`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 2) AI usage counters per user and period
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_usage_counters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,

  `period_type` ENUM('daily','monthly') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `period_key` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Example: 2026-06 or 2026-06-02',

  `total_requests` INT NOT NULL DEFAULT 0,
  `chat_messages_count` INT NOT NULL DEFAULT 0,
  `image_analyses_count` INT NOT NULL DEFAULT 0,
  `document_analyses_count` INT NOT NULL DEFAULT 0,
  `tokens_used` INT NOT NULL DEFAULT 0,

  `last_request_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_usage_counter_user_period` (`user_id`, `period_type`, `period_key`),
  KEY `idx_ai_usage_counters_user` (`user_id`),
  KEY `idx_ai_usage_counters_period` (`period_type`, `period_key`),
  CONSTRAINT `fk_ai_usage_counters_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 3) AI sessions - separate from normal app chat
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,

  `user_id` INT NOT NULL,

  `title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` ENUM('active','completed','archived','deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',

  `input_mode` ENUM('chat','image','document','mixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'chat',
  `specialty` ENUM('dermatology') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dermatology',
  `language_code` VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ar',

  `patient_consent` TINYINT(1) NOT NULL DEFAULT 0,
  `consent_at` TIMESTAMP NULL DEFAULT NULL,

  `risk_level` ENUM('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'low',

  `ai_provider` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ai_model` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `last_message_at` TIMESTAMP NULL DEFAULT NULL,
  `summary_json` JSON DEFAULT NULL,

  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_sessions_uuid` (`uuid`),
  KEY `idx_ai_sessions_user` (`user_id`),
  KEY `idx_ai_sessions_status` (`status`),
  KEY `idx_ai_sessions_risk` (`risk_level`),
  KEY `idx_ai_sessions_created` (`created_at`),
  CONSTRAINT `fk_ai_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 4) AI session messages
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_session_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,

  `ai_session_id` INT NOT NULL,
  `user_id` INT NOT NULL,

  `sender_type` ENUM('user','ai','system','doctor') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` ENUM('text','image','document','mixed','safety') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',

  `content` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `structured_content` JSON DEFAULT NULL,

  `file_id` INT DEFAULT NULL,

  `prompt_tokens` INT DEFAULT NULL,
  `completion_tokens` INT DEFAULT NULL,
  `total_tokens` INT DEFAULT NULL,

  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_session_messages_uuid` (`uuid`),
  KEY `idx_ai_session_messages_session` (`ai_session_id`),
  KEY `idx_ai_session_messages_user` (`user_id`),
  KEY `idx_ai_session_messages_sender` (`sender_type`),
  KEY `idx_ai_session_messages_file` (`file_id`),
  KEY `idx_ai_session_messages_created` (`created_at`),
  CONSTRAINT `fk_ai_session_messages_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_session_messages_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_session_messages_file`
    FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 5) AI session files
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_session_files` (
  `id` INT NOT NULL AUTO_INCREMENT,

  `ai_session_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `file_id` INT NOT NULL,

  `file_role` ENUM('skin_image','medical_report','lab_report','prescription','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `analysis_status` ENUM('pending','processed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',

  `extracted_text` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,

  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_session_file` (`ai_session_id`, `file_id`),
  KEY `idx_ai_session_files_session` (`ai_session_id`),
  KEY `idx_ai_session_files_user` (`user_id`),
  KEY `idx_ai_session_files_file` (`file_id`),
  KEY `idx_ai_session_files_role` (`file_role`),
  CONSTRAINT `fk_ai_session_files_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_session_files_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_session_files_file`
    FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 6) AI analysis results
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_analysis_results` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,

  `ai_session_id` INT NOT NULL,
  `user_id` INT NOT NULL,

  `result_type` ENUM('chat_response','image_analysis','document_analysis','final_summary') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'chat_response',
  `language_code` VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ar',

  `case_summary` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `possible_conditions` JSON DEFAULT NULL,
  `severity` ENUM('mild','moderate','severe','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mild',
  `red_flags` JSON DEFAULT NULL,
  `safe_advice` JSON DEFAULT NULL,
  `avoid` JSON DEFAULT NULL,

  `recommended_next_step` ENUM('self_care','book_dermatologist','urgent_care','doctor_review') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'book_dermatologist',
  `confidence_level` ENUM('low','medium','high') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'low',
  `needs_doctor_review` TINYINT(1) NOT NULL DEFAULT 1,

  `ai_response_json` JSON DEFAULT NULL,
  `processing_time_ms` INT DEFAULT NULL,

  `doctor_reviewed` TINYINT(1) NOT NULL DEFAULT 0,
  `doctor_agreement` ENUM('agree','partially_agree','disagree','not_reviewed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_reviewed',
  `reviewed_by_doctor_id` INT DEFAULT NULL,
  `doctor_notes` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,

  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_analysis_results_uuid` (`uuid`),
  KEY `idx_ai_analysis_results_session` (`ai_session_id`),
  KEY `idx_ai_analysis_results_user` (`user_id`),
  KEY `idx_ai_analysis_results_type` (`result_type`),
  KEY `idx_ai_analysis_results_severity` (`severity`),
  KEY `idx_ai_analysis_results_review` (`needs_doctor_review`, `doctor_reviewed`),
  KEY `idx_ai_analysis_results_created` (`created_at`),
  CONSTRAINT `fk_ai_analysis_results_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_analysis_results_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_analysis_results_doctor`
    FOREIGN KEY (`reviewed_by_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 7) AI usage events - detailed audit log
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_usage_events` (
  `id` INT NOT NULL AUTO_INCREMENT,

  `user_id` INT NOT NULL,
  `ai_session_id` INT DEFAULT NULL,
  `ai_result_id` INT DEFAULT NULL,

  `event_type` ENUM('chat_message','image_analysis','document_analysis','final_summary') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `counted_units` INT NOT NULL DEFAULT 1,

  `prompt_tokens` INT DEFAULT NULL,
  `completion_tokens` INT DEFAULT NULL,
  `total_tokens` INT DEFAULT NULL,

  `status` ENUM('success','failed','blocked_limit','blocked_safety') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `metadata` JSON DEFAULT NULL,

  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_ai_usage_events_user` (`user_id`),
  KEY `idx_ai_usage_events_session` (`ai_session_id`),
  KEY `idx_ai_usage_events_result` (`ai_result_id`),
  KEY `idx_ai_usage_events_type` (`event_type`),
  KEY `idx_ai_usage_events_created` (`created_at`),
  CONSTRAINT `fk_ai_usage_events_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_usage_events_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_usage_events_result`
    FOREIGN KEY (`ai_result_id`) REFERENCES `ai_analysis_results` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 8) AI provider logs - provider/cost/error tracking
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_provider_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,

  `ai_session_id` INT DEFAULT NULL,
  `user_id` INT DEFAULT NULL,

  `provider` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_type` ENUM('chat','image','document','summary','safety_check') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,

  `prompt_tokens` INT DEFAULT NULL,
  `completion_tokens` INT DEFAULT NULL,
  `total_tokens` INT DEFAULT NULL,
  `latency_ms` INT DEFAULT NULL,

  `status` ENUM('success','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `error_message` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  `request_metadata` JSON DEFAULT NULL,
  `response_metadata` JSON DEFAULT NULL,

  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_ai_provider_logs_session` (`ai_session_id`),
  KEY `idx_ai_provider_logs_user` (`user_id`),
  KEY `idx_ai_provider_logs_provider` (`provider`, `model`),
  KEY `idx_ai_provider_logs_status` (`status`),
  KEY `idx_ai_provider_logs_created` (`created_at`),
  CONSTRAINT `fk_ai_provider_logs_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_provider_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 9) Share AI result with doctor / appointment
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_result_shares` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,

  `ai_session_id` INT NOT NULL,
  `ai_result_id` INT DEFAULT NULL,

  `user_id` INT NOT NULL,
  `doctor_id` INT DEFAULT NULL,
  `appointment_id` INT DEFAULT NULL,

  `share_status` ENUM('active','revoked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `shared_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_result_shares_uuid` (`uuid`),
  KEY `idx_ai_result_shares_session` (`ai_session_id`),
  KEY `idx_ai_result_shares_result` (`ai_result_id`),
  KEY `idx_ai_result_shares_user` (`user_id`),
  KEY `idx_ai_result_shares_doctor` (`doctor_id`),
  KEY `idx_ai_result_shares_appointment` (`appointment_id`),
  CONSTRAINT `fk_ai_result_shares_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_result_shares_result`
    FOREIGN KEY (`ai_result_id`) REFERENCES `ai_analysis_results` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_result_shares_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_result_shares_doctor`
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_result_shares_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 10) UUID triggers
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS `generate_ai_sessions_uuid`;
DELIMITER ;;
CREATE TRIGGER `generate_ai_sessions_uuid`
BEFORE INSERT ON `ai_sessions`
FOR EACH ROW
BEGIN
  IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
    SET NEW.uuid = UUID();
  END IF;
END;;
DELIMITER ;

DROP TRIGGER IF EXISTS `generate_ai_session_messages_uuid`;
DELIMITER ;;
CREATE TRIGGER `generate_ai_session_messages_uuid`
BEFORE INSERT ON `ai_session_messages`
FOR EACH ROW
BEGIN
  IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
    SET NEW.uuid = UUID();
  END IF;
END;;
DELIMITER ;

DROP TRIGGER IF EXISTS `generate_ai_analysis_results_uuid`;
DELIMITER ;;
CREATE TRIGGER `generate_ai_analysis_results_uuid`
BEFORE INSERT ON `ai_analysis_results`
FOR EACH ROW
BEGIN
  IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
    SET NEW.uuid = UUID();
  END IF;
END;;
DELIMITER ;

DROP TRIGGER IF EXISTS `generate_ai_result_shares_uuid`;
DELIMITER ;;
CREATE TRIGGER `generate_ai_result_shares_uuid`
BEFORE INSERT ON `ai_result_shares`
FOR EACH ROW
BEGIN
  IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
    SET NEW.uuid = UUID();
  END IF;
END;;
DELIMITER ;


-- ---------------------------------------------------------
-- 11) Default global usage policy
-- ---------------------------------------------------------
INSERT INTO `ai_usage_policies` (
  `policy_name`,
  `scope_type`,
  `max_total_requests_per_month`,
  `max_chat_messages_per_month`,
  `max_image_analyses_per_month`,
  `max_document_analyses_per_month`,
  `max_files_per_session`,
  `max_tokens_per_request`,
  `is_active`,
  `priority`
)
SELECT
  'Default Free AI Usage',
  'global',
  30,
  30,
  10,
  5,
  5,
  4000,
  1,
  100
WHERE NOT EXISTS (
  SELECT 1
  FROM `ai_usage_policies`
  WHERE `scope_type` = 'global'
    AND `policy_name` = 'Default Free AI Usage'
);
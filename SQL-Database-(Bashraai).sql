CREATE DATABASE IF NOT EXISTS `bashraai_bashraai`;
USE `bashraai_bashraai`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: bashraai_bashraai
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addressable`
--

DROP TABLE IF EXISTS `addressable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addressable` (
  `address_id` int NOT NULL,
  `addressable_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'اسم الجدول: Doctor, User, Admin, Assistant',
  `addressable_id` int NOT NULL COMMENT 'ID السجل في الجدول المرتبط (doctors.id, users.id, etc.)',
  `creator_id` int DEFAULT NULL,
  `creator_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`address_id`,`addressable_type`,`addressable_id`),
  KEY `idx_addressable_entity` (`addressable_type`,`addressable_id`),
  KEY `idx_addressable_creator` (`creator_type`,`creator_id`),
  KEY `idx_addressable_lookup` (`addressable_type`,`addressable_id`),
  CONSTRAINT `addressable_ibfk_1` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('home','work','billing','shipping') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'home',
  `is_primary` tinyint(1) DEFAULT '0',
  `address_line1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `countries_cities_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `countries_cities_id` (`countries_cities_id`),
  KEY `idx_addresses_type` (`type`),
  KEY `idx_addresses_primary` (`is_primary`),
  CONSTRAINT `addresses_ibfk_5` FOREIGN KEY (`countries_cities_id`) REFERENCES `countries_cities` (`countries_cities_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` int DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `severity` enum('low','medium','high','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_logs_admin` (`admin_id`),
  KEY `idx_admin_logs_action` (`action`),
  KEY `idx_admin_logs_target` (`target_type`,`target_id`),
  KEY `idx_admin_logs_severity` (`severity`),
  KEY `idx_admin_logs_created` (`created_at`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_profile_translations`
--

DROP TABLE IF EXISTS `admin_profile_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_profile_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profile_id` (`profile_id`,`language_code`),
  KEY `idx_admin_profile_translations_profile` (`profile_id`),
  KEY `idx_admin_profile_translations_lang` (`language_code`),
  KEY `idx_admin_profile_translations_full_name` (`full_name`),
  CONSTRAINT `admin_profile_translations_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `admin_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_profiles`
--

DROP TABLE IF EXISTS `admin_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `language_preference` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `hire_date` date DEFAULT NULL,
  `employment_status` enum('active','inactive','terminated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `permissions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_id` (`admin_id`),
  KEY `idx_admin_profiles_admin` (`admin_id`),
  KEY `idx_admin_profiles_status` (`employment_status`),
  CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_type` enum('super_admin','system_admin','clinic_admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'clinic_admin',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive','suspended','pending_verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_verification',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `login_attempts` int DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `email_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_otp_expiry` timestamp NULL DEFAULT NULL,
  `phone_otp_expiry` timestamp NULL DEFAULT NULL,
  `is_email_otp` tinyint(1) DEFAULT '0',
  `is_phone_otp` tinyint(1) DEFAULT '0',
  `is_id_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_admins_email` (`email`),
  KEY `idx_admins_phone` (`phone`),
  KEY `idx_admins_uuid` (`uuid`),
  KEY `idx_admins_status` (`status`),
  KEY `idx_admins_admin_type` (`admin_type`),
  KEY `idx_admins_last_activity` (`last_activity_at`),
  KEY `idx_admins_email_otp` (`email_otp`),
  KEY `idx_admins_phone_otp` (`phone_otp`),
  KEY `idx_admins_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_admin_uuid` BEFORE INSERT ON `admins` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ai_diagnosis`
--

DROP TABLE IF EXISTS `ai_diagnosis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_diagnosis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `medical_record_id` int DEFAULT NULL,
  `patient_id` int NOT NULL,
  `image_file_id` int DEFAULT NULL,
  `ai_model_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confidence_score` decimal(5,4) DEFAULT NULL,
  `secondary_diagnoses` json DEFAULT NULL,
  `severity_assessment` enum('mild','moderate','severe','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'mild',
  `recommended_actions` json DEFAULT NULL,
  `risk_factors` json DEFAULT NULL,
  `api_response` json DEFAULT NULL,
  `processing_time_ms` int DEFAULT NULL,
  `doctor_reviewed` tinyint(1) DEFAULT '0',
  `doctor_agreement` enum('agree','partially_agree','disagree','not_reviewed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'not_reviewed',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_ai_diagnosis_uuid` (`uuid`),
  KEY `idx_ai_diagnosis_record` (`medical_record_id`),
  KEY `idx_ai_diagnosis_patient` (`patient_id`),
  KEY `idx_ai_diagnosis_confidence` (`confidence_score`),
  KEY `idx_ai_diagnosis_reviewed` (`doctor_reviewed`),
  KEY `idx_ai_diagnosis_created` (`created_at`),
  CONSTRAINT `ai_diagnosis_ibfk_1` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_diagnosis_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_diagnosis_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_ai_diagnosis_uuid` BEFORE INSERT ON `ai_diagnosis` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ai_diagnosis_translations`
--

DROP TABLE IF EXISTS `ai_diagnosis_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_diagnosis_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ai_diagnosis_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `primary_diagnosis` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doctor_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_diagnosis_id` (`ai_diagnosis_id`,`language_code`),
  KEY `idx_ai_diagnosis_translations_diagnosis` (`ai_diagnosis_id`),
  KEY `idx_ai_diagnosis_translations_lang` (`language_code`),
  KEY `idx_translations_composite_ai_diagnosis` (`ai_diagnosis_id`,`language_code`),
  CONSTRAINT `ai_diagnosis_translations_ibfk_1` FOREIGN KEY (`ai_diagnosis_id`) REFERENCES `ai_diagnosis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `appointment_summary`
--

DROP TABLE IF EXISTS `appointment_summary`;
/*!50001 DROP VIEW IF EXISTS `appointment_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `appointment_summary` AS SELECT 
 1 AS `id`,
 1 AS `uuid`,
 1 AS `scheduled_date`,
 1 AS `actual_start_time`,
 1 AS `status`,
 1 AS `appointment_type`,
 1 AS `patient_full_name`,
 1 AS `patient_email`,
 1 AS `patient_language`,
 1 AS `doctor_full_name`,
 1 AS `doctor_email`,
 1 AS `doctor_language`,
 1 AS `doctor_specialty`,
 1 AS `chief_complaint`,
 1 AS `symptoms_description`,
 1 AS `consultation_fee`,
 1 AS `currency_code`,
 1 AS `payment_status`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `appointment_translations`
--

DROP TABLE IF EXISTS `appointment_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appointment_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `chief_complaint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `symptoms_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancellation_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_id` (`appointment_id`,`language_code`),
  KEY `idx_appointment_translations_appointment` (`appointment_id`),
  KEY `idx_appointment_translations_lang` (`language_code`),
  KEY `idx_translations_composite_appointment` (`appointment_id`,`language_code`),
  CONSTRAINT `appointment_translations_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `clinic_id` int DEFAULT NULL,
  `schedule_id` int DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `created_by_admin_id` int DEFAULT NULL,
  `created_by_assistant_id` int DEFAULT NULL,
  `appointment_type` enum('consultation','follow_up','urgent','routine') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'consultation',
  `scheduled_date` date NOT NULL,
  `actual_start_time` time NOT NULL,
  `duration_minutes` int DEFAULT '30',
  `status` enum('pending','confirmed','in_progress','completed','cancelled','no_show','rescheduled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `cancelled_by_user_id` int DEFAULT NULL,
  `cancelled_by_admin_id` int DEFAULT NULL,
  `cancelled_by_doctor_id` int DEFAULT NULL,
  `cancelled_by_assistant_id` int DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `urgency_level` enum('low','medium','high','emergency') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `consultation_fee` decimal(10,2) DEFAULT NULL,
  `currency_code` char(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` enum('pending','paid','refunded','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `reminder_sent` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `created_by_admin_id` (`created_by_admin_id`),
  KEY `created_by_assistant_id` (`created_by_assistant_id`),
  KEY `cancelled_by_user_id` (`cancelled_by_user_id`),
  KEY `cancelled_by_admin_id` (`cancelled_by_admin_id`),
  KEY `cancelled_by_doctor_id` (`cancelled_by_doctor_id`),
  KEY `cancelled_by_assistant_id` (`cancelled_by_assistant_id`),
  KEY `idx_appointments_uuid` (`uuid`),
  KEY `idx_appointments_patient` (`patient_id`),
  KEY `idx_appointments_doctor` (`doctor_id`),
  KEY `idx_appointments_date` (`scheduled_date`),
  KEY `idx_appointments_status` (`status`),
  KEY `idx_appointments_datetime` (`scheduled_date`,`actual_start_time`),
  KEY `idx_appointments_urgency` (`urgency_level`),
  KEY `idx_appointments_doctor_date_status` (`doctor_id`,`scheduled_date`,`status`),
  KEY `idx_appointments_patient_status` (`patient_id`,`status`),
  KEY `idx_appointments_clinic` (`clinic_id`),
  KEY `idx_appointments_schedule_id` (`schedule_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_4` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_5` FOREIGN KEY (`created_by_assistant_id`) REFERENCES `assistants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_6` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_7` FOREIGN KEY (`cancelled_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_8` FOREIGN KEY (`cancelled_by_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_ibfk_9` FOREIGN KEY (`cancelled_by_assistant_id`) REFERENCES `assistants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appointments_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appointments_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `doctor_schedules` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_appointment_uuid` BEFORE INSERT ON `appointments` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `increment_doctor_consultations` AFTER UPDATE ON `appointments` FOR EACH ROW BEGIN
IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
UPDATE doctor_profiles 
SET total_consultations = total_consultations + 1
WHERE doctor_id = NEW.doctor_id;
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `assistant_profile_translations`
--

DROP TABLE IF EXISTS `assistant_profile_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assistant_profile_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assistant_profile_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assistant_profile_id` (`assistant_profile_id`,`language_code`),
  KEY `idx_assistant_profile_translations_profile` (`assistant_profile_id`),
  KEY `idx_assistant_profile_translations_lang` (`language_code`),
  KEY `idx_assistant_profile_translations_full_name` (`full_name`),
  CONSTRAINT `assistant_profile_translations_ibfk_1` FOREIGN KEY (`assistant_profile_id`) REFERENCES `assistant_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assistant_profiles`
--

DROP TABLE IF EXISTS `assistant_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assistant_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assistant_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `permissions` json DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `employment_status` enum('active','inactive','terminated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `language_preference` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assistant_id` (`assistant_id`),
  KEY `idx_assistant_profiles_assistant` (`assistant_id`),
  KEY `idx_assistant_profiles_doctor` (`doctor_id`),
  KEY `idx_assistant_profiles_status` (`employment_status`),
  CONSTRAINT `assistant_profiles_ibfk_1` FOREIGN KEY (`assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assistant_profiles_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assistants`
--

DROP TABLE IF EXISTS `assistants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assistants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive','suspended','pending_verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_verification',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `login_attempts` int DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `email_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_otp_expiry` timestamp NULL DEFAULT NULL,
  `phone_otp_expiry` timestamp NULL DEFAULT NULL,
  `is_email_otp` tinyint(1) DEFAULT '0',
  `is_phone_otp` tinyint(1) DEFAULT '0',
  `is_id_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_assistants_email` (`email`),
  KEY `idx_assistants_phone` (`phone`),
  KEY `idx_assistants_uuid` (`uuid`),
  KEY `idx_assistants_status` (`status`),
  KEY `idx_assistants_last_activity` (`last_activity_at`),
  KEY `idx_assistants_email_otp` (`email_otp`),
  KEY `idx_assistants_phone_otp` (`phone_otp`),
  KEY `idx_assistants_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_assistant_uuid` BEFORE INSERT ON `assistants` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `auth_tokens`
--

DROP TABLE IF EXISTS `auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `assistant_id` int DEFAULT NULL,
  `token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` enum('refresh','access','reset','verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'refresh',
  `expires_at` timestamp NOT NULL,
  `is_revoked` tinyint(1) DEFAULT '0',
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_by_admin_id` int DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `revoked_by_admin_id` (`revoked_by_admin_id`),
  KEY `idx_auth_tokens_user` (`user_id`),
  KEY `idx_auth_tokens_admin` (`admin_id`),
  KEY `idx_auth_tokens_doctor` (`doctor_id`),
  KEY `idx_auth_tokens_assistant` (`assistant_id`),
  KEY `idx_auth_tokens_hash` (`token_hash`),
  KEY `idx_auth_tokens_type` (`token_type`),
  KEY `idx_auth_tokens_expires` (`expires_at`),
  KEY `idx_auth_tokens_revoked` (`is_revoked`),
  CONSTRAINT `auth_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auth_tokens_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auth_tokens_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auth_tokens_ibfk_4` FOREIGN KEY (`assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auth_tokens_ibfk_5` FOREIGN KEY (`revoked_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `auth_tokens_chk_1` CHECK ((((`user_id` is not null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is not null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is not null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blocked_entities`
--

DROP TABLE IF EXISTS `blocked_entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_entities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blocked_user_id` int DEFAULT NULL,
  `blocked_admin_id` int DEFAULT NULL,
  `blocked_doctor_id` int DEFAULT NULL,
  `blocked_assistant_id` int DEFAULT NULL,
  `blocked_by_admin_id` int NOT NULL,
  `block_type` enum('temporary','permanent','warning') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'temporary',
  `blocked_until` timestamp NULL DEFAULT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `removed_at` timestamp NULL DEFAULT NULL,
  `removed_by_admin_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `removed_by_admin_id` (`removed_by_admin_id`),
  KEY `idx_blocked_entities_user` (`blocked_user_id`),
  KEY `idx_blocked_entities_admin` (`blocked_admin_id`),
  KEY `idx_blocked_entities_doctor` (`blocked_doctor_id`),
  KEY `idx_blocked_entities_assistant` (`blocked_assistant_id`),
  KEY `idx_blocked_entities_blocked_by` (`blocked_by_admin_id`),
  KEY `idx_blocked_entities_active` (`is_active`),
  KEY `idx_blocked_entities_until` (`blocked_until`),
  CONSTRAINT `blocked_entities_ibfk_1` FOREIGN KEY (`blocked_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blocked_entities_ibfk_2` FOREIGN KEY (`blocked_admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blocked_entities_ibfk_3` FOREIGN KEY (`blocked_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blocked_entities_ibfk_4` FOREIGN KEY (`blocked_assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blocked_entities_ibfk_5` FOREIGN KEY (`blocked_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blocked_entities_ibfk_6` FOREIGN KEY (`removed_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `blocked_entities_chk_1` CHECK ((((`blocked_user_id` is not null) and (`blocked_admin_id` is null) and (`blocked_doctor_id` is null) and (`blocked_assistant_id` is null)) or ((`blocked_user_id` is null) and (`blocked_admin_id` is not null) and (`blocked_doctor_id` is null) and (`blocked_assistant_id` is null)) or ((`blocked_user_id` is null) and (`blocked_admin_id` is null) and (`blocked_doctor_id` is not null) and (`blocked_assistant_id` is null)) or ((`blocked_user_id` is null) and (`blocked_admin_id` is null) and (`blocked_doctor_id` is null) and (`blocked_assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clinic_images`
--

DROP TABLE IF EXISTS `clinic_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clinic_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clinic_id` int NOT NULL,
  `image_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_main` tinyint(1) DEFAULT '0' COMMENT '1 for main cover image, 0 for gallery',
  `sort_order` int DEFAULT '0' COMMENT 'To arrange images order',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clinic_images_clinic_id` (`clinic_id`),
  CONSTRAINT `fk_clinic_images_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clinics`
--

DROP TABLE IF EXISTS `clinics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clinics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_line_1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `region_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_main_branch` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive','under_maintenance') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clinics_doctor_id` (`doctor_id`),
  KEY `idx_clinics_region_id` (`region_id`),
  CONSTRAINT `clinics_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_clinics_region` FOREIGN KEY (`region_id`) REFERENCES `countries_cities` (`countries_cities_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversation_participants`
--

DROP TABLE IF EXISTS `conversation_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `participant_type` enum('user','admin','doctor','assistant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conv_participant_unique` (`conversation_id`,`participant_id`,`participant_type`),
  KEY `idx_participant_lookup` (`participant_id`,`participant_type`),
  CONSTRAINT `conversation_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_conversations_last_message` (`last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `countries_cities`
--

DROP TABLE IF EXISTS `countries_cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries_cities` (
  `countries_cities_id` int NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `level_type` enum('country','city','region','district') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`countries_cities_id`),
  KEY `idx_countries_cities_parent` (`parent_id`),
  KEY `idx_countries_cities_name_en` (`name_en`),
  KEY `idx_countries_cities_name_ar` (`name_ar`),
  KEY `idx_countries_cities_level_type` (`level_type`),
  CONSTRAINT `countries_cities_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `countries_cities` (`countries_cities_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_tips`
--

DROP TABLE IF EXISTS `daily_tips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_tips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_ar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_en` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_daily_tips_active` (`is_active`),
  KEY `idx_daily_tips_created_at` (`created_at`),
  KEY `idx_daily_tips_created_by` (`created_by`),
  KEY `idx_daily_tips_updated_by` (`updated_by`),
  CONSTRAINT `fk_daily_tips_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_daily_tips_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `doctor_availability_summary`
--

DROP TABLE IF EXISTS `doctor_availability_summary`;
/*!50001 DROP VIEW IF EXISTS `doctor_availability_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `doctor_availability_summary` AS SELECT 
 1 AS `doctor_id`,
 1 AS `uuid`,
 1 AS `full_name`,
 1 AS `specialty`,
 1 AS `sub_specialty`,
 1 AS `starting_price`,
 1 AS `is_available`,
 1 AS `rating_average`,
 1 AS `rating_count`,
 1 AS `total_consultations`,
 1 AS `years_of_experience`,
 1 AS `approval_status`,
 1 AS `next_available_slot`,
 1 AS `language_preference`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `doctor_contact_details`
--

DROP TABLE IF EXISTS `doctor_contact_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_contact_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `whatsapp_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `additional_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `personal_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doctor_details` (`doctor_id`),
  CONSTRAINT `doctor_contact_details_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctor_profile_translations`
--

DROP TABLE IF EXISTS `doctor_profile_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_profile_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_profile_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialty` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_specialty` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `biography` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `emergency_contact_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `doctor_profile_id` (`doctor_profile_id`,`language_code`),
  KEY `idx_doctor_profile_translations_profile` (`doctor_profile_id`),
  KEY `idx_doctor_profile_translations_lang` (`language_code`),
  KEY `idx_doctor_profile_translations_specialty` (`specialty`),
  KEY `idx_doctor_profile_translations_full_name` (`full_name`),
  CONSTRAINT `doctor_profile_translations_ibfk_1` FOREIGN KEY (`doctor_profile_id`) REFERENCES `doctor_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctor_profiles`
--

DROP TABLE IF EXISTS `doctor_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `license_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_picture_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `years_of_experience` int NOT NULL,
  `medical_school` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_year` year DEFAULT NULL,
  `board_certifications` json DEFAULT NULL,
  `languages_spoken` json DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `verification_date` timestamp NULL DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected','suspended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `rating_average` decimal(3,2) DEFAULT '0.00',
  `rating_count` int DEFAULT '0',
  `total_consultations` int DEFAULT '0',
  `is_available` tinyint(1) DEFAULT '1',
  `next_available_slot` timestamp NULL DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `language_preference` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `doctor_id` (`doctor_id`),
  UNIQUE KEY `license_number` (`license_number`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_doctor_profiles_doctor` (`doctor_id`),
  KEY `idx_doctor_profiles_license` (`license_number`),
  KEY `idx_doctor_profiles_status` (`approval_status`),
  KEY `idx_doctor_profiles_rating` (`rating_average`),
  KEY `idx_doctor_profiles_available` (`is_available`),
  KEY `idx_doctor_profiles_verified` (`is_verified`),
  CONSTRAINT `doctor_profiles_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_profiles_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctor_schedules`
--

DROP TABLE IF EXISTS `doctor_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `clinic_id` int DEFAULT NULL,
  `day_of_week` enum('saturday','sunday','monday','tuesday','wednesday','thursday','friday') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `session_price` decimal(10,2) NOT NULL,
  `currency_code` char(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_duration` int NOT NULL DEFAULT '30',
  `consultation_type` enum('online','in_clinic') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_doctor` (`doctor_id`),
  KEY `idx_schedules_clinic` (`clinic_id`),
  KEY `idx_schedules_day` (`day_of_week`),
  KEY `idx_schedules_type` (`consultation_type`),
  CONSTRAINT `fk_schedules_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedules_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctor_subscriptions`
--

DROP TABLE IF EXISTS `doctor_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `package_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `subscription_status` enum('active','pending','expired','canceled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by_admin_id` int DEFAULT NULL,
  `last_modified_by_admin_id` int DEFAULT NULL,
  `is_trial` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doctor_package_date` (`doctor_id`,`package_id`,`start_date`),
  KEY `package_id` (`package_id`),
  KEY `approved_by_admin_id` (`approved_by_admin_id`),
  KEY `last_modified_by_admin_id` (`last_modified_by_admin_id`),
  CONSTRAINT `doctor_subscriptions_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_subscriptions_ibfk_2` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `doctor_subscriptions_ibfk_3` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `doctor_subscriptions_ibfk_4` FOREIGN KEY (`last_modified_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctor_verification_documents`
--

DROP TABLE IF EXISTS `doctor_verification_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_verification_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `document_type` enum('national_id','passport','medical_license','board_certificate','university_degree','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `rejection_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_doctor_documents_doctor` (`doctor_id`),
  KEY `idx_doctor_documents_status` (`status`),
  KEY `idx_doctor_documents_type` (`document_type`),
  KEY `fk_doctor_documents_admin` (`verified_by`),
  CONSTRAINT `fk_doctor_documents_admin` FOREIGN KEY (`verified_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_doctor_documents_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctors`
--

DROP TABLE IF EXISTS `doctors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive','suspended','pending_verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_verification',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `login_attempts` int DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `email_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_otp_expiry` timestamp NULL DEFAULT NULL,
  `phone_otp_expiry` timestamp NULL DEFAULT NULL,
  `is_email_otp` tinyint(1) DEFAULT '0',
  `is_phone_otp` tinyint(1) DEFAULT '0',
  `is_id_verified` tinyint(1) DEFAULT '0',
  `current_subscription_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_doctors_email` (`email`),
  KEY `idx_doctors_phone` (`phone`),
  KEY `idx_doctors_uuid` (`uuid`),
  KEY `idx_doctors_status` (`status`),
  KEY `idx_doctors_last_activity` (`last_activity_at`),
  KEY `idx_doctors_email_otp` (`email_otp`),
  KEY `idx_doctors_phone_otp` (`phone_otp`),
  KEY `fk_doctor_current_subscription` (`current_subscription_id`),
  KEY `idx_doctors_is_active` (`is_active`),
  CONSTRAINT `fk_doctor_current_subscription` FOREIGN KEY (`current_subscription_id`) REFERENCES `doctor_subscriptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_doctor_uuid` BEFORE INSERT ON `doctors` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `failed_logins`
--

DROP TABLE IF EXISTS `failed_logins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_logins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `entity_type` enum('user','admin','doctor','assistant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_reason` enum('invalid_credentials','account_locked','account_suspended','too_many_attempts') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'invalid_credentials',
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_failed_logins_email` (`email`),
  KEY `idx_failed_logins_ip` (`ip_address`),
  KEY `idx_failed_logins_entity_type` (`entity_type`),
  KEY `idx_failed_logins_attempted` (`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `features`
--

DROP TABLE IF EXISTS `features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `features` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_ar` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_en` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_name_ar` (`name_ar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `files`
--

DROP TABLE IF EXISTS `files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by_user_id` int DEFAULT NULL,
  `uploaded_by_admin_id` int DEFAULT NULL,
  `uploaded_by_doctor_id` int DEFAULT NULL,
  `uploaded_by_assistant_id` int DEFAULT NULL,
  `related_to_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_to_id` int DEFAULT NULL,
  `file_category` enum('profile_picture','medical_image','document','prescription','license','id_document','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `original_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `file_extension` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `is_encrypted` tinyint(1) DEFAULT '0',
  `encryption_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `virus_scan_status` enum('pending','clean','infected','error') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `virus_scan_date` timestamp NULL DEFAULT NULL,
  `storage_provider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'local',
  `storage_reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_count` int DEFAULT '0',
  `last_accessed_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_files_uuid` (`uuid`),
  KEY `idx_files_uploaded_by_user` (`uploaded_by_user_id`),
  KEY `idx_files_uploaded_by_admin` (`uploaded_by_admin_id`),
  KEY `idx_files_uploaded_by_doctor` (`uploaded_by_doctor_id`),
  KEY `idx_files_uploaded_by_assistant` (`uploaded_by_assistant_id`),
  KEY `idx_files_related` (`related_to_type`,`related_to_id`),
  KEY `idx_files_category` (`file_category`),
  KEY `idx_files_mime_type` (`mime_type`),
  KEY `idx_files_scan_status` (`virus_scan_status`),
  KEY `idx_files_created` (`created_at`),
  KEY `idx_files_deleted` (`is_deleted`),
  KEY `idx_files_related_category` (`related_to_type`,`related_to_id`,`file_category`),
  CONSTRAINT `files_ibfk_1` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `files_ibfk_2` FOREIGN KEY (`uploaded_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `files_ibfk_3` FOREIGN KEY (`uploaded_by_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `files_ibfk_4` FOREIGN KEY (`uploaded_by_assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `files_chk_1` CHECK ((((`uploaded_by_user_id` is not null) and (`uploaded_by_admin_id` is null) and (`uploaded_by_doctor_id` is null) and (`uploaded_by_assistant_id` is null)) or ((`uploaded_by_user_id` is null) and (`uploaded_by_admin_id` is not null) and (`uploaded_by_doctor_id` is null) and (`uploaded_by_assistant_id` is null)) or ((`uploaded_by_user_id` is null) and (`uploaded_by_admin_id` is null) and (`uploaded_by_doctor_id` is not null) and (`uploaded_by_assistant_id` is null)) or ((`uploaded_by_user_id` is null) and (`uploaded_by_admin_id` is null) and (`uploaded_by_doctor_id` is null) and (`uploaded_by_assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_file_uuid` BEFORE INSERT ON `files` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `login_sessions`
--

DROP TABLE IF EXISTS `login_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `assistant_id` int DEFAULT NULL,
  `session_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `device_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operating_system` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_mobile` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `last_activity_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `idx_login_sessions_user` (`user_id`),
  KEY `idx_login_sessions_admin` (`admin_id`),
  KEY `idx_login_sessions_doctor` (`doctor_id`),
  KEY `idx_login_sessions_assistant` (`assistant_id`),
  KEY `idx_login_sessions_token` (`session_token`),
  KEY `idx_login_sessions_active` (`is_active`),
  KEY `idx_login_sessions_expires` (`expires_at`),
  KEY `idx_login_sessions_activity` (`last_activity_at`),
  CONSTRAINT `login_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_sessions_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_sessions_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_sessions_ibfk_4` FOREIGN KEY (`assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_sessions_chk_1` CHECK ((((`user_id` is not null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is not null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is not null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medical_articles`
--

DROP TABLE IF EXISTS `medical_articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medical_articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_title_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_title_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_ar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_en` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_medical_articles_active` (`is_active`),
  KEY `idx_medical_articles_created_at` (`created_at`),
  KEY `idx_medical_articles_created_by` (`created_by`),
  KEY `idx_medical_articles_updated_by` (`updated_by`),
  CONSTRAINT `fk_medical_articles_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_medical_articles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medical_record_translations`
--

DROP TABLE IF EXISTS `medical_record_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medical_record_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_record_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `chief_complaint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `history_of_present_illness` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `physical_examination` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `assessment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `diagnosis` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `differential_diagnosis` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `treatment_plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `follow_up_instructions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `doctor_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `medical_record_id` (`medical_record_id`,`language_code`),
  KEY `idx_medical_record_translations_record` (`medical_record_id`),
  KEY `idx_medical_record_translations_lang` (`language_code`),
  KEY `idx_translations_composite_medical_record` (`medical_record_id`,`language_code`),
  CONSTRAINT `medical_record_translations_ibfk_1` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medical_records`
--

DROP TABLE IF EXISTS `medical_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medical_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `appointment_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `visit_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `next_appointment_recommended` tinyint(1) DEFAULT '0',
  `follow_up_date` date DEFAULT NULL,
  `vital_signs` json DEFAULT NULL,
  `skin_condition_severity` enum('mild','moderate','severe') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'mild',
  `affected_body_areas` json DEFAULT NULL,
  `treatment_response` enum('excellent','good','fair','poor','unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unknown',
  `patient_consent` tinyint(1) DEFAULT '0',
  `record_status` enum('draft','final','amended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_medical_records_uuid` (`uuid`),
  KEY `idx_medical_records_appointment` (`appointment_id`),
  KEY `idx_medical_records_patient` (`patient_id`),
  KEY `idx_medical_records_doctor` (`doctor_id`),
  KEY `idx_medical_records_date` (`visit_date`),
  KEY `idx_medical_records_status` (`record_status`),
  KEY `idx_medical_records_patient_date` (`patient_id`,`visit_date`),
  CONSTRAINT `medical_records_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `medical_records_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `medical_records_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_medical_record_uuid` BEFORE INSERT ON `medical_records` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `medications`
--

DROP TABLE IF EXISTS `medications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_doctor_id` int DEFAULT NULL,
  `name_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scientific_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_type` enum('tablet','capsule','syrup','cream','ointment','injection','drops','inhaler','suppository','sachet','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'tablet',
  `available_dosages` json DEFAULT NULL,
  `indications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `warning_alert` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_medications_names` (`name_ar`,`name_en`),
  KEY `idx_medications_creator` (`created_by_doctor_id`),
  CONSTRAINT `fk_medications_creator` FOREIGN KEY (`created_by_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `sender_type` enum('user','admin','doctor','assistant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text','image','file','voice','system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `file_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `reply_to_message_id` int DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `reply_to_message_id` (`reply_to_message_id`),
  KEY `file_id` (`file_id`),
  KEY `idx_messages_conversation` (`conversation_id`),
  KEY `idx_messages_created` (`created_at`),
  KEY `idx_messages_sender` (`sender_id`,`sender_type`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_translations`
--

DROP TABLE IF EXISTS `notification_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_id` (`notification_id`,`language_code`),
  KEY `idx_notification_translations_notification` (`notification_id`),
  KEY `idx_notification_translations_lang` (`language_code`),
  KEY `idx_translations_composite_notification` (`notification_id`,`language_code`),
  CONSTRAINT `notification_translations_ibfk_1` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `assistant_id` int DEFAULT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_entity_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_entity_id` int DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `delivery_method` enum('push','email','sms','in_app') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'in_app',
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `delivery_status` enum('pending','sent','delivered','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `retry_count` int DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_notifications_uuid` (`uuid`),
  KEY `idx_notifications_user` (`user_id`),
  KEY `idx_notifications_admin` (`admin_id`),
  KEY `idx_notifications_doctor` (`doctor_id`),
  KEY `idx_notifications_assistant` (`assistant_id`),
  KEY `idx_notifications_type` (`type`),
  KEY `idx_notifications_unread_user` (`user_id`,`is_read`),
  KEY `idx_notifications_unread_admin` (`admin_id`,`is_read`),
  KEY `idx_notifications_unread_doctor` (`doctor_id`,`is_read`),
  KEY `idx_notifications_unread_assistant` (`assistant_id`,`is_read`),
  KEY `idx_notifications_priority` (`priority`),
  KEY `idx_notifications_delivery` (`delivery_status`),
  KEY `idx_notifications_created` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_chk_1` CHECK ((((`user_id` is not null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is not null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is not null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_notification_uuid` BEFORE INSERT ON `notifications` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `package_features`
--

DROP TABLE IF EXISTS `package_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_features` (
  `id` int NOT NULL AUTO_INCREMENT,
  `package_id` int NOT NULL,
  `feature_id` int NOT NULL,
  `feature_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_included` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_package_feature` (`package_id`,`feature_id`),
  KEY `feature_id` (`feature_id`),
  CONSTRAINT `package_features_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `package_features_ibfk_2` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `packages`
--

DROP TABLE IF EXISTS `packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_name_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_name_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_days` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `currency_code` char(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `assistant_id` int DEFAULT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_used` tinyint(1) DEFAULT '0',
  `used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  KEY `admin_id` (`admin_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `assistant_id` (`assistant_id`),
  KEY `idx_password_resets_token` (`token`),
  KEY `idx_password_resets_email` (`email`),
  KEY `idx_password_resets_expires` (`expires_at`),
  KEY `idx_password_resets_used` (`is_used`),
  CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `password_resets_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `password_resets_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `password_resets_ibfk_4` FOREIGN KEY (`assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `password_resets_chk_1` CHECK ((((`user_id` is not null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is not null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is not null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patient_profile_translations`
--

DROP TABLE IF EXISTS `patient_profile_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_profile_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_profile_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `medical_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `current_medications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `allergies` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `chronic_conditions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `family_medical_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patient_profile_id` (`patient_profile_id`,`language_code`),
  KEY `idx_patient_profile_translations_profile` (`patient_profile_id`),
  KEY `idx_patient_profile_translations_lang` (`language_code`),
  CONSTRAINT `patient_profile_translations_ibfk_1` FOREIGN KEY (`patient_profile_id`) REFERENCES `patient_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patient_profiles`
--

DROP TABLE IF EXISTS `patient_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `blood_type` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unknown',
  `height` decimal(5,2) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `smoking_status` enum('never','former','current','unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unknown',
  `alcohol_consumption` enum('never','rarely','occasionally','regularly','unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unknown',
  `exercise_frequency` enum('never','rarely','sometimes','regularly','daily','unknown') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unknown',
  `insurance_provider` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `insurance_policy_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_doctor_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_patient_profiles_user` (`user_id`),
  KEY `idx_patient_profiles_preferred_doctor` (`preferred_doctor_id`),
  CONSTRAINT `patient_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `patient_profiles_ibfk_2` FOREIGN KEY (`preferred_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `appointment_id` int DEFAULT NULL,
  `payer_user_id` int DEFAULT NULL,
  `payer_admin_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'USD',
  `payment_method` enum('credit_card','debit_card','paypal','stripe','cash','bank_transfer','insurance') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'credit_card',
  `payment_status` enum('pending','processing','completed','failed','cancelled','refunded','partially_refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `transaction_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_response` json DEFAULT NULL,
  `gateway_transaction_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_gateway` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processing_fee` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) DEFAULT NULL,
  `refund_amount` decimal(10,2) DEFAULT '0.00',
  `refund_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `refunded_by_admin_id` int DEFAULT NULL,
  `payment_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `refunded_by_admin_id` (`refunded_by_admin_id`),
  KEY `idx_payments_uuid` (`uuid`),
  KEY `idx_payments_appointment` (`appointment_id`),
  KEY `idx_payments_payer_user` (`payer_user_id`),
  KEY `idx_payments_payer_admin` (`payer_admin_id`),
  KEY `idx_payments_status` (`payment_status`),
  KEY `idx_payments_transaction` (`transaction_id`),
  KEY `idx_payments_date` (`payment_date`),
  KEY `idx_payments_created` (`created_at`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`payer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`payer_admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_4` FOREIGN KEY (`refunded_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_chk_1` CHECK ((((`payer_user_id` is not null) and (`payer_admin_id` is null)) or ((`payer_user_id` is null) and (`payer_admin_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_payment_uuid` BEFORE INSERT ON `payments` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `prescription_template_items`
--

DROP TABLE IF EXISTS `prescription_template_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescription_template_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `medication_id` int NOT NULL,
  `default_dosage` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_frequency` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_duration` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_instructions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `default_quantity` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_template_items_template` (`template_id`),
  KEY `idx_template_items_medication` (`medication_id`),
  CONSTRAINT `fk_template_items_medication` FOREIGN KEY (`medication_id`) REFERENCES `medications` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_template_items_parent` FOREIGN KEY (`template_id`) REFERENCES `prescription_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prescription_templates`
--

DROP TABLE IF EXISTS `prescription_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescription_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `doctor_id` int NOT NULL,
  `template_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_templates_doctor` (`doctor_id`),
  CONSTRAINT `fk_templates_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prescription_translations`
--

DROP TABLE IF EXISTS `prescription_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescription_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prescription_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `instructions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `indication` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pharmacy_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prescription_id` (`prescription_id`,`language_code`),
  KEY `idx_prescription_translations_prescription` (`prescription_id`),
  KEY `idx_prescription_translations_lang` (`language_code`),
  KEY `idx_translations_composite_prescription` (`prescription_id`,`language_code`),
  CONSTRAINT `prescription_translations_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prescriptions`
--

DROP TABLE IF EXISTS `prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `medical_record_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `medication_id` int DEFAULT NULL,
  `medication_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prescription_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dosage` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `route_of_administration` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refills_allowed` int DEFAULT '0',
  `refills_used` int DEFAULT '0',
  `is_generic_allowed` tinyint(1) DEFAULT '1',
  `status` enum('active','filled','expired','cancelled','replaced') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `prescribed_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` date DEFAULT NULL,
  `filled_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `prescription_number` (`prescription_number`),
  KEY `idx_prescriptions_uuid` (`uuid`),
  KEY `idx_prescriptions_record` (`medical_record_id`),
  KEY `idx_prescriptions_patient` (`patient_id`),
  KEY `idx_prescriptions_doctor` (`doctor_id`),
  KEY `idx_prescriptions_medication` (`medication_id`),
  KEY `idx_prescriptions_number` (`prescription_number`),
  KEY `idx_prescriptions_status` (`status`),
  KEY `idx_prescriptions_expiry` (`expiry_date`),
  CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prescriptions_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prescriptions_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prescriptions_ibfk_4` FOREIGN KEY (`medication_id`) REFERENCES `medications` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rating_translations`
--

DROP TABLE IF EXISTS `rating_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rating_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `review_title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `flagged_reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `response_from_doctor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rating_id` (`rating_id`,`language_code`),
  KEY `idx_rating_translations_rating` (`rating_id`),
  KEY `idx_rating_translations_lang` (`language_code`),
  KEY `idx_translations_composite_rating` (`rating_id`,`language_code`),
  CONSTRAINT `rating_translations_ibfk_1` FOREIGN KEY (`rating_id`) REFERENCES `ratings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `appointment_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `rating` int NOT NULL,
  `categories` json DEFAULT NULL,
  `would_recommend` tinyint(1) DEFAULT NULL,
  `is_anonymous` tinyint(1) DEFAULT '0',
  `is_verified` tinyint(1) DEFAULT '1',
  `doctor_responded_at` timestamp NULL DEFAULT NULL,
  `is_flagged` tinyint(1) DEFAULT '0',
  `flagged_by_admin_id` int DEFAULT NULL,
  `flagged_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','hidden','removed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `helpful_votes` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `appointment_id` (`appointment_id`),
  KEY `flagged_by_admin_id` (`flagged_by_admin_id`),
  KEY `idx_ratings_uuid` (`uuid`),
  KEY `idx_ratings_appointment` (`appointment_id`),
  KEY `idx_ratings_patient` (`patient_id`),
  KEY `idx_ratings_doctor` (`doctor_id`),
  KEY `idx_ratings_rating` (`rating`),
  KEY `idx_ratings_status` (`status`),
  KEY `idx_ratings_created` (`created_at`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_4` FOREIGN KEY (`flagged_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ratings_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_rating_uuid` BEFORE INSERT ON `ratings` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `update_doctor_rating_after_insert` AFTER INSERT ON `ratings` FOR EACH ROW BEGIN
UPDATE doctor_profiles 
SET 
rating_average = (
SELECT AVG(rating) 
FROM ratings 
WHERE doctor_id = NEW.doctor_id AND status = 'active'
),
rating_count = (
SELECT COUNT(*) 
FROM ratings 
WHERE doctor_id = NEW.doctor_id AND status = 'active'
)
WHERE doctor_id = NEW.doctor_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `update_doctor_rating_after_update` AFTER UPDATE ON `ratings` FOR EACH ROW BEGIN
UPDATE doctor_profiles 
SET 
rating_average = (
SELECT AVG(rating) 
FROM ratings 
WHERE doctor_id = NEW.doctor_id AND status = 'active'
),
rating_count = (
SELECT COUNT(*) 
FROM ratings 
WHERE doctor_id = NEW.doctor_id AND status = 'active'
)
WHERE doctor_id = NEW.doctor_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `skin_diseases_info`
--

DROP TABLE IF EXISTS `skin_diseases_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skin_diseases_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_ar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description_en` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `website_link` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_skin_diseases_active` (`is_active`),
  KEY `idx_skin_diseases_created_at` (`created_at`),
  KEY `idx_skin_diseases_created_by` (`created_by`),
  KEY `idx_skin_diseases_updated_by` (`updated_by`),
  CONSTRAINT `fk_skin_diseases_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_skin_diseases_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_ticket_translations`
--

DROP TABLE IF EXISTS `support_ticket_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_ticket_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `support_ticket_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resolution_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `support_ticket_id` (`support_ticket_id`,`language_code`),
  KEY `idx_support_ticket_translations_ticket` (`support_ticket_id`),
  KEY `idx_support_ticket_translations_lang` (`language_code`),
  KEY `idx_translations_composite_support_ticket` (`support_ticket_id`,`language_code`),
  CONSTRAINT `support_ticket_translations_ibfk_1` FOREIGN KEY (`support_ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `assistant_id` int DEFAULT NULL,
  `assigned_to_admin_id` int DEFAULT NULL,
  `ticket_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('technical','billing','medical','general','complaint','feature_request') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `priority` enum('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `status` enum('open','in_progress','pending_user','resolved','closed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `idx_support_tickets_uuid` (`uuid`),
  KEY `idx_support_tickets_user` (`user_id`),
  KEY `idx_support_tickets_admin` (`admin_id`),
  KEY `idx_support_tickets_doctor` (`doctor_id`),
  KEY `idx_support_tickets_assistant` (`assistant_id`),
  KEY `idx_support_tickets_assigned` (`assigned_to_admin_id`),
  KEY `idx_support_tickets_number` (`ticket_number`),
  KEY `idx_support_tickets_status` (`status`),
  KEY `idx_support_tickets_priority` (`priority`),
  KEY `idx_support_tickets_created` (`created_at`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_ibfk_4` FOREIGN KEY (`assistant_id`) REFERENCES `assistants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_ibfk_5` FOREIGN KEY (`assigned_to_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_chk_1` CHECK ((((`user_id` is not null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is not null) and (`doctor_id` is null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is not null) and (`assistant_id` is null)) or ((`user_id` is null) and (`admin_id` is null) and (`doctor_id` is null) and (`assistant_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_support_ticket_uuid` BEFORE INSERT ON `support_tickets` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_ticket_number` BEFORE INSERT ON `support_tickets` FOR EACH ROW BEGIN
IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
SET NEW.ticket_number = CONCAT('TKT-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 999999), 6, '0'));
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary view structure for view `user_complete_profiles`
--

DROP TABLE IF EXISTS `user_complete_profiles`;
/*!50001 DROP VIEW IF EXISTS `user_complete_profiles`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `user_complete_profiles` AS SELECT 
 1 AS `id`,
 1 AS `uuid`,
 1 AS `email`,
 1 AS `phone`,
 1 AS `account_status`,
 1 AS `language_preference`,
 1 AS `full_name`,
 1 AS `date_of_birth`,
 1 AS `gender`,
 1 AS `profile_picture_url`,
 1 AS `city`,
 1 AS `country`,
 1 AS `created_at`,
 1 AS `last_login_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `user_profile_translations`
--

DROP TABLE IF EXISTS `user_profile_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profile_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `language_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profile_id` (`profile_id`,`language_code`),
  KEY `idx_user_profile_translations_profile` (`profile_id`),
  KEY `idx_user_profile_translations_lang` (`language_code`),
  KEY `idx_user_profile_translations_full_name` (`full_name`),
  CONSTRAINT `user_profile_translations_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `language_preference` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_profiles_user` (`user_id`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive','suspended','pending_verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_verification',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `login_attempts` int DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `email_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_otp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_otp_expiry` timestamp NULL DEFAULT NULL,
  `phone_otp_expiry` timestamp NULL DEFAULT NULL,
  `is_email_otp` tinyint(1) DEFAULT '0',
  `is_phone_otp` tinyint(1) DEFAULT '0',
  `is_id_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_uuid` (`uuid`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_last_activity` (`last_activity_at`),
  KEY `idx_users_email_otp` (`email_otp`),
  KEY `idx_users_phone_otp` (`phone_otp`),
  KEY `idx_users_email_otp_expiry` (`email_otp_expiry`),
  KEY `idx_users_phone_otp_expiry` (`phone_otp_expiry`),
  KEY `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_user_uuid` BEFORE INSERT ON `users` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `video_sessions`
--

DROP TABLE IF EXISTS `video_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `appointment_id` int NOT NULL,
  `session_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_status` enum('scheduled','active','ended','cancelled','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `duration_minutes` int DEFAULT '0',
  `recording_enabled` tinyint(1) DEFAULT '0',
  `recording_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recording_size_mb` decimal(10,2) DEFAULT NULL,
  `participant_count` int DEFAULT '0',
  `quality_rating` enum('poor','fair','good','excellent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'good',
  `connection_issues` json DEFAULT NULL,
  `technical_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `idx_video_sessions_uuid` (`uuid`),
  KEY `idx_video_sessions_appointment` (`appointment_id`),
  KEY `idx_video_sessions_session_id` (`session_id`),
  KEY `idx_video_sessions_status` (`session_status`),
  KEY `idx_video_sessions_started` (`started_at`),
  CONSTRAINT `video_sessions_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `generate_video_session_uuid` BEFORE INSERT ON `video_sessions` FOR EACH ROW BEGIN
IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
SET NEW.uuid = (SELECT UUID());
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Dumping events for database 'bashra_ai'
--

--
-- Dumping routines for database 'bashra_ai'
--
/*!50003 DROP PROCEDURE IF EXISTS `GenerateUserEmailOTP` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `GenerateUserEmailOTP`(
IN p_user_id INT,
IN p_otp_code VARCHAR(10),
IN p_expiry_minutes INT
)
BEGIN
DECLARE v_expiry_minutes INT;
SET v_expiry_minutes = IFNULL(NULLIF(p_expiry_minutes, 0), 10);

UPDATE users 
SET email_otp = p_otp_code,
email_otp_expiry = DATE_ADD(NOW(), INTERVAL v_expiry_minutes MINUTE),
is_email_otp = 0,
updated_at = NOW()
WHERE id = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `GenerateUserPhoneOTP` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `GenerateUserPhoneOTP`(
IN p_user_id INT,
IN p_otp_code VARCHAR(10),
IN p_expiry_minutes INT
)
BEGIN
DECLARE v_expiry_minutes INT;
SET v_expiry_minutes = IFNULL(NULLIF(p_expiry_minutes, 0), 10);

UPDATE users 
SET phone_otp = p_otp_code,
phone_otp_expiry = DATE_ADD(NOW(), INTERVAL v_expiry_minutes MINUTE),
is_phone_otp = 0,
updated_at = NOW()
WHERE id = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `VerifyUserEmailOTP` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `VerifyUserEmailOTP`(
IN p_user_id INT,
IN p_otp_code VARCHAR(10),
OUT p_result VARCHAR(50)
)
BEGIN
DECLARE v_stored_otp VARCHAR(10);
DECLARE v_expiry TIMESTAMP;
DECLARE v_is_verified TINYINT(1);

SELECT email_otp, email_otp_expiry, is_email_otp
INTO v_stored_otp, v_expiry, v_is_verified
FROM users 
WHERE id = p_user_id;

IF v_stored_otp IS NULL THEN
SET p_result = 'NO_OTP_FOUND';
ELSEIF v_expiry < NOW() THEN
SET p_result = 'OTP_EXPIRED';
UPDATE users 
SET email_otp = NULL, email_otp_expiry = NULL, is_email_otp = 0
WHERE id = p_user_id;
ELSEIF v_is_verified = 1 THEN
SET p_result = 'OTP_ALREADY_USED';
ELSEIF v_stored_otp = p_otp_code THEN
SET p_result = 'SUCCESS';
UPDATE users 
SET is_email_otp = 1, email_verified_at = NOW(), updated_at = NOW()
WHERE id = p_user_id;
ELSE
SET p_result = 'INVALID_OTP';
END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `VerifyUserPhoneOTP` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `VerifyUserPhoneOTP`(
IN p_user_id INT,
IN p_otp_code VARCHAR(10),
OUT p_result VARCHAR(50)
)
BEGIN
DECLARE v_stored_otp VARCHAR(10);
DECLARE v_expiry TIMESTAMP;
DECLARE v_is_verified TINYINT(1);

SELECT phone_otp, phone_otp_expiry, is_phone_otp
INTO v_stored_otp, v_expiry, v_is_verified
FROM users 
WHERE id = p_user_id;

IF v_stored_otp IS NULL THEN
SET p_result = 'NO_OTP_FOUND';
ELSEIF v_expiry < NOW() THEN
SET p_result = 'OTP_EXPIRED';
UPDATE users 
SET phone_otp = NULL, phone_otp_expiry = NULL, is_phone_otp = 0
WHERE id = p_user_id;
ELSEIF v_is_verified = 1 THEN
SET p_result = 'OTP_ALREADY_USED';
ELSEIF v_stored_otp = p_otp_code THEN
SET p_result = 'SUCCESS';
UPDATE users 
SET is_phone_otp = 1, phone_verified_at = NOW(), updated_at = NOW()
WHERE id = p_user_id;
ELSE
SET p_result = 'INVALID_OTP';
END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `appointment_summary`
--

/*!50001 DROP VIEW IF EXISTS `appointment_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `appointment_summary` AS select `a`.`id` AS `id`,`a`.`uuid` AS `uuid`,`a`.`scheduled_date` AS `scheduled_date`,`a`.`actual_start_time` AS `actual_start_time`,`a`.`status` AS `status`,`a`.`appointment_type` AS `appointment_type`,`p_upt`.`full_name` AS `patient_full_name`,`p_user`.`email` AS `patient_email`,`p_up`.`language_preference` AS `patient_language`,`d_dpt`.`full_name` AS `doctor_full_name`,`d_user`.`email` AS `doctor_email`,`d_dp`.`language_preference` AS `doctor_language`,`d_dptt`.`specialty` AS `doctor_specialty`,`at_trans`.`chief_complaint` AS `chief_complaint`,`at_trans`.`symptoms_description` AS `symptoms_description`,`a`.`consultation_fee` AS `consultation_fee`,`ds`.`currency_code` AS `currency_code`,`a`.`payment_status` AS `payment_status`,`a`.`created_at` AS `created_at` from (((((((((`appointments` `a` join `users` `p_user` on((`a`.`patient_id` = `p_user`.`id`))) join `doctors` `d_user` on((`a`.`doctor_id` = `d_user`.`id`))) left join `doctor_schedules` `ds` on((`a`.`schedule_id` = `ds`.`id`))) left join `user_profiles` `p_up` on((`a`.`patient_id` = `p_up`.`user_id`))) left join `doctor_profiles` `d_dp` on((`a`.`doctor_id` = `d_dp`.`doctor_id`))) left join `user_profile_translations` `p_upt` on(((`p_up`.`id` = `p_upt`.`profile_id`) and (`p_upt`.`language_code` = coalesce(`p_up`.`language_preference`,'en'))))) left join `doctor_profile_translations` `d_dpt` on(((`d_dp`.`id` = `d_dpt`.`doctor_profile_id`) and (`d_dpt`.`language_code` = coalesce(`d_dp`.`language_preference`,'en'))))) left join `doctor_profile_translations` `d_dptt` on(((`d_dp`.`id` = `d_dptt`.`doctor_profile_id`) and (`d_dptt`.`language_code` = coalesce(`d_dp`.`language_preference`,'en'))))) left join `appointment_translations` `at_trans` on(((`a`.`id` = `at_trans`.`appointment_id`) and (`at_trans`.`language_code` = coalesce(`p_up`.`language_preference`,'en'))))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `doctor_availability_summary`
--

/*!50001 DROP VIEW IF EXISTS `doctor_availability_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `doctor_availability_summary` AS select `d`.`id` AS `doctor_id`,`d`.`uuid` AS `uuid`,`dpt`.`full_name` AS `full_name`,`dptt`.`specialty` AS `specialty`,`dptt`.`sub_specialty` AS `sub_specialty`,(select min(`ds`.`session_price`) from `doctor_schedules` `ds` where ((`ds`.`doctor_id` = `d`.`id`) and (`ds`.`is_active` = 1))) AS `starting_price`,`dp`.`is_available` AS `is_available`,`dp`.`rating_average` AS `rating_average`,`dp`.`rating_count` AS `rating_count`,`dp`.`total_consultations` AS `total_consultations`,`dp`.`years_of_experience` AS `years_of_experience`,`dp`.`approval_status` AS `approval_status`,`dp`.`next_available_slot` AS `next_available_slot`,`dp`.`language_preference` AS `language_preference` from (((`doctors` `d` join `doctor_profiles` `dp` on((`d`.`id` = `dp`.`doctor_id`))) left join `doctor_profile_translations` `dpt` on(((`dp`.`id` = `dpt`.`doctor_profile_id`) and (`dpt`.`language_code` = `dp`.`language_preference`)))) left join `doctor_profile_translations` `dptt` on(((`dp`.`id` = `dptt`.`doctor_profile_id`) and (`dptt`.`language_code` = `dp`.`language_preference`)))) where (`dp`.`approval_status` = 'approved') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_complete_profiles`
--

/*!50001 DROP VIEW IF EXISTS `user_complete_profiles`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `user_complete_profiles` AS select `u`.`id` AS `id`,`u`.`uuid` AS `uuid`,`u`.`email` AS `email`,`u`.`phone` AS `phone`,`u`.`status` AS `account_status`,`up`.`language_preference` AS `language_preference`,`upt`.`full_name` AS `full_name`,`up`.`date_of_birth` AS `date_of_birth`,`up`.`gender` AS `gender`,`up`.`profile_picture_url` AS `profile_picture_url`,coalesce(`city_tbl`.`name_en`,`city_tbl`.`name_ar`) AS `city`,coalesce(`country_tbl`.`name_en`,`country_tbl`.`name_ar`) AS `country`,`u`.`created_at` AS `created_at`,`u`.`last_login_at` AS `last_login_at` from ((((((`users` `u` left join `user_profiles` `up` on((`u`.`id` = `up`.`user_id`))) left join `user_profile_translations` `upt` on(((`up`.`id` = `upt`.`profile_id`) and (`upt`.`language_code` = `up`.`language_preference`)))) left join `addressable` `addr_link` on(((`u`.`id` = `addr_link`.`addressable_id`) and (`addr_link`.`addressable_type` = 'User')))) left join `addresses` `a` on(((`addr_link`.`address_id` = `a`.`id`) and (`a`.`is_primary` = 1)))) left join `countries_cities` `city_tbl` on((`a`.`countries_cities_id` = `city_tbl`.`countries_cities_id`))) left join `countries_cities` `country_tbl` on((`city_tbl`.`parent_id` = `country_tbl`.`countries_cities_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-09  4:17:43

-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 25, 2026 at 11:47 AM
-- Server version: 11.8.9-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u520834156_flowVsionDB`
--

-- --------------------------------------------------------

--
-- Table structure for table `document_storage`
--

CREATE TABLE `document_storage` (
  `id` int(11) NOT NULL,
  `document_uuid` varchar(36) NOT NULL,
  `file_blob` longblob NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `ai_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ai_metadata`)),
  `page_number` int(11) DEFAULT NULL,
  `scan_session_id` char(36) DEFAULT NULL,
  `source_type` varchar(30) DEFAULT 'UPLOAD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `document_storage`
--
ALTER TABLE `document_storage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_uuid` (`document_uuid`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `document_storage`
--
ALTER TABLE `document_storage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

-- --------------------------------------------------------

--
-- Table structure for table `org_knowledge_files`
--
-- Org-level AI knowledge base: PDF / Word (.docx) / Excel (.xlsx) files an
-- org admin (client role) uploads from Settings so the AI chat assistant can
-- ground its answers about "how the org works" in real organization docs.
--

CREATE TABLE `org_knowledge_files` (
  `id` int(11) NOT NULL,
  `org_id` varchar(36) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_ext` varchar(10) NOT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `file_blob` longblob NOT NULL,
  `extracted_text` longtext DEFAULT NULL,
  `extraction_status` varchar(20) NOT NULL DEFAULT 'ready',
  `extraction_error` text DEFAULT NULL,
  `uploaded_by` varchar(36) DEFAULT NULL,
  `uploaded_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for table `org_knowledge_files`
--
ALTER TABLE `org_knowledge_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `org_id` (`org_id`);

--
-- AUTO_INCREMENT for table `org_knowledge_files`
--
ALTER TABLE `org_knowledge_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

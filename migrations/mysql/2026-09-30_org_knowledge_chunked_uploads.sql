-- ============================================================================
-- AI Knowledge Base: chunked PDF uploads (up to 150 MB)
-- Target: Hostinger MariaDB (u520834156_flowVsionDB), run once in phpMyAdmin.
-- Safe to re-run: every statement is IF NOT EXISTS / idempotent.
--
-- Why: Vercel rejects request bodies over ~4.5 MB (HTTP 413) before the app
-- runs, so large PDFs are uploaded as 3.5 MB chunks. Each chunk is stored
-- permanently, in order, in org_knowledge_file_chunks — the file is never
-- reassembled inside a serverless function. Existing single-blob rows keep
-- working unchanged (storage_mode = 'blob', upload_status = 'completed').
--
-- Run this BEFORE deploying the code that uses it: the knowledge list and the
-- AI context lookup filter on upload_status.
-- ============================================================================

-- Chunked files have no single blob.
ALTER TABLE `org_knowledge_files`
  MODIFY `file_blob` LONGBLOB NULL;

ALTER TABLE `org_knowledge_files`
  -- 'blob'    = whole file in file_blob (all rows created before this migration)
  -- 'chunked' = file stored in org_knowledge_file_chunks
  ADD COLUMN IF NOT EXISTS `storage_mode` VARCHAR(10) NOT NULL DEFAULT 'blob' AFTER `file_blob`,
  -- 'uploading' while chunks/text arrive; 'completed' once finalized.
  -- Only 'completed' rows are listed or used by the AI. Existing rows default
  -- to 'completed'. Rejected/cancelled uploads are deleted, not kept.
  ADD COLUMN IF NOT EXISTS `upload_status` VARCHAR(20) NOT NULL DEFAULT 'completed' AFTER `storage_mode`,
  -- Random, unguessable id for a chunked upload session (never the numeric id).
  ADD COLUMN IF NOT EXISTS `upload_id` CHAR(36) NULL AFTER `upload_status`,
  ADD COLUMN IF NOT EXISTS `total_chunks` INT NULL AFTER `upload_id`,
  ADD COLUMN IF NOT EXISTS `chunk_size` INT NULL AFTER `total_chunks`,
  ADD COLUMN IF NOT EXISTS `page_count` INT NULL AFTER `chunk_size`,
  -- Number of extracted-text batches appended so far (keeps appends ordered
  -- and makes a retried batch a no-op instead of duplicating text).
  ADD COLUMN IF NOT EXISTS `text_batches` INT NOT NULL DEFAULT 0 AFTER `page_count`,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() AFTER `created_at`;

ALTER TABLE `org_knowledge_files`
  ADD UNIQUE INDEX IF NOT EXISTS `uq_upload_id` (`upload_id`),
  ADD INDEX IF NOT EXISTS `idx_org_upload_status` (`org_id`, `upload_status`);

-- Ordered file chunks. Deleting the parent file row deletes its chunks.
CREATE TABLE IF NOT EXISTS `org_knowledge_file_chunks` (
  `file_id` INT(11) NOT NULL,
  `chunk_index` INT(11) NOT NULL,
  `chunk_data` MEDIUMBLOB NOT NULL,
  `chunk_size` INT(11) NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`file_id`, `chunk_index`),
  CONSTRAINT `fk_knowledge_chunk_file`
    FOREIGN KEY (`file_id`) REFERENCES `org_knowledge_files` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

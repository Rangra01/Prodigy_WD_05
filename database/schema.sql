-- =============================================================
-- Social Media Platform — MySQL Schema (Task 05)
-- =============================================================
-- Safe to run multiple times: this script never drops an existing
-- database or table. It only creates what does not exist yet.
--
-- How to apply (from the project root):
--   sudo mysql < database/schema.sql
--   -- or, with an existing MySQL user that has CREATE privileges:
--   mysql -u <user> -p < database/schema.sql
--
-- Make sure DB_NAME in server/.env matches the database below
-- (default: social_media_db).
-- =============================================================

CREATE DATABASE IF NOT EXISTS social_media_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE social_media_db;

-- -------------------------------------------------------------
-- users: account + profile information
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL,
  username      VARCHAR(30)  NOT NULL,
  email         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio           VARCHAR(160) NULL DEFAULT NULL,
  profile_image VARCHAR(500) NULL DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_created_at (created_at)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- posts: text posts with an optional image
-- user_id cascade: deleting a user removes their posts.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  content    TEXT         NOT NULL,
  image_url  VARCHAR(500) NULL DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_posts_user_id (user_id),
  KEY idx_posts_created_at (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- likes: one like per user per post (unique constraint prevents
-- duplicate likes). Cascade keeps likes consistent when a user
-- or a post is deleted — no orphaned rows.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS likes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  post_id    INT UNSIGNED NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_likes_user_post (user_id, post_id),
  KEY idx_likes_post_id (post_id),
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id)
    REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- comments: comments on posts (cascade prevents orphans)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  post_id    INT UNSIGNED NOT NULL,
  content    VARCHAR(500) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post_id (post_id),
  KEY idx_comments_user_id (user_id),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id)
    REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB;

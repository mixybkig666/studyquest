-- 修复 word_progress 表的 book_id 类型问题
-- 将 book_id 从 UUID 改为 TEXT 以支持内置词库 ID (如 "primary_4")

BEGIN;

-- 1. 临时移除外键约束
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_book_id_fkey;
ALTER TABLE word_sessions DROP CONSTRAINT IF EXISTS word_sessions_book_id_fkey;

-- 2. 修改 word_progress.book_id 类型
ALTER TABLE word_progress ALTER COLUMN book_id TYPE TEXT;

-- 3. 修改 word_sessions.book_id 类型
ALTER TABLE word_sessions ALTER COLUMN book_id TYPE TEXT;

-- 4. 修改 word_books.id 类型 (如果需要的话，但通常我们希望保持 word_books.id 为 UUID 对于自定义词库)
-- 但是，为了统一，我们可以让 word_books.id 也变为 TEXT，这样可以混合存储
-- 不过，内置词库通常不存储在 word_books 表中，而是硬编码在前端
-- word_books 表主要用于存储 "自定义" 或 "课本" 词库
-- 所以 word_books.id 可以保持 UUID，或者改为 TEXT 以便未来可能的统一

-- 这里我们只修改 progress 和 sessions 表，允许它们存储 TEXT
-- 对于自定义词库，它们仍然存储 UUID字符串
-- 对于内置词库，它们存储 "primary_4" 等字符串

-- 重新添加外键约束？不行，因为 "primary_4" 在 word_books 表中不存在
-- 所以我们不再对 book_id 强制外键约束，或者我们需要在 word_books 中插入内置词库的占位符

-- 决策：移除数据库层面的外键约束，由应用层保证一致性
-- 这允许 book_id 指向 non-database 资源 (内置词库)

-- 5. 如果需要，可以为自定义词库保留某种约束，但这会很复杂
-- 我们简单地移除外键约束即可

COMMIT;

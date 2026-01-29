-- 英语单词学习模块 - 数据库表定义
-- 用于持久化词库和学习进度

-- ============================================
-- 词库表
-- ============================================

CREATE TABLE IF NOT EXISTS word_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 基本信息
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('builtin', 'textbook', 'custom')),
    grade_level INT,
    word_count INT NOT NULL DEFAULT 0,
    
    -- 元数据
    source_url TEXT,                   -- 课本上传来源
    cover_image TEXT,                  -- 封面图
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_word_books_user ON word_books (user_id);
CREATE INDEX IF NOT EXISTS idx_word_books_grade ON word_books (grade_level);

-- RLS
ALTER TABLE word_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view builtin books"
    ON word_books FOR SELECT
    USING (category = 'builtin' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own books"
    ON word_books FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- 单词学习进度表
-- ============================================

CREATE TABLE IF NOT EXISTS word_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 单词信息
    word TEXT NOT NULL,
    book_id UUID REFERENCES word_books(id) ON DELETE SET NULL,
    
    -- 学习状态
    status TEXT NOT NULL DEFAULT 'new' 
        CHECK (status IN ('new', 'learning', 'reviewing', 'mastered')),
    
    -- 统计数据
    correct_count INT NOT NULL DEFAULT 0,
    wrong_count INT NOT NULL DEFAULT 0,
    review_stage INT NOT NULL DEFAULT 0,  -- 0-6, 6 表示已掌握
    
    -- 时间管理
    last_practice_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 唯一约束
    UNIQUE(user_id, word, book_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_word_progress_user ON word_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_book ON word_progress (book_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_status ON word_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_word_progress_review ON word_progress (user_id, next_review_at);

-- RLS
ALTER TABLE word_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
    ON word_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress"
    ON word_progress FOR ALL
    USING (auth.uid() = user_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_word_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_word_progress_updated_at
    BEFORE UPDATE ON word_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_word_progress_updated_at();

-- ============================================
-- 学习会话表 (可选，用于详细统计)
-- ============================================

CREATE TABLE IF NOT EXISTS word_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES word_books(id) ON DELETE SET NULL,
    
    -- 会话信息
    mode TEXT NOT NULL CHECK (mode IN ('recognize', 'spell', 'challenge')),
    total_words INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    wrong_count INT NOT NULL DEFAULT 0,
    max_combo INT NOT NULL DEFAULT 0,
    xp_earned INT NOT NULL DEFAULT 0,
    
    -- 时间
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_word_sessions_user ON word_sessions (user_id, started_at DESC);

-- RLS
ALTER TABLE word_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
    ON word_sessions FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- 注释
-- ============================================

COMMENT ON TABLE word_books IS '用户词库，包含内置词库和自定义词库';
COMMENT ON TABLE word_progress IS '单词学习进度，记录每个单词的掌握情况';
COMMENT ON TABLE word_sessions IS '学习会话记录，用于统计分析';

COMMENT ON COLUMN word_progress.review_stage IS '复习阶段: 0=新词, 1-5=复习中, 6=已掌握';
COMMENT ON COLUMN word_progress.next_review_at IS '基于 SM-2 简化算法计算的下次复习时间';

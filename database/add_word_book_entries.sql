-- =============================================================================
-- Migration: Add word_book_entries and parent policies
-- Purpose: Store static word list for each book, distinct from progress
-- =============================================================================

-- 1. Create word_book_entries table
CREATE TABLE IF NOT EXISTS word_book_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES word_books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Owner (child)
    
    -- Word Data
    word TEXT NOT NULL,
    phonetic_us TEXT,
    phonetic_uk TEXT,
    translations JSONB NOT NULL DEFAULT '[]', -- [{ "pos": "n.", "meaning": "..." }]
    sentences JSONB DEFAULT '[]',             -- [{ "en": "...", "zh": "..." }]
    
    line_number INT, -- Order in book
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_entries_book ON word_book_entries(book_id);
CREATE INDEX IF NOT EXISTS idx_entries_user ON word_book_entries(user_id);

-- 3. RLS
ALTER TABLE word_book_entries ENABLE ROW LEVEL SECURITY;

-- 3.1 Owner can view/manage
CREATE POLICY "Users can manage their own book entries"
    ON word_book_entries FOR ALL
    USING (auth.uid() = user_id);

-- 3.2 Parents can view/manage
CREATE POLICY "Parents can manage family book entries"
    ON word_book_entries FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM users u_parent
        JOIN users u_child ON u_parent.family_id = u_child.family_id
        WHERE u_parent.id = auth.uid() 
          AND u_parent.role = 'parent'
          AND u_child.id = word_book_entries.user_id
      )
    );

-- 4. Comment
COMMENT ON TABLE word_book_entries IS '词库中的单词条目';

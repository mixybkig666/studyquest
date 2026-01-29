-- =============================================================================
-- ULTIMATE FIX for 406 Not Acceptable 
-- Uses existing SECURITY DEFINER functions from supabase_setup.sql
-- =============================================================================

-- Step 1: Remove ALL existing policies on word_progress (clean slate)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'word_progress'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON word_progress', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create simple, non-recursive policies using existing functions
-- These use get_my_children_ids() and is_parent() which are already SECURITY DEFINER

-- Policy for users managing their own progress
CREATE POLICY "word_progress_user_all" ON word_progress
    FOR ALL USING (auth.uid() = user_id);

-- Policy for parents managing children's progress  
CREATE POLICY "word_progress_parent_all" ON word_progress
    FOR ALL USING (user_id = ANY(get_my_children_ids()) AND is_parent());

-- Step 3: Same for word_sessions
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'word_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON word_sessions', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "word_sessions_user_all" ON word_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "word_sessions_parent_all" ON word_sessions
    FOR ALL USING (user_id = ANY(get_my_children_ids()) AND is_parent());

-- Step 4: Same for word_books
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'word_books'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON word_books', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "word_books_user_all" ON word_books
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "word_books_parent_all" ON word_books
    FOR ALL USING (user_id = ANY(get_my_children_ids()) AND is_parent());

-- Step 5: Same for word_book_entries
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'word_book_entries'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON word_book_entries', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "word_book_entries_user_all" ON word_book_entries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "word_book_entries_parent_all" ON word_book_entries
    FOR ALL USING (user_id = ANY(get_my_children_ids()) AND is_parent());

-- Done! Verify by checking policies:
-- SELECT * FROM pg_policies WHERE tablename IN ('word_progress', 'word_sessions', 'word_books', 'word_book_entries');

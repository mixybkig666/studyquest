-- =============================================================================
-- DEBUG FIX: Completely disable and re-enable RLS with extremely simple policies
-- This is a nuclear option to diagnose the 406 error
-- =============================================================================

-- Step 1: DISABLE RLS entirely on word tables (for testing)
ALTER TABLE word_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE word_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE word_books DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on these tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename FROM pg_policies 
        WHERE tablename IN ('word_progress', 'word_sessions', 'word_books', 'word_book_entries')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_books ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ultra-simple policies that CANNOT cause recursion
-- For word_progress: Allow authenticated users full access (temporary for debugging)
CREATE POLICY "word_progress_full_access" ON word_progress
    FOR ALL USING (auth.uid() IS NOT NULL);

-- For word_sessions: Same
CREATE POLICY "word_sessions_full_access" ON word_sessions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- For word_books: Same
CREATE POLICY "word_books_full_access" ON word_books
    FOR ALL USING (auth.uid() IS NOT NULL);

-- For word_book_entries (if exists):
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'word_book_entries') THEN
        ALTER TABLE word_book_entries ENABLE ROW LEVEL SECURITY;
        EXECUTE 'CREATE POLICY "word_book_entries_full_access" ON word_book_entries FOR ALL USING (auth.uid() IS NOT NULL)';
    END IF;
END $$;

-- After running this, TEST the app. If 406 is gone, the problem was RLS policies.
-- Then we can gradually add back proper restrictions.

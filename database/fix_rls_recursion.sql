-- =============================================================================
-- FIX 406 Not Acceptable (Infinite Recursion) in RLS
-- Use SECURITY DEFINER function to break the recursion loop when querying users table
-- =============================================================================

-- 1. Create a secure helper function to check parent relationship
-- This function runs with the privileges of the creator (superuser), bypassing RLS on 'users'
CREATE OR REPLACE FUNCTION check_is_parent_of(child_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users u_parent
    JOIN users u_child ON u_parent.family_id = u_child.family_id
    WHERE u_parent.id = auth.uid() 
      AND u_parent.role = 'parent'
      AND u_child.id = child_uuid
  );
$$;

-- 2. Update Policies to use the safe function

-- A. word_progress
DROP POLICY IF EXISTS "Parents can manage family progress" ON word_progress;
CREATE POLICY "Parents can manage family progress" ON word_progress
  FOR ALL USING (
    check_is_parent_of(user_id)
  );

-- B. word_sessions
DROP POLICY IF EXISTS "Parents can manage family sessions" ON word_sessions;
CREATE POLICY "Parents can manage family sessions" ON word_sessions
  FOR ALL USING (
    check_is_parent_of(user_id)
  );

-- C. word_books (Also fix this just in case)
DROP POLICY IF EXISTS "Parents can manage family books" ON word_books;
CREATE POLICY "Parents can manage family books" ON word_books
  FOR ALL USING (
    check_is_parent_of(user_id)
  );

-- D. word_book_entries (Also fix this just in case)
DROP POLICY IF EXISTS "Parents can manage family entries" ON word_book_entries;
CREATE POLICY "Parents can manage family entries" ON word_book_entries
  FOR ALL USING (
    check_is_parent_of(user_id)
  );

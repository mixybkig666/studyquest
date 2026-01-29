-- =============================================================================
-- FINAL FIX for 406 Not Acceptable (Infinite Recursion)
-- Strategy: Nuke all related policies and use a fresh v2 security definer function
-- =============================================================================

-- 1. Defensively drop ALL possible existing policies on word_progress
-- (Include any name we might have used in the past)
DROP POLICY IF EXISTS "Users can manage their own progress" ON word_progress;
DROP POLICY IF EXISTS "Parents can manage family progress" ON word_progress;
DROP POLICY IF EXISTS "Enable read access for all users" ON word_progress;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON word_progress;

-- 2. Create a FRESH v2 helper function to avoid any caching or naming conflicts
-- SECURITY DEFINER is the key: it runs as superuser, bypassing RLS checks on 'users'
CREATE OR REPLACE FUNCTION check_is_parent_v2(child_uuid UUID)
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

-- 3. Re-apply policies using the v2 function

-- A. For the child (owner) - keep it simple
CREATE POLICY "Users can manage their own progress" ON word_progress
    FOR ALL USING (auth.uid() = user_id);

-- B. For the parent - use the secure v2 function
CREATE POLICY "Parents can manage family progress" ON word_progress
    FOR ALL USING (check_is_parent_v2(user_id));


-- 4. Apply same fix to word_sessions just to be safe
DROP POLICY IF EXISTS "Users can manage their own sessions" ON word_sessions;
DROP POLICY IF EXISTS "Parents can manage family sessions" ON word_sessions;

CREATE POLICY "Users can manage their own sessions" ON word_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can manage family sessions" ON word_sessions
    FOR ALL USING (check_is_parent_v2(user_id));

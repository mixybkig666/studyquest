-- =============================================================================
-- Migration: Allow Parents to Manage Word Progress & Sessions
-- Purpose: Enable parents to test or practice on behalf of their children
-- =============================================================================

-- 1. Policies for word_progress
DROP POLICY IF EXISTS "Parents can manage family progress" ON word_progress;

CREATE POLICY "Parents can manage family progress" ON word_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = word_progress.user_id
    )
  );

-- 2. Policies for word_sessions
DROP POLICY IF EXISTS "Parents can manage family sessions" ON word_sessions;

CREATE POLICY "Parents can manage family sessions" ON word_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = word_sessions.user_id
    )
  );

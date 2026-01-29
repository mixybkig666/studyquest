-- =============================================================================
-- RLS Policy Migration: Enable Parent Management
-- Allow parents to INSERT, UPDATE, and SELECT data for their children
-- Tables covered: error_attribution, emotion_record, task_feedback, word_progress, word_sessions
-- =============================================================================

-- 1. Error Attribution Policies
DROP POLICY IF EXISTS "Parents can insert family attribution" ON error_attribution;
CREATE POLICY "Parents can insert family attribution" ON error_attribution
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = error_attribution.user_id
    )
  );

DROP POLICY IF EXISTS "Parents can update family attribution" ON error_attribution;
CREATE POLICY "Parents can update family attribution" ON error_attribution
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = error_attribution.user_id
    )
  );

-- 2. Emotion Record Policies
DROP POLICY IF EXISTS "Parents can insert family emotion" ON emotion_record;
CREATE POLICY "Parents can insert family emotion" ON emotion_record
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = emotion_record.user_id
    )
  );

-- 3. Task Feedback Policies
DROP POLICY IF EXISTS "Parents can insert family feedback" ON task_feedback;
CREATE POLICY "Parents can insert family feedback" ON task_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = task_feedback.user_id
    )
  );

-- 4. Word Progress Policies (Missing Select for parents + Insert/Update)
DROP POLICY IF EXISTS "Parents can view family progress" ON word_progress;
CREATE POLICY "Parents can view family progress" ON word_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = word_progress.user_id
    )
  );

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

-- 5. Word Sessions Policies
DROP POLICY IF EXISTS "Parents can view family sessions" ON word_sessions;
CREATE POLICY "Parents can view family sessions" ON word_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = word_sessions.user_id
    )
  );

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

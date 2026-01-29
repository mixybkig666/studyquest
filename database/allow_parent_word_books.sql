-- =============================================================================
-- RLS Policy Migration: Enable Parent Management for Word Books
-- Allow parents to INSERT, UPDATE, and SELECT word books for their children
-- Table covered: word_books
-- =============================================================================

-- Drop existing policies if they conflict or need update
DROP POLICY IF EXISTS "Parents can manage family books" ON word_books;

-- Create comprehensive policy for parents
CREATE POLICY "Parents can manage family books" ON word_books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u_parent
      JOIN users u_child ON u_parent.family_id = u_child.family_id
      WHERE u_parent.id = auth.uid() 
        AND u_parent.role = 'parent'
        AND u_child.id = word_books.user_id
    )
  );

COMMENT ON TABLE word_books IS '用户词库，包含内置词库和自定义词库 (已启用家长管理)';

-- =============================================================================
-- 元认知反馈表
-- 收集学生对 AI 出题质量的评价，用于优化出题策略
-- =============================================================================

-- 创建反馈表
CREATE TABLE IF NOT EXISTS task_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES daily_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 总体评价
  overall_rating TEXT NOT NULL CHECK (overall_rating IN ('great', 'ok', 'bad')),
  
  -- 正向标签（多选）
  -- targeted: 精准, challenge: 适度, insight: 启发, clear: 清晰
  positive_tags TEXT[] DEFAULT '{}',
  
  -- 负向标签（多选）
  -- too_easy: 太简单, too_hard: 太难, irrelevant: 不相关, buggy: 有错误
  negative_tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- 每个任务每个用户只能提交一次反馈
  UNIQUE(task_id, user_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_task_feedback_user_id ON task_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_task_id ON task_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_rating ON task_feedback(overall_rating);
CREATE INDEX IF NOT EXISTS idx_task_feedback_created_at ON task_feedback(created_at DESC);

-- RLS 策略
ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和创建自己的反馈
CREATE POLICY "Users can view own feedback" ON task_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON task_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 家长可以查看孩子的反馈（用于周报统计）
CREATE POLICY "Parents can view family feedback" ON task_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.family_id = u2.family_id
      WHERE u1.id = auth.uid() 
        AND u1.role = 'parent'
        AND u2.id = task_feedback.user_id
    )
  );

-- =============================================================================
-- 使用说明：
-- 1. 在 Supabase Dashboard 中执行此 SQL
-- 2. 前端通过 feedbackService.ts 调用
-- =============================================================================

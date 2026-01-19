-- ===================================================
-- 知识点掌握情况追踪表
-- 用于实现艾宾浩斯遗忘曲线复习机制
-- ===================================================

-- 用户知识点掌握情况表
CREATE TABLE IF NOT EXISTS knowledge_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 知识点信息（不单独建知识点表，直接用名称标识）
  knowledge_point_name TEXT NOT NULL,
  subject TEXT,  -- 学科：math, chinese, english, science
  
  -- 掌握情况统计
  total_attempts INT DEFAULT 0,          -- 总尝试次数
  correct_count INT DEFAULT 0,           -- 正确次数
  mastery_level INT DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 3),
  -- 0=未学习, 1=初步了解, 2=基本掌握, 3=熟练掌握
  
  -- 艾宾浩斯复习
  last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),    -- 上次复习时间
  next_review_at TIMESTAMPTZ,                     -- 下次建议复习时间
  review_count INT DEFAULT 0,                     -- 复习次数
  consecutive_correct INT DEFAULT 0,              -- 连续正确次数
  
  -- 错误类型统计
  error_concept_count INT DEFAULT 0,      -- 概念错误次数
  error_calculation_count INT DEFAULT 0,  -- 计算错误次数
  error_reading_count INT DEFAULT 0,      -- 审题错误次数
  error_careless_count INT DEFAULT 0,     -- 粗心错误次数
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 同一用户对同一知识点只有一条记录
  UNIQUE(user_id, knowledge_point_name)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_km_user_id ON knowledge_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_km_next_review ON knowledge_mastery(next_review_at);
CREATE INDEX IF NOT EXISTS idx_km_mastery_level ON knowledge_mastery(mastery_level);
CREATE INDEX IF NOT EXISTS idx_km_subject ON knowledge_mastery(subject);

-- RLS 策略
ALTER TABLE knowledge_mastery ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的知识点掌握情况
CREATE POLICY "Users can view own mastery"
  ON knowledge_mastery FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mastery"
  ON knowledge_mastery FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mastery"
  ON knowledge_mastery FOR UPDATE
  USING (user_id = auth.uid());

-- 父母可以查看孩子的知识点掌握情况
CREATE POLICY "Parents can view children mastery"
  ON knowledge_mastery FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users parent
      JOIN users child ON parent.family_id = child.family_id
      WHERE parent.id = auth.uid()
        AND parent.role = 'parent'
        AND child.id = knowledge_mastery.user_id
    )
  );

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_km_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_km_updated_at
  BEFORE UPDATE ON knowledge_mastery
  FOR EACH ROW
  EXECUTE FUNCTION update_km_updated_at();

-- ===================================================
-- 辅助函数：更新或插入知识点掌握情况
-- ===================================================
CREATE OR REPLACE FUNCTION upsert_knowledge_mastery(
  p_user_id UUID,
  p_knowledge_point_name TEXT,
  p_subject TEXT,
  p_is_correct BOOLEAN,
  p_error_type TEXT DEFAULT NULL
)
RETURNS knowledge_mastery
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result knowledge_mastery;
  v_review_intervals INT[] := ARRAY[1, 2, 4, 7, 15, 30];
  v_new_consecutive INT;
  v_new_correct INT;
  v_new_attempts INT;
  v_new_review_count INT;
  v_new_mastery INT;
  v_next_review TIMESTAMPTZ;
BEGIN
  -- 尝试获取现有记录
  SELECT * INTO v_result FROM knowledge_mastery
  WHERE user_id = p_user_id AND knowledge_point_name = p_knowledge_point_name;
  
  IF v_result IS NULL THEN
    -- 新记录
    v_new_consecutive := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
    v_new_correct := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
    v_new_attempts := 1;
    v_new_review_count := 1;
    v_new_mastery := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
    v_next_review := NOW() + INTERVAL '1 day';
    
    INSERT INTO knowledge_mastery (
      user_id, knowledge_point_name, subject,
      total_attempts, correct_count, mastery_level,
      last_reviewed_at, next_review_at, review_count, consecutive_correct
    ) VALUES (
      p_user_id, p_knowledge_point_name, p_subject,
      v_new_attempts, v_new_correct, v_new_mastery,
      NOW(), v_next_review, v_new_review_count, v_new_consecutive
    )
    RETURNING * INTO v_result;
  ELSE
    -- 更新现有记录
    v_new_consecutive := CASE WHEN p_is_correct THEN v_result.consecutive_correct + 1 ELSE 0 END;
    v_new_correct := v_result.correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END;
    v_new_attempts := v_result.total_attempts + 1;
    v_new_review_count := v_result.review_count + 1;
    
    -- 计算掌握程度
    IF v_new_correct::FLOAT / v_new_attempts > 0.85 AND v_new_consecutive >= 3 THEN
      v_new_mastery := 3;  -- 熟练掌握
    ELSIF v_new_correct::FLOAT / v_new_attempts >= 0.6 THEN
      v_new_mastery := 2;  -- 基本掌握
    ELSE
      v_new_mastery := 1;  -- 初步了解
    END IF;
    
    -- 计算下次复习时间
    v_next_review := NOW() + (v_review_intervals[LEAST(v_new_review_count, 6)] || ' days')::INTERVAL;
    
    UPDATE knowledge_mastery SET
      total_attempts = v_new_attempts,
      correct_count = v_new_correct,
      mastery_level = v_new_mastery,
      last_reviewed_at = NOW(),
      next_review_at = v_next_review,
      review_count = v_new_review_count,
      consecutive_correct = v_new_consecutive,
      subject = COALESCE(p_subject, subject),
      -- 更新错误类型计数
      error_concept_count = error_concept_count + CASE WHEN p_error_type = 'concept' THEN 1 ELSE 0 END,
      error_calculation_count = error_calculation_count + CASE WHEN p_error_type = 'calculation' THEN 1 ELSE 0 END,
      error_reading_count = error_reading_count + CASE WHEN p_error_type = 'reading' THEN 1 ELSE 0 END,
      error_careless_count = error_careless_count + CASE WHEN p_error_type = 'careless' THEN 1 ELSE 0 END
    WHERE id = v_result.id
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

-- ===================================================
-- 辅助函数：获取用户需要复习的知识点
-- ===================================================
CREATE OR REPLACE FUNCTION get_review_due_points(p_user_id UUID)
RETURNS SETOF knowledge_mastery
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM knowledge_mastery
  WHERE user_id = p_user_id
    AND next_review_at <= NOW()
  ORDER BY mastery_level ASC, next_review_at ASC
  LIMIT 10;
$$;

-- ===================================================
-- 辅助函数：获取用户薄弱知识点
-- ===================================================
CREATE OR REPLACE FUNCTION get_weak_points(p_user_id UUID)
RETURNS SETOF knowledge_mastery
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM knowledge_mastery
  WHERE user_id = p_user_id
    AND mastery_level <= 1
    AND total_attempts >= 2
  ORDER BY (correct_count::FLOAT / NULLIF(total_attempts, 0)) ASC
  LIMIT 10;
$$;

-- ===================================================
-- 辅助函数：获取知识点掌握汇总
-- ===================================================
CREATE OR REPLACE FUNCTION get_mastery_summary(p_user_id UUID)
RETURNS TABLE (
  total_points INT,
  mastered_count INT,
  learning_count INT,
  weak_count INT,
  review_due_count INT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)::INT as total_points,
    COUNT(*) FILTER (WHERE mastery_level >= 2)::INT as mastered_count,
    COUNT(*) FILTER (WHERE mastery_level = 1)::INT as learning_count,
    COUNT(*) FILTER (WHERE mastery_level <= 1 AND total_attempts >= 2)::INT as weak_count,
    COUNT(*) FILTER (WHERE next_review_at <= NOW())::INT as review_due_count
  FROM knowledge_mastery
  WHERE user_id = p_user_id;
$$;

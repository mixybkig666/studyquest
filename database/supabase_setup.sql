-- ============================================
-- StudyQuest Supabase Setup Script
-- 精简版部署脚本 - 包含核心表结构和RLS策略
-- ============================================

-- ============================================
-- 1. 辅助函数（避免RLS递归）
-- ============================================

-- 获取当前用户的 family_id（使用 SECURITY DEFINER 避免递归）
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 检查当前用户是否为家长
CREATE OR REPLACE FUNCTION is_parent()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'parent'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 获取当前家庭的所有孩子ID
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id) FROM users 
  WHERE family_id = get_my_family_id() AND role = 'child'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 2. 核心表结构
-- ============================================

-- 家庭表
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表（家长和孩子）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'child')),
    avatar_url TEXT,
    -- 孩子专属字段
    total_xp INTEGER DEFAULT 0,
    available_xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    grade_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学习资料表
CREATE TABLE IF NOT EXISTS learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(50) NOT NULL CHECK (subject IN ('math', 'chinese', 'english', 'science', 'reading', 'other')),
    material_type VARCHAR(20) NOT NULL CHECK (material_type IN ('textbook', 'temporary', 'book')),
    grade VARCHAR(20),
    unit_number INTEGER,
    unit_name VARCHAR(100),
    file_url TEXT,
    file_type VARCHAR(50),
    file_size INTEGER,
    is_temporary BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    extracted_content JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 测试题目表
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES learning_materials(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('choice', 'fill', 'true_false', 'short_answer', 'correction')),
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    is_anchor_question BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    order_index INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日任务表
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    material_id UUID REFERENCES learning_materials(id),
    task_date DATE NOT NULL DEFAULT CURRENT_DATE,
    task_type VARCHAR(20) NOT NULL CHECK (task_type IN ('quiz', 'reading', 'review')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    question_ids UUID[],
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    xp_reward INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    time_reward_tablet INTEGER DEFAULT 0,
    time_reward_outdoor INTEGER DEFAULT 0,
    score INTEGER,
    reading_duration_goal INTEGER,
    actual_reading_duration INTEGER,
    reading_reflection TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, task_date, material_id)
);

-- 答题记录表
CREATE TABLE IF NOT EXISTS answer_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES daily_tasks(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    time_spent_seconds INTEGER,
    self_confidence VARCHAR(20) CHECK (self_confidence IN ('know', 'fuzzy', 'unknown')),
    reflection TEXT,
    self_check_accurate BOOLEAN,
    ai_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日进度统计表
CREATE TABLE IF NOT EXISTS daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks_completed INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    self_check_accuracy DECIMAL(5,2),
    xp_earned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, progress_date)
);

-- 奖励定义表
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('screen_time', 'outdoor', 'special', 'custom')),
    cost_xp INTEGER NOT NULL,
    time_minutes INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 奖励兑换记录
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
    reward_name VARCHAR(100),
    xp_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 奖励配置表（每个家庭一条记录）
CREATE TABLE IF NOT EXISTS reward_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
    base_tablet INTEGER DEFAULT 15,
    base_outdoor INTEGER DEFAULT 30,
    max_tablet INTEGER DEFAULT 120,
    max_outdoor INTEGER DEFAULT 240,
    allocation_ratio DECIMAL(3,2) DEFAULT 0.20,
    xp_to_minute_rate INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_learning_materials_family ON learning_materials(family_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_subject ON learning_materials(subject);
CREATE INDEX IF NOT EXISTS idx_questions_material ON questions(material_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_answer_records_user ON answer_records(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_records_task ON answer_records(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, progress_date);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_family ON rewards(family_id);

-- ============================================
-- 4. 启用 RLS
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS 策略
-- ============================================

-- === Families ===
CREATE POLICY "Users can view own family" ON families
    FOR SELECT USING (id = get_my_family_id());

CREATE POLICY "Authenticated users can insert family" ON families
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Parents can update own family" ON families
    FOR UPDATE USING (id = get_my_family_id() AND is_parent());

-- === Users ===
CREATE POLICY "Users can view family members" ON users
    FOR SELECT USING (family_id = get_my_family_id());

CREATE POLICY "Authenticated users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid() OR (family_id = get_my_family_id() AND is_parent()));

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Parents can update children" ON users
    FOR UPDATE USING (family_id = get_my_family_id() AND is_parent());

-- === Learning Materials ===
CREATE POLICY "Users can view family materials" ON learning_materials
    FOR SELECT USING (family_id = get_my_family_id());

CREATE POLICY "Parents can manage materials" ON learning_materials
    FOR ALL USING (family_id = get_my_family_id() AND is_parent());

CREATE POLICY "Children can insert temporary materials" ON learning_materials
    FOR INSERT WITH CHECK (
        family_id = get_my_family_id() 
        AND material_type = 'temporary' 
        AND created_by = auth.uid()
    );

-- === Questions ===
CREATE POLICY "Users can view family questions" ON questions
    FOR SELECT USING (
        material_id IN (SELECT id FROM learning_materials WHERE family_id = get_my_family_id())
    );

CREATE POLICY "Parents can manage questions" ON questions
    FOR ALL USING (
        material_id IN (SELECT id FROM learning_materials WHERE family_id = get_my_family_id())
        AND is_parent()
    );

-- === Daily Tasks ===
CREATE POLICY "Users can view own tasks" ON daily_tasks
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can view children tasks" ON daily_tasks
    FOR SELECT USING (user_id = ANY(get_my_children_ids()) AND is_parent());

CREATE POLICY "Users can manage own tasks" ON daily_tasks
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Parents can manage children tasks" ON daily_tasks
    FOR ALL USING (user_id = ANY(get_my_children_ids()) AND is_parent());

-- === Answer Records ===
CREATE POLICY "Users can view own answers" ON answer_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can view children answers" ON answer_records
    FOR SELECT USING (user_id = ANY(get_my_children_ids()) AND is_parent());

CREATE POLICY "Users can insert own answers" ON answer_records
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own answers" ON answer_records
    FOR UPDATE USING (user_id = auth.uid());

-- === Daily Progress ===
CREATE POLICY "Users can view own progress" ON daily_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can view children progress" ON daily_progress
    FOR SELECT USING (user_id = ANY(get_my_children_ids()) AND is_parent());

CREATE POLICY "Users can manage own progress" ON daily_progress
    FOR ALL USING (user_id = auth.uid());

-- === Rewards ===
CREATE POLICY "Users can view family rewards" ON rewards
    FOR SELECT USING (family_id = get_my_family_id());

CREATE POLICY "Parents can manage rewards" ON rewards
    FOR ALL USING (family_id = get_my_family_id() AND is_parent());

-- === Reward Redemptions ===
CREATE POLICY "Users can view own redemptions" ON reward_redemptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can view family redemptions" ON reward_redemptions
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
        AND is_parent()
    );

CREATE POLICY "Users can insert own redemptions" ON reward_redemptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own redemptions" ON reward_redemptions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Parents can update family redemptions" ON reward_redemptions
    FOR UPDATE USING (
        user_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
        AND is_parent()
    );

-- === Reward Configs ===
CREATE POLICY "Users can view family reward config" ON reward_configs
    FOR SELECT USING (family_id = get_my_family_id());

CREATE POLICY "Parents can manage reward config" ON reward_configs
    FOR ALL USING (family_id = get_my_family_id() AND is_parent());

-- ============================================
-- 6. 触发器：自动更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_materials_updated_at BEFORE UPDATE ON learning_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_tasks_updated_at BEFORE UPDATE ON daily_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_progress_updated_at BEFORE UPDATE ON daily_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_configs_updated_at BEFORE UPDATE ON reward_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. RPC 函数（用于复杂操作）
-- ============================================

-- 注册新用户并创建家庭
CREATE OR REPLACE FUNCTION register_parent(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_family_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_family_id UUID;
    v_result JSON;
BEGIN
    -- 创建家庭
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;
    
    -- 创建用户
    INSERT INTO users (id, family_id, email, name, role)
    VALUES (p_user_id, v_family_id, p_email, p_name, 'parent');
    
    -- 创建默认奖励配置
    INSERT INTO reward_configs (family_id) VALUES (v_family_id);
    
    -- 创建默认奖励
    INSERT INTO rewards (family_id, name, icon, reward_type, cost_xp, time_minutes) VALUES
        (v_family_id, '看30分钟电视', '📺', 'screen_time', 300, 30),
        (v_family_id, '户外玩耍1小时', '🌳', 'outdoor', 200, 60),
        (v_family_id, '选择今日晚餐', '🍽️', 'special', 500, NULL);
    
    SELECT json_build_object(
        'success', true,
        'family_id', v_family_id,
        'user_id', p_user_id
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加孩子到家庭
CREATE OR REPLACE FUNCTION add_child_to_family(
    p_name TEXT,
    p_avatar_url TEXT DEFAULT NULL,
    p_grade_level INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_family_id UUID;
    v_child_id UUID;
    v_result JSON;
BEGIN
    -- 检查是否为家长
    IF NOT is_parent() THEN
        RETURN json_build_object('success', false, 'error', '只有家长可以添加孩子');
    END IF;
    
    v_family_id := get_my_family_id();
    v_child_id := gen_random_uuid();
    
    INSERT INTO users (id, family_id, name, role, avatar_url, grade_level)
    VALUES (v_child_id, v_family_id, p_name, 'child', p_avatar_url, p_grade_level);
    
    SELECT json_build_object(
        'success', true,
        'child_id', v_child_id
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完成任务并更新XP
CREATE OR REPLACE FUNCTION complete_task(
    p_task_id UUID,
    p_score INTEGER,
    p_xp_earned INTEGER,
    p_tablet_minutes INTEGER DEFAULT 0,
    p_outdoor_minutes INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- 获取任务所属用户
    SELECT user_id INTO v_user_id FROM daily_tasks WHERE id = p_task_id;
    
    -- 验证权限
    IF v_user_id != auth.uid() AND NOT (v_user_id = ANY(get_my_children_ids()) AND is_parent()) THEN
        RETURN json_build_object('success', false, 'error', '无权限操作此任务');
    END IF;
    
    -- 更新任务
    UPDATE daily_tasks SET
        status = 'completed',
        completed_at = NOW(),
        score = p_score,
        xp_earned = p_xp_earned,
        time_reward_tablet = p_tablet_minutes,
        time_reward_outdoor = p_outdoor_minutes
    WHERE id = p_task_id;
    
    -- 更新用户XP
    UPDATE users SET
        total_xp = total_xp + p_xp_earned,
        available_xp = available_xp + p_xp_earned,
        last_active_date = CURRENT_DATE
    WHERE id = v_user_id;
    
    SELECT json_build_object(
        'success', true,
        'task_id', p_task_id
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 兑换奖励
CREATE OR REPLACE FUNCTION redeem_reward(
    p_reward_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_cost INTEGER;
    v_reward_name TEXT;
    v_available_xp INTEGER;
    v_redemption_id UUID;
    v_result JSON;
BEGIN
    -- 获取奖励信息
    SELECT cost_xp, name INTO v_cost, v_reward_name 
    FROM rewards WHERE id = p_reward_id AND is_active = true;
    
    IF v_cost IS NULL THEN
        RETURN json_build_object('success', false, 'error', '奖励不存在或已下架');
    END IF;
    
    -- 检查用户XP
    SELECT available_xp INTO v_available_xp FROM users WHERE id = auth.uid();
    
    IF v_available_xp < v_cost THEN
        RETURN json_build_object('success', false, 'error', 'XP不足');
    END IF;
    
    -- 创建兑换记录
    INSERT INTO reward_redemptions (user_id, reward_id, reward_name, xp_spent)
    VALUES (auth.uid(), p_reward_id, v_reward_name, v_cost)
    RETURNING id INTO v_redemption_id;
    
    -- 扣除XP
    UPDATE users SET available_xp = available_xp - v_cost WHERE id = auth.uid();
    
    SELECT json_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'remaining_xp', v_available_xp - v_cost
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 家长审批兑换
CREATE OR REPLACE FUNCTION approve_redemption(
    p_redemption_id UUID,
    p_approved BOOLEAN
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_xp_spent INTEGER;
    v_result JSON;
BEGIN
    IF NOT is_parent() THEN
        RETURN json_build_object('success', false, 'error', '只有家长可以审批');
    END IF;
    
    -- 获取兑换信息
    SELECT user_id, xp_spent INTO v_user_id, v_xp_spent
    FROM reward_redemptions WHERE id = p_redemption_id AND status = 'pending';
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', '兑换记录不存在或已处理');
    END IF;
    
    -- 检查是否为本家庭成员
    IF v_user_id NOT IN (SELECT id FROM users WHERE family_id = get_my_family_id()) THEN
        RETURN json_build_object('success', false, 'error', '无权限处理此兑换');
    END IF;
    
    IF p_approved THEN
        UPDATE reward_redemptions SET
            status = 'approved',
            approved_by = auth.uid(),
            approved_at = NOW()
        WHERE id = p_redemption_id;
    ELSE
        -- 拒绝则退还XP
        UPDATE reward_redemptions SET status = 'rejected' WHERE id = p_redemption_id;
        UPDATE users SET available_xp = available_xp + v_xp_spent WHERE id = v_user_id;
    END IF;
    
    SELECT json_build_object(
        'success', true,
        'status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 怪物遇到记录表
-- 记录学生遇到的错误类型（怪物），用于怪物图鉴功能

CREATE TABLE IF NOT EXISTS monster_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 怪物类型（错误类型）
    monster_type TEXT NOT NULL,
    
    -- 遇到次数
    encounter_count INT NOT NULL DEFAULT 1,
    
    -- 最后遇到时间
    last_encounter_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 学生写的对策
    countermeasure TEXT,
    
    -- 是否已驯服（30天未遇到）
    is_tamed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 唯一约束：每个用户的每种怪物只有一条记录
    UNIQUE (user_id, monster_type)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_monster_user ON monster_encounters (user_id);
CREATE INDEX IF NOT EXISTS idx_monster_type ON monster_encounters (monster_type);

-- 启用 RLS
ALTER TABLE monster_encounters ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own monster encounters"
    ON monster_encounters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monster encounters"
    ON monster_encounters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monster encounters"
    ON monster_encounters FOR UPDATE
    USING (auth.uid() = user_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_monster_encounters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monster_encounters_updated_at
    BEFORE UPDATE ON monster_encounters
    FOR EACH ROW
    EXECUTE FUNCTION update_monster_encounters_updated_at();

-- 注释
COMMENT ON TABLE monster_encounters IS '学生遇到的错误类型（怪物）记录，用于怪物图鉴';
COMMENT ON COLUMN monster_encounters.monster_type IS '怪物类型：concept/calculation/reading/careless等';
COMMENT ON COLUMN monster_encounters.encounter_count IS '累计遇到次数';
COMMENT ON COLUMN monster_encounters.is_tamed IS '是否已驯服（30天未遇到自动标记为true）';

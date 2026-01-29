-- Add countermeasure column to error_attribution table
ALTER TABLE error_attribution ADD COLUMN IF NOT EXISTS countermeasure TEXT;

-- Add description for the new column
COMMENT ON COLUMN error_attribution.countermeasure IS '学生针对此错误的应对措施/反思';

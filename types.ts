

export type Role = 'parent' | 'child';

export interface User {
  id: string;
  family_id: string;
  name: string;
  email?: string;
  role: Role;
  avatar_url?: string;
  total_xp?: number; // 累计总经验（用于等级）
  available_xp?: number; // 可用于兑换的积分（钱包）
  streak_days?: number;
  grade_level?: number;
  active_wish_id?: string;

  // 新增：孩子端的详细统计数据缓存
  stats?: {
    books_read: number;
    tasks_completed: number;
    monsters_defeated: number; // = total questions answered
    words_read: number;
    // 详细历史记录
    recent_books: { title: string; completed_at: string; duration: number }[];
    recent_achievements: { title: string; score: number; completed_at: string; tags: string[] }[];
    // 新增：错题本
    recent_mistakes: {
      id: string;
      question: string;
      wrong_answer: string;
      correct_answer: string;
      explanation?: string;
      seen_at: string;
    }[];
  }
}

export interface Attachment {
  name: string;
  type: string;
  data: string;
}

export interface AIAnalysis {
  subject: string;
  topic: string;
  difficulty_level: string;
  core_competencies: string[];
  summary: string;
}

export interface RepositoryItem {
  id: string;
  title: string;
  subject: string;
  description?: string;
  attachments: Attachment[];
  created_at: string;
  total_units?: number;
  processed: boolean;
  usage_count?: number;
  average_score?: number;
  last_used_at?: string;
}

export interface Book {
  id: string;
  title: string;
  status: 'in_progress' | 'completed';
  total_minutes_read: number;
  last_read_at: string;
  cover_color?: string;
}

export interface CustomReward {
  id: string;
  name: string;
  cost_xp: number;
  icon?: string;
  is_active: boolean;
  description?: string;
  reward_type?: 'screen_time' | 'outdoor' | 'special' | 'custom';
  time_minutes?: number;
}

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  reward_name: string;
  cost_xp: number;
  status: 'pending' | 'approved' | 'fulfilled';
  created_at: string;
}

export interface LearningMaterial {
  id: string;
  title: string;
  subject: 'math' | 'chinese' | 'english' | 'science' | 'other' | 'reading';
  material_type: 'textbook' | 'temporary' | 'book';
  repository_id?: string;
  is_temporary: boolean;
  ai_analysis?: AIAnalysis;
  description?: string;
  extracted_content?: any;
}

export interface AnswerExpected {
  mode: 'text' | 'number' | 'open_ended';
  value: string | number;
  unit?: string;
  tolerance?: number;
  synonyms?: string[];
  // 开放式题目的评判维度提示
  evaluation_hints?: string[];
}

export interface Question {
  id: string;
  question_text: string;
  question_type: 'choice' | 'fill' | 'true_false' | 'short_answer' | 'correction' | 'open_ended';
  options?: string[];
  correct_answer: string;
  expected?: AnswerExpected;
  explanation?: string;
  tags?: string[];
  score_value?: number;
  difficulty_tag?: string;
  // 语文题目专项标签
  chinese_skill?: 'rhetoric' | 'word_meaning' | 'character_analysis' | 'author_intent' | 'summary' | 'open_reflection';
  // 英语题目专项标签
  english_skill?: 'grammar_3rd_person' | 'grammar_there_be' | 'sentence_transform' | 'spelling' | 'reading';
  // 知识点标签（用于追踪掌握情况）
  knowledge_points?: string[];
  // 常见错误类型（用于错误诊断）
  common_mistakes?: {
    type: 'concept' | 'calculation' | 'reading' | 'careless';
    description: string;
  }[];

  user_result?: {
    user_answer: string | number;
    is_correct: boolean;
    ai_feedback?: string;
    // 开放式题目的 AI 评判结果
    open_ended_result?: OpenEndedResult;
  };
}

// 开放式题目的 AI 评判结果
export interface OpenEndedResult {
  score: number;              // 0-100 分
  feedback: string;           // 鼓励性反馈
  sample_answer: string;      // AI 生成的优质示范答案
  improvement_tips: string[]; // 改进建议
  strengths: string[];        // 回答中的亮点
}

export interface DailyTask {
  id: string;
  user_id?: string;  // 任务所属用户
  task_type: 'quiz' | 'reading';
  task_date: string;
  material_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  xp_reward: number;
  time_reward_tablet: number;
  time_reward_outdoor: number;

  learning_material?: LearningMaterial;
  reading_material?: {
    title: string;
    content: string;
    source_style?: 'BBC' | 'RAZ' | 'ScienceDaily' | 'Story';
  };

  question_ids?: string[];
  questions?: Question[];
  score?: number;

  related_book_id?: string;
  reading_duration_goal?: number;
  actual_reading_duration?: number;
  reading_reflection?: string;

  completed_at?: string;
  started_at?: string;
}

export interface RewardConfig {
  base_tablet: number; // 每日基础平板时长 (分钟)
  base_outdoor: number; // 每日基础户外时长 (分钟)
  allocation_ratio: number; // XP分配给心愿金的比例 (0-1, 默认0.2)
  xp_to_minute_rate: number; // 多少XP自动转化为1分钟时长 (例如 10XP = 1min)
  max_tablet?: number; // 可选：每日平板时长上限
  max_outdoor?: number; // 可选：每日户外时长上限
}

export interface AppState {
  currentUser: User | null;
  currentView: 'role-select' | 'child-dashboard' | 'parent-dashboard' | 'quest-mode' | 'reward-shop' | 'immersive-reading';
  isLoading: boolean;
}

// ===== 知识点追踪系统 =====

export interface KnowledgePoint {
  id: string;
  subject: string;           // 学科
  name: string;              // 知识点名称，如"速度公式"
  grade_level: number;       // 适用年级
  parent_id?: string;        // 父级知识点
  tags: string[];            // 标签
}

export interface KnowledgeMastery {
  user_id: string;
  knowledge_point_id: string;
  knowledge_point_name: string;

  // 掌握情况统计
  total_attempts: number;        // 总尝试次数
  correct_count: number;         // 正确次数
  mastery_level: 0 | 1 | 2 | 3;  // 0=未学习, 1=初步了解, 2=基本掌握, 3=熟练掌握

  // 艾宾浩斯复习
  last_reviewed_at: string;      // 上次复习时间
  next_review_at: string;        // 下次建议复习时间
  review_count: number;          // 复习次数
  consecutive_correct: number;   // 连续正确次数

  // 错误分析
  common_error_types: {
    type: string;
    count: number;
  }[];
}

// 艾宾浩斯复习间隔（天数）
export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30];

// ===== 学习负担调度系统 =====

/** 家长设置的学期状态 */
export type LearningPeriod = 'school' | 'exam_prep' | 'vacation';

/** 资料类型 */
export type MaterialType =
  | 'completed_exam'      // 已完成试卷
  | 'blank_exam'          // 空白试卷
  | 'completed_homework'  // 已完成作业
  | 'blank_homework'      // 空白作业/练习
  | 'essay_prompt'        // 作文题目
  | 'student_essay'       // 学生写的作文
  | 'textbook_notes'      // 课本/笔记
  | 'review_summary';     // 复习资料

/** 生效的学习模式（时期 + 日期 计算得出） */
export type EffectiveMode =
  | 'daily_light'      // 上学期工作日 - 轻量诊断
  | 'weekend_review'   // 上学期周末 - 周末整理
  | 'exam_prep'        // 复习期 - 备考强化
  | 'vacation';        // 假期 - 深度学习

/** 前台输出模式 */
export type FrontMode =
  | 'no_learning'       // 今天不需要学习
  | 'micro_reminder'    // 微提醒（无题目）
  | 'feedback_only'     // 仅反馈（作文评析）
  | 'practice';         // 生成练习

/** 资料分析结果 */
export interface MaterialAnalysis {
  detected_type: MaterialType;
  subject: string;
  confidence: number;
  knowledge_points: string[];
  errors?: {
    question: string;
    wrong_answer: string;
    correct_answer: string;
    error_type: 'concept' | 'calculation' | 'careless' | 'reading';
  }[];
  essay_content?: string;
}

/** 学习决策结果 */
export interface LearningDecision {
  front_mode: FrontMode;
  question_count: number;
  should_save_to_memory: boolean;
  focus_message: string;
  parent_summary?: {
    why_this_decision: string;
    detected_risks: string[];
    next_suggested_check?: string;
  };
}

/** 周末整理汇总 */
export interface WeeklyReviewSummary {
  /** 本周新增的薄弱点 */
  weak_points: {
    knowledge_point: string;
    error_count: number;
    last_error_date: string;
    is_new: boolean; // 是否本周首次出错
  }[];
  /** 上周遗留未掌握的知识点（需持续复习） */
  carryover_points: {
    knowledge_point: string;
    weeks_unmastered: number; // 已持续几周未掌握
    last_error_date: string;
  }[];
  total_tasks_completed: number;
  suggested_practice_minutes: number;
}
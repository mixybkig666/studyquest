import { supabase } from './supabaseClient';
import { LearningMaterial, Question, RepositoryItem } from '../types';

// ===================================
// Learning Service - 学习资料和题目管理
// ===================================

export const learningService = {
    /**
     * 获取家庭学习资料列表
     */
    async getMaterials(options?: {
        subject?: string;
        type?: 'textbook' | 'temporary' | 'book';
        activeOnly?: boolean;
    }): Promise<LearningMaterial[]> {
        let query = supabase
            .from('learning_materials')
            .select('*')
            .order('created_at', { ascending: false });

        if (options?.subject) {
            query = query.eq('subject', options.subject);
        }
        if (options?.type) {
            query = query.eq('material_type', options.type);
        }
        if (options?.activeOnly !== false) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching materials:', error);
            return [];
        }

        return data as LearningMaterial[];
    },

    /**
     * 获取单个资料详情
     */
    async getMaterialById(materialId: string): Promise<LearningMaterial | null> {
        const { data, error } = await supabase
            .from('learning_materials')
            .select('*')
            .eq('id', materialId)
            .single();

        if (error) {
            console.error('Error fetching material:', error);
            return null;
        }

        return data as LearningMaterial;
    },

    /**
     * 创建学习资料
     */
    async createMaterial(material: {
        title: string;
        subject: 'math' | 'chinese' | 'english' | 'science' | 'reading' | 'other';
        materialType: 'textbook' | 'temporary' | 'book';
        description?: string;
        grade?: string;
        unitNumber?: number;
        unitName?: string;
        fileUrl?: string;
        fileType?: string;
        fileSize?: number;
        isTemporary?: boolean;
        extractedContent?: any;
    }): Promise<{ success: boolean; materialId?: string; error?: string }> {
        // Get family_id and user_id
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser.user) {
            return { success: false, error: '未登录' };
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('family_id')
            .eq('id', authUser.user.id)
            .single();

        if (userError || !userData) {
            return { success: false, error: '获取用户信息失败' };
        }

        const { data, error } = await supabase
            .from('learning_materials')
            .insert({
                family_id: userData.family_id,
                title: material.title,
                subject: material.subject,
                material_type: material.materialType,
                description: material.description,
                grade: material.grade,
                unit_number: material.unitNumber,
                unit_name: material.unitName,
                file_url: material.fileUrl,
                file_type: material.fileType,
                file_size: material.fileSize,
                is_temporary: material.isTemporary || false,
                extracted_content: material.extractedContent,
                created_by: authUser.user.id,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, materialId: data.id };
    },

    /**
     * 更新学习资料
     */
    async updateMaterial(materialId: string, updates: Partial<{
        title: string;
        description: string;
        isActive: boolean;
        extractedContent: any;
    }>): Promise<{ success: boolean; error?: string }> {
        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        if (updates.extractedContent !== undefined) updateData.extracted_content = updates.extractedContent;

        const { error } = await supabase
            .from('learning_materials')
            .update(updateData)
            .eq('id', materialId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 删除学习资料（软删除）
     */
    async deleteMaterial(materialId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('learning_materials')
            .update({ is_active: false })
            .eq('id', materialId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 获取资料的题目列表
     */
    async getQuestions(materialId: string): Promise<Question[]> {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('material_id', materialId)
            .order('order_index', { ascending: true });

        if (error) {
            console.error('Error fetching questions:', error);
            return [];
        }

        return data.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            expected: q.expected || { mode: 'text', value: q.correct_answer },
            explanation: q.explanation,
            tags: q.tags,
            difficulty_tag: q.difficulty_tag || (q.difficulty ? `L${q.difficulty}` : undefined),
            chinese_skill: q.chinese_skill,
            english_skill: q.english_skill,
            knowledge_points: q.knowledge_points,
            score_value: q.score_value
        })) as Question[];
    },

    /**
     * 批量创建题目
     */
    async createQuestions(materialId: string, questions: Array<{
        questionText: string;
        questionType: 'choice' | 'fill' | 'true_false' | 'short_answer' | 'correction' | 'open_ended';
        options?: string[];
        correctAnswer: string;
        expected?: any;
        explanation?: string;
        difficulty?: number;
        difficultyTag?: string;
        tags?: string[];
        isAiGenerated?: boolean;
        chineseSkill?: string;
        englishSkill?: string;
        knowledgePoints?: string[];
        scoreValue?: number;
    }>): Promise<{ success: boolean; questionIds?: string[]; error?: string }> {
        const insertData = questions.map((q, index) => ({
            material_id: materialId,
            question_text: q.questionText,
            question_type: q.questionType,
            options: q.options,
            correct_answer: q.correctAnswer,
            expected: q.expected || { mode: 'text', value: q.correctAnswer },
            explanation: q.explanation,
            difficulty: q.difficulty || 1,
            difficulty_tag: q.difficultyTag,
            order_index: index,
            tags: q.tags,
            is_ai_generated: q.isAiGenerated || false,
            chinese_skill: q.chineseSkill,
            english_skill: q.englishSkill,
            knowledge_points: q.knowledgePoints,
            score_value: q.scoreValue || 10
        }));

        const { data, error } = await supabase
            .from('questions')
            .insert(insertData)
            .select('id');

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, questionIds: data.map(q => q.id) };
    },

    /**
     * 更新单个题目
     */
    async updateQuestion(questionId: string, updates: Partial<{
        questionText: string;
        options: string[];
        correctAnswer: string;
        explanation: string;
        difficulty: number;
        tags: string[];
    }>): Promise<{ success: boolean; error?: string }> {
        const updateData: any = {};
        if (updates.questionText !== undefined) updateData.question_text = updates.questionText;
        if (updates.options !== undefined) updateData.options = updates.options;
        if (updates.correctAnswer !== undefined) updateData.correct_answer = updates.correctAnswer;
        if (updates.explanation !== undefined) updateData.explanation = updates.explanation;
        if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
        if (updates.tags !== undefined) updateData.tags = updates.tags;

        const { error } = await supabase
            .from('questions')
            .update(updateData)
            .eq('id', questionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 删除题目
     */
    async deleteQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', questionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 获取随机题目（用于生成任务）
     */
    async getRandomQuestions(materialId: string, count: number = 5): Promise<Question[]> {
        // Supabase doesn't have built-in random, we'll fetch more and shuffle client-side
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('material_id', materialId)
            .limit(count * 3); // Fetch more to randomize

        if (error || !data) {
            console.error('Error fetching random questions:', error);
            return [];
        }

        // Shuffle and take first N
        const shuffled = data.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            tags: q.tags
        })) as Question[];
    },

    /**
     * 上传文件到 Supabase Storage
     */
    async uploadFile(file: File, path: string): Promise<{ success: boolean; url?: string; error?: string }> {
        const { data, error } = await supabase.storage
            .from('study-materials')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('study-materials')
            .getPublicUrl(data.path);

        return { success: true, url: urlData.publicUrl };
    },

    /**
     * 将资料转为 RepositoryItem 格式
     */
    materialsToRepositoryItems(materials: LearningMaterial[]): RepositoryItem[] {
        return materials.map(m => ({
            id: m.id,
            title: m.title,
            subject: m.subject,
            description: m.description,
            attachments: [],
            created_at: (m as any).created_at || new Date().toISOString(),
            processed: true
        }));
    }
};

export default learningService;

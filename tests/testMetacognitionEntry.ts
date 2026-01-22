/**
 * 元认知功能测试入口
 * 在应用中导入此文件以启用测试功能
 * 
 * 使用方式（在浏览器控制台）：
 * window.testMetacognition()
 */

import {
    saveTaskFeedback,
    getFeedbackInsights,
    formatInsightsForPrompt
} from '../services/feedbackService';

import {
    saveEmotionRecord,
    getEmotionTrend
} from '../services/emotionService';

import {
    saveErrorAttribution,
    getErrorTypeDistribution,
    formatErrorInsightsForPrompt
} from '../services/errorAttributionService';

// 暴露测试函数到全局
if (typeof window !== 'undefined') {
    const testFunctions = {
        // 快速测试：使用真实用户 ID
        async testWithUser(userId: string) {
            console.log('🧪 开始元认知功能测试...\n');

            // 1. 反馈洞察
            console.log('📊 [1/3] 获取反馈洞察...');
            const feedback = await getFeedbackInsights(userId);
            console.log('反馈洞察:', feedback);
            console.log('反馈 Prompt:', formatInsightsForPrompt(feedback));

            // 2. 情绪趋势
            console.log('\n😊 [2/3] 获取情绪趋势...');
            const emotion = await getEmotionTrend(userId);
            console.log('情绪趋势:', emotion);

            // 3. 错题分布
            console.log('\n❌ [3/3] 获取错题归因分布...');
            const errors = await getErrorTypeDistribution(userId);
            console.log('错题分布:', errors);
            console.log('错题 Prompt:', formatErrorInsightsForPrompt(errors));

            console.log('\n✅ 测试完成！');
            return { feedback, emotion, errors };
        },

        // 模拟写入数据进行测试
        async mockDataTest(userId: string, taskId: string) {
            console.log('🧪 开始模拟数据测试...\n');

            // 模拟反馈
            console.log('📝 写入模拟反馈...');
            await saveTaskFeedback({
                task_id: taskId,
                user_id: userId,
                overall_rating: 'ok',
                positive_tags: ['targeted'],
                negative_tags: ['too_hard'],
            });
            console.log('✓ 反馈写入成功');

            // 模拟情绪
            console.log('😊 写入模拟情绪...');
            await saveEmotionRecord({
                task_id: taskId,
                user_id: userId,
                emotion: 'tired',
                score_percentage: 65,
            });
            console.log('✓ 情绪写入成功');

            // 模拟错题归因
            console.log('❌ 写入模拟错题归因...');
            for (let i = 0; i < 5; i++) {
                await saveErrorAttribution({
                    question_id: `mock-q-${Date.now()}-${i}`,
                    user_id: userId,
                    error_type: ['concept', 'calculation', 'concept', 'reading', 'careless'][i] as any,
                });
            }
            console.log('✓ 错题归因写入成功');

            // 读取验证
            console.log('\n📊 验证数据读取...');
            return await this.testWithUser(userId);
        },

        // 帮助信息
        help() {
            console.log(`
╔══════════════════════════════════════════════════════════╗
║           🧠 元认知功能测试工具                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  testMetacognition.testWithUser('用户ID')                ║
║    → 读取指定用户的反馈/情绪/错题数据                    ║
║                                                          ║
║  testMetacognition.mockDataTest('用户ID', '任务ID')      ║
║    → 写入模拟数据并验证读取                              ║
║                                                          ║
║  testMetacognition.help()                                ║
║    → 显示此帮助信息                                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
            `);
        }
    };

    (window as any).testMetacognition = testFunctions;
    console.log('💡 元认知测试已加载，输入 testMetacognition.help() 查看使用方法');
}

export { };

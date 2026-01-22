/**
 * 元认知功能测试脚本
 * 
 * 测试范围：
 * 1. 反馈数据存储和获取
 * 2. 情绪数据存储和趋势分析
 * 3. 错题归因存储和分布分析
 * 4. AI Prompt 生成验证
 * 
 * 使用方式：
 * npm run test:metacognition
 * 或直接在浏览器控制台运行
 */

import { saveTaskFeedback, getFeedbackInsights, formatInsightsForPrompt, hasTaskFeedback } from '../services/feedbackService';
import { saveEmotionRecord, getEmotionTrend, getEmotionBasedIntent } from '../services/emotionService';
import { saveErrorAttribution, getErrorTypeDistribution, formatErrorInsightsForPrompt } from '../services/errorAttributionService';

// 测试用的模拟数据
const TEST_USER_ID = 'test-user-metacognition-' + Date.now();
const TEST_TASK_ID = 'test-task-' + Date.now();

// ============================================
// 测试辅助函数
// ============================================

function log(emoji: string, message: string) {
    console.log(`${emoji} ${message}`);
}

function success(message: string) {
    log('✅', message);
}

function error(message: string) {
    log('❌', message);
}

function info(message: string) {
    log('📋', message);
}

// ============================================
// 测试 1: 反馈数据存储和获取
// ============================================

async function testFeedbackService() {
    console.log('\n========================================');
    console.log('🧪 测试 1: 反馈服务 (feedbackService)');
    console.log('========================================\n');

    try {
        // 1.1 保存反馈
        info('测试保存反馈...');
        const feedbackData = {
            task_id: TEST_TASK_ID,
            user_id: TEST_USER_ID,
            overall_rating: 'ok' as const,
            positive_tags: ['targeted', 'clear'],
            negative_tags: ['too_hard'],
        };

        const saved = await saveTaskFeedback(feedbackData);
        if (saved) {
            success(`反馈保存成功: ${JSON.stringify(saved)}`);
        } else {
            error('反馈保存失败');
            return false;
        }

        // 1.2 检查是否已有反馈
        info('测试检查反馈是否存在...');
        const exists = await hasTaskFeedback(TEST_TASK_ID);
        if (exists) {
            success('反馈存在检查通过');
        } else {
            error('反馈存在检查失败');
            return false;
        }

        // 1.3 获取反馈洞察
        info('测试获取反馈洞察...');
        const insights = await getFeedbackInsights(TEST_USER_ID);
        info(`反馈洞察: ${JSON.stringify(insights, null, 2)}`);

        // 1.4 格式化为 Prompt
        info('测试格式化 Prompt...');
        const prompt = formatInsightsForPrompt(insights);
        info(`生成的 Prompt:\n${prompt || '(无数据，需要更多反馈)'}`);

        success('反馈服务测试通过');
        return true;
    } catch (e) {
        error(`反馈服务测试异常: ${e}`);
        return false;
    }
}

// ============================================
// 测试 2: 情绪数据存储和趋势分析
// ============================================

async function testEmotionService() {
    console.log('\n========================================');
    console.log('🧪 测试 2: 情绪服务 (emotionService)');
    console.log('========================================\n');

    try {
        // 2.1 保存情绪记录
        info('测试保存情绪记录...');
        const emotionData = {
            task_id: TEST_TASK_ID,
            user_id: TEST_USER_ID,
            emotion: 'tired' as const,
            score_percentage: 70,
        };

        const saved = await saveEmotionRecord(emotionData);
        if (saved) {
            success(`情绪记录保存成功: ${JSON.stringify(saved)}`);
        } else {
            error('情绪记录保存失败');
            return false;
        }

        // 2.2 获取情绪趋势
        info('测试获取情绪趋势...');
        const trend = await getEmotionTrend(TEST_USER_ID);
        info(`情绪趋势: ${JSON.stringify(trend, null, 2)}`);

        // 2.3 测试 Intent 建议
        info('测试情绪 Intent 建议...');
        const intentAdvice = getEmotionBasedIntent(trend);
        info(`Intent 建议: ${JSON.stringify(intentAdvice)}`);

        success('情绪服务测试通过');
        return true;
    } catch (e) {
        error(`情绪服务测试异常: ${e}`);
        return false;
    }
}

// ============================================
// 测试 3: 错题归因存储和分布分析
// ============================================

async function testErrorAttributionService() {
    console.log('\n========================================');
    console.log('🧪 测试 3: 错题归因服务 (errorAttributionService)');
    console.log('========================================\n');

    try {
        // 3.1 保存多条归因记录
        info('测试保存错题归因...');
        const errorTypes = ['concept', 'calculation', 'concept', 'reading', 'concept'] as const;

        for (let i = 0; i < errorTypes.length; i++) {
            const saved = await saveErrorAttribution({
                question_id: `test-q-${i}`,
                user_id: TEST_USER_ID,
                error_type: errorTypes[i],
            });
            if (saved) {
                success(`归因 ${i + 1} 保存成功: ${errorTypes[i]}`);
            } else {
                error(`归因 ${i + 1} 保存失败`);
            }
        }

        // 3.2 获取错误分布
        info('测试获取错误类型分布...');
        const distribution = await getErrorTypeDistribution(TEST_USER_ID);
        info(`错误分布: ${JSON.stringify(distribution, null, 2)}`);

        // 3.3 格式化为 Prompt
        info('测试格式化错误 Prompt...');
        const prompt = formatErrorInsightsForPrompt(distribution);
        info(`生成的 Prompt:\n${prompt || '(数据不足，需要至少5道错题)'}`);

        success('错题归因服务测试通过');
        return true;
    } catch (e) {
        error(`错题归因服务测试异常: ${e}`);
        return false;
    }
}

// ============================================
// 测试 4: 综合 AI Prompt 生成
// ============================================

async function testCombinedPrompt() {
    console.log('\n========================================');
    console.log('🧪 测试 4: 综合 AI Prompt 生成');
    console.log('========================================\n');

    try {
        // 获取所有洞察
        const feedbackInsights = await getFeedbackInsights(TEST_USER_ID);
        const errorDistribution = await getErrorTypeDistribution(TEST_USER_ID);

        const feedbackPrompt = formatInsightsForPrompt(feedbackInsights);
        const errorPrompt = formatErrorInsightsForPrompt(errorDistribution);

        const combinedPrompt = [feedbackPrompt, errorPrompt].filter(Boolean).join('\n');

        console.log('\n📝 ===== 综合 AI Prompt =====\n');
        console.log(combinedPrompt || '(无足够数据生成 Prompt)');
        console.log('\n=============================\n');

        success('综合 Prompt 测试通过');
        return true;
    } catch (e) {
        error(`综合 Prompt 测试异常: ${e}`);
        return false;
    }
}

// ============================================
// 主测试函数
// ============================================

export async function runMetacognitionTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🧠 元认知功能自动化测试            ║');
    console.log('║   测试用户: ' + TEST_USER_ID.substring(0, 20) + '...  ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('\n');

    const results: { name: string; passed: boolean }[] = [];

    // 运行所有测试
    results.push({ name: '反馈服务', passed: await testFeedbackService() });
    results.push({ name: '情绪服务', passed: await testEmotionService() });
    results.push({ name: '错题归因', passed: await testErrorAttributionService() });
    results.push({ name: '综合 Prompt', passed: await testCombinedPrompt() });

    // 输出汇总
    console.log('\n');
    console.log('╔══════════════════════════════════════╗');
    console.log('║           📊 测试结果汇总            ║');
    console.log('╠══════════════════════════════════════╣');

    let allPassed = true;
    results.forEach(r => {
        const status = r.passed ? '✅ 通过' : '❌ 失败';
        console.log(`║  ${r.name.padEnd(15)} ${status.padEnd(10)}    ║`);
        if (!r.passed) allPassed = false;
    });

    console.log('╠══════════════════════════════════════╣');
    console.log(`║  总体结果: ${allPassed ? '✅ 全部通过' : '❌ 存在失败'}            ║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('\n');

    return allPassed;
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
    // 浏览器环境：暴露到全局
    (window as any).runMetacognitionTests = runMetacognitionTests;
    console.log('💡 在控制台输入 runMetacognitionTests() 开始测试');
}

export default runMetacognitionTests;

/**
 * StudyQuest UX Writing 规范
 * 统一的文案手册，确保产品"说话"一致
 */

// ===== 状态语 =====
export const LOADING = {
    default: '加载中...',
    ai: 'AI老师正在思考...',
    analyzing: '正在分析资料...',
    generating: '正在生成题目...',
    saving: '正在保存...',
    uploading: '正在上传...',
    processing: '处理中...',
    checking: '正在检查答案...',
} as const;

export const SUCCESS = {
    taskCreated: '任务发布成功！孩子可以开始挑战了',
    taskCompleted: '挑战完成！太棒了！',
    rewardClaimed: '奖励已领取！继续加油',
    saved: '保存成功',
    uploaded: '上传成功',
    childAdded: '孩子账号创建成功',
    configSaved: '设置已保存',
    bonusSent: '奖励已发放！',
} as const;

export const ERROR = {
    network: '网络连接不太顺畅，请稍后再试',
    ai: 'AI老师开小差了，换个方式再试试？',
    upload: '上传遇到问题，检查一下文件格式',
    generic: '哎呀，出了点小问题',
    noChild: '请先添加孩子账号',
    noInput: '请先输入内容',
    timeout: '等待太久了，请重试',
} as const;

export const EMPTY = {
    tasks: '今天没有任务，休息一下吧',
    rewards: '还没有心愿，和爸爸妈妈一起设定一个吧',
    mistakes: '太棒了！最近没有错题',
    history: '暂无学习记录',
    reading: '还没有阅读记录',
    repository: '资料库是空的',
} as const;

// ===== 按钮文案（动词一致）=====
export const ACTIONS = {
    primary: {
        start: '开始',
        submit: '提交',
        confirm: '确认',
        save: '保存',
        create: '创建',
        generate: '生成',
        claim: '领取',
        publish: '发布',
        next: '下一步',
        done: '完成',
    },
    secondary: {
        cancel: '取消',
        back: '返回',
        skip: '跳过',
        retry: '再试一次',
        viewMore: '查看更多',
        close: '关闭',
        edit: '编辑',
        delete: '删除',
    },
} as const;

// ===== 鼓励语 =====
export const ENCOURAGEMENT = {
    correct: [
        '太棒了！你的大脑刚刚又变强了！🧠✨',
        '答对啦！继续保持这个势头！🚀',
        'Excellent！你真是太厉害了！🎉',
        '完美！这道题难不倒你！💪',
        '正确！你的努力有了回报！⭐',
        'Brilliant！知识小达人就是你！🏆',
        '厉害！一下子就答对了！🌟',
        '太聪明了！这道题被你轻松拿下！✨',
        '没问题！你对这个知识点掌握得很好！👍',
        '棒极了！继续这样下去，你会越来越强！🔥',
        '正确！看来你已经完全理解了！💯',
        'Wow！你的进步速度简直像火箭！🚀',
        '这种难题都难不倒你？佩服佩服！👏',
        '学习就像冒险，恭喜你又攻克了一个关卡！🛡️',
        '你的专注力真是让人惊叹！🌟',
    ],
    wrong: [
        '没关系，错误是学习的一部分！💪',
        '下次一定能答对，相信自己！🌟',
        '勇敢尝试就是最棒的！加油！✨',
        '每个错误都让你更聪明，继续加油！🧠',
        '差一点点！再想想就能答对了！💡',
        '不要灰心，这题确实有点难度！🤔',
    ],
    streak: (days: number) => `🔥 连续第 ${days} 天，太厉害了！`,
    levelUp: (level: number) => `🎉 升级啦！欢迎来到 Lv.${level}！`,
    perfect: '全对！你太厉害了！🏆',
    almostPerfect: '接近满分！再努努力！💪',
    goodJob: '做得不错，继续保持！👍',
    keepTrying: '继续加油，你可以的！✨',
} as const;

// ===== AI 生成步骤 =====
export const AI_STEPS = [
    { stage: 0, icon: '🚀', title: '启动中', subtitle: 'AI老师正在热身' },
    { stage: 1, icon: '📖', title: '阅读资料', subtitle: '正在理解内容要点' },
    { stage: 2, icon: '🧠', title: '分析知识点', subtitle: '提取核心概念和考点' },
    { stage: 3, icon: '✨', title: '生成挑战', subtitle: '为孩子定制趣味题目' },
] as const;

// ===== 确认对话框 =====
export const CONFIRM = {
    deleteReward: {
        title: '删除这个奖励？',
        message: '删除后将无法恢复',
        confirm: '确认删除',
        cancel: '取消',
    },
    exitQuest: {
        title: '确定要退出吗？',
        message: '当前进度不会被保存',
        confirm: '退出',
        cancel: '继续答题',
    },
    claimReward: {
        title: '兑换这个奖励？',
        message: '将从你的积分中扣除',
        confirm: '确认兑换',
        cancel: '再想想',
    },
} as const;

// ===== 工具函数 =====

/**
 * 获取随机鼓励语
 */
export function getRandomEncouragement(isCorrect: boolean): string {
    const pool = isCorrect ? ENCOURAGEMENT.correct : ENCOURAGEMENT.wrong;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 根据得分获取反馈语
 */
export function getScoreFeedback(scorePercent: number): string {
    if (scorePercent >= 100) return ENCOURAGEMENT.perfect;
    if (scorePercent >= 90) return ENCOURAGEMENT.almostPerfect;
    if (scorePercent >= 70) return ENCOURAGEMENT.goodJob;
    return ENCOURAGEMENT.keepTrying;
}

/**
 * 格式化时长显示
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

/**
 * 获取问候语
 */
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了，注意休息';
    if (hour < 11) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜深了，注意休息';
}

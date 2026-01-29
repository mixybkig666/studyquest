import React, { useState } from 'react';

interface ErrorAttributionProps {
    questionId: string;
    questionText: string;
    subject?: 'math' | 'chinese' | 'english' | 'science' | 'other' | 'reading';
    onSubmit: (attribution: ErrorAttributionData) => void;
    onSkip: () => void;
}

export interface ErrorAttributionData {
    questionId: string;
    errorType: string;  // 支持所有科目的错误类型
    countermeasure?: string;
}

interface ErrorMonster {
    id: string;
    emoji: string;
    monsterName: string;
    label: string;
    desc: string;
    tips: string[];
}

// 根据科目返回适配的错误类型
const getErrorMonsters = (subject: string): ErrorMonster[] => {
    const mathMonsters: ErrorMonster[] = [
        { id: 'concept', emoji: '🧠', monsterName: '迷糊怪', label: '概念不懂', desc: '不太理解这个知识点', tips: ['回顾这个知识点', '问问老师或家长'] },
        { id: 'calculation', emoji: '🔢', monsterName: '算错怪', label: '算错了', desc: '方法对但计算出错', tips: ['下次算完检查', '竖式计算更稳'] },
        { id: 'reading', emoji: '👀', monsterName: '马虎怪', label: '没看清题', desc: '审题不仔细', tips: ['圈出关键词', '读题慢一点'] },
        { id: 'careless', emoji: '✍️', monsterName: '手滑怪', label: '粗心写错', desc: '知道答案但写错', tips: ['写完检查', '别着急交卷'] },
    ];

    const chineseMonsters: ErrorMonster[] = [
        { id: 'understand', emoji: '📖', monsterName: '迷糊怪', label: '理解偏差', desc: '没读懂文章意思', tips: ['多读几遍', '联系上下文'] },
        { id: 'recall', emoji: '📝', monsterName: '忘记怪', label: '记忆模糊', desc: '背过但想不起来', tips: ['复习一下', '多读几遍'] },
        { id: 'reading', emoji: '👀', monsterName: '马虎怪', label: '没看清题', desc: '审题不仔细', tips: ['圈出关键词', '看清问什么'] },
        { id: 'express', emoji: '✏️', monsterName: '表达怪', label: '表达不准', desc: '知道但说不清楚', tips: ['用书上的话', '分点作答'] },
    ];

    const englishMonsters: ErrorMonster[] = [
        { id: 'vocab', emoji: '📚', monsterName: '单词怪', label: '单词不熟', desc: '忘了单词意思', tips: ['多背几遍', '造句记忆'] },
        { id: 'grammar', emoji: '📏', monsterName: '语法怪', label: '语法混淆', desc: '语法规则用错', tips: ['复习语法点', '多做练习'] },
        { id: 'reading', emoji: '👀', monsterName: '马虎怪', label: '没看清题', desc: '审题不仔细', tips: ['看清时态', '注意单复数'] },
        { id: 'spell', emoji: '✍️', monsterName: '拼写怪', label: '拼写错误', desc: '会读但写错', tips: ['多抄几遍', '注意字母'] },
    ];

    const scienceMonsters: ErrorMonster[] = [
        { id: 'concept', emoji: '🧠', monsterName: '迷糊怪', label: '概念不懂', desc: '不理解原理', tips: ['看看课本', '问问老师'] },
        { id: 'calculation', emoji: '🔢', monsterName: '算错怪', label: '计算错误', desc: '公式对但算错', tips: ['检查计算', '注意单位'] },
        { id: 'reading', emoji: '👀', monsterName: '马虎怪', label: '审题不清', desc: '漏看条件', tips: ['圈出已知条件', '仔细读题'] },
        { id: 'logic', emoji: '🔗', monsterName: '逻辑怪', label: '推理错误', desc: '因果关系搞混', tips: ['画思维导图', '分步推理'] },
    ];

    switch (subject) {
        case 'math':
            return mathMonsters;
        case 'chinese':
        case 'reading':
            return chineseMonsters;
        case 'english':
            return englishMonsters;
        case 'science':
            return scienceMonsters;
        default:
            return mathMonsters;
    }
};

export const ErrorAttribution: React.FC<ErrorAttributionProps> = ({
    questionId,
    questionText,
    subject = 'math',
    onSubmit,
    onSkip,
}) => {
    const [step, setStep] = useState<'select' | 'countermeasure'>('select');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [countermeasure, setCountermeasure] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const monsters = getErrorMonsters(subject);
    const selectedMonster = monsters.find(m => m.id === selectedType);

    const handleSelect = (type: string) => {
        setSelectedType(type);
        setStep('countermeasure');
    };

    const handleSubmit = async () => {
        if (!selectedType) return;
        setIsSubmitting(true);
        await onSubmit({
            questionId,
            errorType: selectedType,
            countermeasure: countermeasure.trim() || undefined
        });
        setIsSubmitting(false);
    };

    // 步骤1：选择错误类型
    if (step === 'select') {
        return (
            <div className="mt-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-red-700 flex items-center gap-2">
                        <span>😈</span>
                        <span>是哪只小怪物捣乱了？</span>
                    </h3>
                    <button onClick={onSkip} className="text-red-400 hover:text-red-600 text-sm">
                        跳过
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {monsters.map(monster => (
                        <button
                            key={monster.id}
                            onClick={() => handleSelect(monster.id)}
                            className="py-2 px-3 rounded-xl border-2 text-left transition-all
                                bg-white border-gray-200 hover:border-red-300 hover:scale-[1.02]"
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-lg">{monster.emoji}</span>
                                <span className="font-bold text-gray-800 text-sm">{monster.monsterName}</span>
                            </div>
                            <div className="text-xs text-gray-500 ml-7">{monster.desc}</div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => handleSelect('unknown')}
                    className="w-full mt-2 py-1.5 text-gray-400 text-xs hover:text-gray-600"
                >
                    ❓ 不知道
                </button>
            </div>
        );
    }

    // 步骤2：写对策
    return (
        <div className="mt-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 animate-fade-in">
            <div className="text-center mb-3">
                <div className="text-3xl mb-1">{selectedMonster?.emoji || '😈'}</div>
                <h3 className="font-bold text-purple-800 text-sm">
                    抓到了「{selectedMonster?.monsterName || '神秘怪'}」！
                </h3>
            </div>

            <div className="bg-white/60 rounded-xl p-2 mb-3">
                <ul className="text-xs text-gray-600 space-y-0.5">
                    {selectedMonster?.tips.map((tip, i) => (
                        <li key={i}>💡 {tip}</li>
                    ))}
                </ul>
            </div>

            <input
                type="text"
                value={countermeasure}
                onChange={(e) => setCountermeasure(e.target.value)}
                placeholder="下次我要...（可选）"
                className="w-full py-2 px-3 rounded-lg border border-purple-200 text-sm mb-3 focus:outline-none focus:border-purple-400"
                maxLength={30}
            />

            <div className="flex gap-2">
                <button onClick={() => setStep('select')} className="flex-1 py-2 text-purple-400 text-xs">
                    ← 重选
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                    {isSubmitting ? '...' : '记住它 ✓'}
                </button>
            </div>
        </div>
    );
};

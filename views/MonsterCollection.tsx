import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface MonsterCollectionProps {
    userId: string;
    onBack: () => void;
}

interface Monster {
    id: string;
    name: string;
    emoji: string;
    description: string;
    encounterCount: number;
    lastEncounter?: string;
    countermeasures: string[];
    isTamed: boolean; // 30天未遇到即为"驯服"
    rarity: 'common' | 'rare' | 'legendary';
}

// 所有可能的怪物类型
const ALL_MONSTERS: Omit<Monster, 'encounterCount' | 'lastEncounter' | 'countermeasures' | 'isTamed'>[] = [
    { id: 'concept', name: '迷糊怪', emoji: '🧠', description: '概念理解不清', rarity: 'common' },
    { id: 'calculation', name: '算错怪', emoji: '🔢', description: '计算过程出错', rarity: 'common' },
    { id: 'reading', name: '马虎怪', emoji: '👀', description: '审题不仔细', rarity: 'common' },
    { id: 'careless', name: '手滑怪', emoji: '✍️', description: '写答案时出错', rarity: 'common' },
    { id: 'vocab', name: '单词怪', emoji: '📚', description: '单词记忆不牢', rarity: 'rare' },
    { id: 'grammar', name: '语法怪', emoji: '📏', description: '语法规则混乱', rarity: 'rare' },
    { id: 'logic', name: '逻辑怪', emoji: '🔗', description: '推理过程有误', rarity: 'rare' },
    { id: 'unknown', name: '神秘怪', emoji: '❓', description: '未知错误类型', rarity: 'legendary' },
];

// 模拟用户遇到的怪物数据
const mockUserMonsters: Monster[] = [
    { id: 'concept', name: '迷糊怪', emoji: '🧠', description: '概念理解不清', encounterCount: 3, lastEncounter: '2天前', countermeasures: ['多看例题', '问老师'], isTamed: false, rarity: 'common' },
    { id: 'calculation', name: '算错怪', emoji: '🔢', description: '计算过程出错', encounterCount: 5, lastEncounter: '今天', countermeasures: ['竖式计算', '检查两遍'], isTamed: false, rarity: 'common' },
    { id: 'reading', name: '马虎怪', emoji: '👀', description: '审题不仔细', encounterCount: 2, lastEncounter: '1周前', countermeasures: ['圈关键词'], isTamed: false, rarity: 'common' },
    { id: 'careless', name: '手滑怪', emoji: '✍️', description: '写答案时出错', encounterCount: 1, lastEncounter: '3天前', countermeasures: [], isTamed: false, rarity: 'common' },
];

/**
 * 怪物图鉴 - 收集和展示遇到过的错误类型
 * 将错误游戏化，消除对错误的恐惧
 */
export const MonsterCollection: React.FC<MonsterCollectionProps> = ({ userId, onBack }) => {
    const [monsters, setMonsters] = useState<Monster[]>([]);
    const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: 从数据库加载真实数据
        setTimeout(() => {
            setMonsters(mockUserMonsters);
            setLoading(false);
        }, 500);
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-bounce">📖</div>
                    <p className="text-gray-600">加载怪物图鉴...</p>
                </div>
            </div>
        );
    }

    const collectedCount = monsters.length;
    const totalCount = ALL_MONSTERS.length;
    const tamedCount = monsters.filter(m => m.isTamed).length;

    // 获取怪物星级
    const getStars = (count: number) => {
        if (count >= 5) return '★★★';
        if (count >= 3) return '★★☆';
        if (count >= 1) return '★☆☆';
        return '☆☆☆';
    };

    // 怪物详情弹窗
    const MonsterDetail = ({ monster }: { monster: Monster }) => (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedMonster(null)}
        >
            <div
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-4">
                    <div className="text-6xl mb-2">{monster.emoji}</div>
                    <h2 className="text-2xl font-black text-gray-800">{monster.name}</h2>
                    <p className="text-gray-500 text-sm">{monster.description}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">遇到次数</span>
                        <span className="font-bold text-gray-800">{monster.encounterCount}次</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">上次相遇</span>
                        <span className="font-bold text-gray-800">{monster.lastEncounter}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">了解程度</span>
                        <span className="font-bold text-yellow-500">{getStars(monster.encounterCount)}</span>
                    </div>
                </div>

                {monster.countermeasures.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-700 mb-2 text-sm">我的对策：</h4>
                        <div className="space-y-1">
                            {monster.countermeasures.map((cm, idx) => (
                                <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span>{cm}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Button onClick={() => setSelectedMonster(null)} variant="primary" size="lg" className="w-full">
                    关闭
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-50 p-4 pb-20">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
                    <span className="text-gray-600">←</span>
                </button>
                <h1 className="text-xl font-black text-purple-800">📖 怪物图鉴</h1>
                <div className="w-10"></div>
            </header>

            {/* 收集进度 */}
            <Card className="mb-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-lg">收集进度</h2>
                        <p className="text-purple-200 text-sm">遇到越多，了解越深</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black">{collectedCount}/{totalCount}</div>
                        <div className="text-xs text-purple-200">已驯服: {tamedCount}</div>
                    </div>
                </div>
            </Card>

            {/* 已收集的怪物 */}
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>😈</span>
                <span>已遇到的怪物</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
                {monsters.map(monster => (
                    <Card
                        key={monster.id}
                        className={`cursor-pointer transform hover:scale-105 transition-all ${monster.isTamed ? 'bg-green-50 border-green-200' : 'bg-white'
                            }`}
                        onClick={() => setSelectedMonster(monster)}
                    >
                        <div className="text-center">
                            <div className="text-4xl mb-2">{monster.emoji}</div>
                            <div className="font-bold text-gray-800 text-sm">{monster.name}</div>
                            <div className="text-xs text-gray-500">遇到{monster.encounterCount}次</div>
                            <div className="text-yellow-400 text-xs mt-1">{getStars(monster.encounterCount)}</div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* 未遇到的怪物 */}
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>🔒</span>
                <span>未遇到</span>
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
                {ALL_MONSTERS
                    .filter(m => !monsters.find(um => um.id === m.id))
                    .map(monster => (
                        <div
                            key={monster.id}
                            className="bg-gray-200 rounded-xl p-3 text-center opacity-50"
                        >
                            <div className="text-2xl mb-1">🔒</div>
                            <div className="text-xs text-gray-500">???</div>
                        </div>
                    ))}
            </div>

            {/* 成就提示 */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">🏆</div>
                    <div>
                        <h4 className="font-bold text-yellow-800">成就进度</h4>
                        <p className="text-xs text-yellow-600">
                            {collectedCount >= totalCount
                                ? '🎉 全员集结！所有怪物都认识了！'
                                : `再遇到 ${totalCount - collectedCount} 种怪物解锁"全员集结"`}
                        </p>
                    </div>
                </div>
            </Card>

            {/* 返回按钮 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white">
                <Button onClick={onBack} variant="primary" size="lg" className="w-full">
                    返回主页
                </Button>
            </div>

            {/* 怪物详情弹窗 */}
            {selectedMonster && <MonsterDetail monster={selectedMonster} />}
        </div>
    );
};

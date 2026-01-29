import React, { useState } from 'react';
import { Button } from '../components/Button';

interface KnowledgeMapProps {
    userId: string;
    subject: 'math' | 'chinese' | 'english' | 'science';
    onBack: () => void;
}

interface KnowledgeNode {
    id: string;
    name: string;
    status: 'locked' | 'learning' | 'mastered';
    progress: number; // 0-100
    prerequisites: string[]; // 前置知识点 ID
    description?: string;
    questionsCount?: number; // 该知识点相关题目数
}

// 数学知识地图示例数据
const mathKnowledgeMap: KnowledgeNode[] = [
    { id: '1', name: '整数运算', status: 'mastered', progress: 100, prerequisites: [], description: '加减乘除基础', questionsCount: 20 },
    { id: '2', name: '分数概念', status: 'mastered', progress: 85, prerequisites: ['1'], description: '分数的认识', questionsCount: 15 },
    { id: '3', name: '小数运算', status: 'mastered', progress: 90, prerequisites: ['1'], description: '小数加减乘除', questionsCount: 18 },
    { id: '4', name: '分数运算', status: 'learning', progress: 60, prerequisites: ['2'], description: '分数加减乘除', questionsCount: 12 },
    { id: '5', name: '分数应用', status: 'locked', progress: 0, prerequisites: ['4'], description: '分数应用题', questionsCount: 0 },
    { id: '6', name: '小数分数互换', status: 'learning', progress: 40, prerequisites: ['2', '3'], description: '小数与分数转换', questionsCount: 8 },
];

/**
 * 知识地图 - 游戏技能树式知识点展示
 * 让学生看到知识脉络和学习路径
 */
export const KnowledgeMap: React.FC<KnowledgeMapProps> = ({ userId, subject, onBack }) => {
    const [nodes] = useState<KnowledgeNode[]>(mathKnowledgeMap);
    const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

    // 获取节点样式
    const getNodeStyle = (status: KnowledgeNode['status'], progress: number) => {
        switch (status) {
            case 'mastered':
                return {
                    bg: 'bg-gradient-to-br from-green-500 to-emerald-500',
                    border: 'border-green-400',
                    text: 'text-white',
                    icon: '✓',
                };
            case 'learning':
                return {
                    bg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
                    border: 'border-blue-400',
                    text: 'text-white',
                    icon: '📖',
                };
            case 'locked':
                return {
                    bg: 'bg-gray-300',
                    border: 'border-gray-400',
                    text: 'text-gray-600',
                    icon: '🔒',
                };
        }
    };

    // 节点详情弹窗
    const NodeDetail = ({ node }: { node: KnowledgeNode }) => (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedNode(null)}
        >
            <div
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-4">
                    <div className="text-5xl mb-2">
                        {getNodeStyle(node.status, node.progress).icon}
                    </div>
                    <h2 className="text-2xl font-black text-gray-800">{node.name}</h2>
                    {node.description && (
                        <p className="text-gray-500 text-sm mt-1">{node.description}</p>
                    )}
                </div>

                {/* 掌握度 */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">掌握度</span>
                        <span className="font-bold text-gray-800">{node.progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all ${node.status === 'mastered' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                    node.status === 'learning' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                        'bg-gray-400'
                                }`}
                            style={{ width: `${node.progress}%` }}
                        />
                    </div>
                </div>

                {/* 练习题数 */}
                {node.questionsCount !== undefined && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">相关题目</span>
                            <span className="font-bold text-gray-800">{node.questionsCount} 道</span>
                        </div>
                    </div>
                )}

                {/* 前置知识点 */}
                {node.prerequisites.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-700 mb-2 text-sm">需要先掌握：</h4>
                        <div className="space-y-1">
                            {node.prerequisites.map(preId => {
                                const preNode = nodes.find(n => n.id === preId);
                                return preNode ? (
                                    <div key={preId} className="text-sm text-gray-600 flex items-center gap-2">
                                        <span className={preNode.status === 'mastered' ? 'text-green-500' : 'text-gray-400'}>
                                            {preNode.status === 'mastered' ? '✓' : '○'}
                                        </span>
                                        <span>{preNode.name}</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-2">
                    {node.status !== 'locked' && (
                        <Button variant="primary" size="lg" className="w-full">
                            开始练习
                        </Button>
                    )}
                    <Button onClick={() => setSelectedNode(null)} variant="secondary" size="lg" className="w-full">
                        关闭
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 p-4 pb-20">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
                    <span className="text-gray-600">←</span>
                </button>
                <h1 className="text-xl font-black text-indigo-800">🗺️ 知识地图</h1>
                <div className="w-10"></div>
            </header>

            {/* 图例 */}
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3 text-sm">图例</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500"></div>
                        <span className="text-xs text-gray-600">已掌握</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
                        <span className="text-xs text-gray-600">学习中</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                        <span className="text-xs text-gray-600">未解锁</span>
                    </div>
                </div>
            </div>

            {/* 知识树 */}
            <div className="relative">
                {nodes.map((node, index) => {
                    const style = getNodeStyle(node.status, node.progress);
                    const hasPrerequisites = node.prerequisites.length > 0;

                    return (
                        <div key={node.id} className="mb-8 relative">
                            {/* 连接线 */}
                            {hasPrerequisites && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 w-0.5 h-8 bg-gray-300"></div>
                            )}

                            {/* 节点 */}
                            <div
                                className={`relative mx-auto w-32 h-32 rounded-2xl ${style.bg} ${style.text} cursor-pointer transform hover:scale-105 transition-all shadow-lg flex flex-col items-center justify-center border-4 ${style.border}`}
                                onClick={() => setSelectedNode(node)}
                            >
                                <div className="text-3xl mb-1">{style.icon}</div>
                                <div className="font-bold text-sm text-center px-2">{node.name}</div>
                                {node.status !== 'locked' && (
                                    <div className="text-xs mt-1 opacity-90">{node.progress}%</div>
                                )}
                            </div>

                            {/* 分支连接线（如果有多个前置知识） */}
                            {node.prerequisites.length > 1 && index > 0 && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
                                    <div className="flex gap-8">
                                        {node.prerequisites.map((_, idx) => (
                                            <div key={idx} className="w-0.5 h-4 bg-gray-300"></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 统计信息 */}
            <div className="bg-white rounded-xl p-4 mt-6 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">学习进度</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-black text-green-600">
                            {nodes.filter(n => n.status === 'mastered').length}
                        </div>
                        <div className="text-xs text-gray-500">已掌握</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-blue-600">
                            {nodes.filter(n => n.status === 'learning').length}
                        </div>
                        <div className="text-xs text-gray-500">学习中</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-400">
                            {nodes.filter(n => n.status === 'locked').length}
                        </div>
                        <div className="text-xs text-gray-500">未解锁</div>
                    </div>
                </div>
            </div>

            {/* 返回按钮 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white">
                <Button onClick={onBack} variant="primary" size="lg" className="w-full">
                    返回主页
                </Button>
            </div>

            {/* 节点详情弹窗 */}
            {selectedNode && <NodeDetail node={selectedNode} />}
        </div>
    );
};

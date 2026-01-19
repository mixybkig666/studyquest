/**
 * 知识点掌握概览组件
 * 显示在 ChildDashboard 中
 */

import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { getMasterySummaryFromDb, loadUserMasteries, generateMasterySummary } from '../services/knowledgeService';
import { KnowledgeMastery } from '../types';

import bookStack3d from '../assets/icons/3d/book_stack_3d.png';

interface KnowledgeOverviewProps {
    userId: string;
}

export const KnowledgeOverview: React.FC<KnowledgeOverviewProps> = ({ userId }) => {
    const [summary, setSummary] = useState<{
        total_points: number;
        mastered_count: number;
        learning_count: number;
        weak_count: number;
        review_due_count: number;
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [masteries, setMasteries] = useState<KnowledgeMastery[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 加载汇总数据
                const summaryData = await getMasterySummaryFromDb(userId);
                setSummary(summaryData);

                // 加载详细数据用于显示薄弱点
                const details = await loadUserMasteries(userId);
                setMasteries(details);
            } catch (e) {
                console.error('Failed to load knowledge overview:', e);
            }
            setLoading(false);
        };

        if (userId) {
            loadData();
        }
    }, [userId]);

    if (loading) {
        return (
            <Card className="p-4 animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
            </Card>
        );
    }

    if (!summary || summary.total_points === 0) {
        return (
            <div className="bg-gradient-to-br from-white/80 to-purple-50/50 backdrop-blur-xl border border-white/60 shadow-lg rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100/50 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex flex-col items-center justify-center text-center py-4">
                    <div className="w-16 h-16 bg-white/50 backdrop-blur rounded-2xl shadow-sm flex items-center justify-center mb-3 rotate-3 group-hover:rotate-6 transition-transform">
                        <img src={bookStack3d} alt="Book Stack" className="w-12 h-12 object-contain drop-shadow-md" />
                    </div>
                    <h3 className="text-2xl font-black text-purple-900 mb-1 font-display">开始探索吧！</h3>
                    <p className="text-sm text-purple-600/80 font-bold max-w-[200px]">
                        完成第一个任务，点亮你的知识图谱 ✨
                    </p>
                </div>
            </div>
        );
    }

    const masteryPercent = Math.round((summary.mastered_count / summary.total_points) * 100);
    const weakPoints = masteries.filter(m => m.mastery_level <= 1).slice(0, 3);
    // 使用一致的计算方式，确保 weak_count 与 weakPoints 列表匹配
    const actualWeakCount = masteries.filter(m => m.mastery_level <= 1).length;

    return (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-purple-800 flex items-center gap-2">
                    <span>🧠</span>
                    <span>知识点掌握</span>
                </h3>
                {summary.review_due_count > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                        ⏰ {summary.review_due_count} 个需复习
                    </span>
                )}
            </div>

            {/* 掌握进度条 */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-purple-600">已掌握 {summary.mastered_count}/{summary.total_points}</span>
                    <span className="text-purple-700 font-bold">{masteryPercent}%</span>
                </div>
                <div className="h-3 bg-purple-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${masteryPercent}%` }}
                    />
                </div>
            </div>

            {/* 状态统计 */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
                <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-green-700 font-black text-lg">{summary.mastered_count}</div>
                    <div className="text-green-600 text-xs">熟练掌握</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-yellow-700 font-black text-lg">{summary.learning_count}</div>
                    <div className="text-yellow-600 text-xs">正在学习</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                    <div className="text-red-700 font-black text-lg">{actualWeakCount}</div>
                    <div className="text-red-600 text-xs">需加强</div>
                </div>
            </div>

            {/* 需要加强的知识点 */}
            {weakPoints.length > 0 && (
                <div className="bg-white/50 rounded-lg p-2">
                    <div className="text-xs text-purple-600 font-bold mb-1">💪 需要加强：</div>
                    <div className="flex flex-wrap gap-1">
                        {weakPoints.map((wp, i) => (
                            <span
                                key={i}
                                className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs"
                            >
                                {wp.knowledge_point_name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

/**
 * FloatingTracePanel - 悬浮的 Agent 思考过程面板
 * 
 * 在屏幕右下角显示，可展开/收起
 * 使用全局 TraceContext
 */

import React, { useState } from 'react';
import { useTrace, TraceStep } from '../contexts/TraceContext';

// 步骤图标和颜色映射
const STEP_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    start: { icon: '🚀', label: '开始', color: 'text-blue-600' },
    context: { icon: '📊', label: '获取上下文', color: 'text-purple-600' },
    memory: { icon: '🧠', label: '读取记忆', color: 'text-indigo-600' },
    decision: { icon: '🎯', label: '策略决策', color: 'text-green-600' },
    topic_selected: { icon: '💡', label: '选择主题', color: 'text-amber-600' },
    generate_material: { icon: '📝', label: '生成材料', color: 'text-orange-600' },
    generate_questions: { icon: '❓', label: '生成题目', color: 'text-pink-600' },
    complete: { icon: '✅', label: '完成', color: 'text-emerald-600' },
    error: { icon: '❌', label: '错误', color: 'text-red-600' },
    think_step: { icon: '💭', label: '思考', color: 'text-gray-600' },
};

const getStepConfig = (step: string) => {
    return STEP_CONFIG[step] || { icon: '⚙️', label: step, color: 'text-gray-600' };
};

export const FloatingTracePanel: React.FC = () => {
    const { trace, isProcessing, currentTaskName, clearTrace } = useTrace();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    // 没有 trace 且不在处理中时不显示
    if (trace.length === 0 && !isProcessing) {
        return null;
    }

    // 最小化模式：只显示一个小图标
    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-20 right-6 w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-xl flex items-center justify-center text-xl hover:scale-110 transition-transform z-40 animate-pulse"
            >
                🤖
            </button>
        );
    }

    return (
        <div className="fixed bottom-20 right-6 w-80 max-h-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-40 animate-pop">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{isProcessing ? '🔄' : '🤖'}</span>
                    <span className="font-medium text-sm truncate max-w-[150px]">
                        {currentTaskName || 'Agent 思考中...'}
                    </span>
                    {isProcessing && (
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors text-xs"
                    >
                        {isExpanded ? '▼' : '▲'}
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors text-xs"
                    >
                        −
                    </button>
                    <button
                        onClick={clearTrace}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors text-xs"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-3 max-h-72 overflow-y-auto">
                    <div className="space-y-2">
                        {trace.map((item, index) => {
                            const config = getStepConfig(item.step);
                            return (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                    <span className="text-base">{config.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-medium ${config.color}`}>
                                            {config.label}
                                        </div>
                                        {item.result?.message && (
                                            <div className="text-gray-500 text-xs truncate">
                                                {item.result.message}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-300">
                                        {index + 1}
                                    </span>
                                </div>
                            );
                        })}

                        {isProcessing && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="animate-spin">⏳</span>
                                <span>处理中...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            {!isExpanded && (
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
                    {trace.length} 个步骤 {isProcessing ? '(进行中)' : '(完成)'}
                </div>
            )}
        </div>
    );
};

export default FloatingTracePanel;

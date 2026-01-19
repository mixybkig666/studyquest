/**
 * AgentTracePanel - Agent 操作追踪可视化
 * 
 * 展示 Agent 的执行过程，帮助家长/开发者理解 AI 做了什么决策
 */

import React, { useState } from 'react';

// 工具图标和颜色映射
const TOOL_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
    get_student_context: {
        icon: '📊',
        label: '读取学生状态',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
    },
    read_student_memory: {
        icon: '🧠',
        label: '读取记忆',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
    },
    get_memory_summary: {
        icon: '📋',
        label: '记忆摘要',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
    },
    search_knowledge_points: {
        icon: '🔍',
        label: '查询知识点',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
    },
    get_learning_goal: {
        icon: '🎯',
        label: '查看学习目标',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50'
    },
    compare_with_history: {
        icon: '📈',
        label: '对比历史',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50'
    },
    decide_teaching_intent: {
        icon: '🎓',
        label: '决定教学策略',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
    },
    generate_questions: {
        icon: '📝',
        label: '生成练习题',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
    },
    generate_parent_report: {
        icon: '💬',
        label: '生成家长简报',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50'
    },
    write_observation: {
        icon: '✏️',
        label: '写入记忆',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
    },
    think_step: {
        icon: '💭',
        label: '思考',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
    },
    verify_decision: {
        icon: '✅',
        label: '验证决策',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
    }
};

interface ToolCall {
    name: string;
    params: Record<string, any>;
    result: any;
}

interface AgentTracePanelProps {
    toolCalls?: ToolCall[];
    trace?: any[]; // 兼容简化版 trace 格式
    finalAnswer?: string;
    isLoading?: boolean;
    showDetails?: boolean;
    onToggle?: () => void;
}

export const AgentTracePanel: React.FC<AgentTracePanelProps> = ({
    toolCalls,
    trace,
    finalAnswer,
    isLoading = false,
    showDetails = true, // 默认展开
    onToggle
}) => {
    // 兼容两种格式
    const steps = toolCalls || (trace ? trace.map(t => ({
        name: t.step || 'think_step',
        params: {},
        result: t.result
    })) : []);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const [isExpanded, setIsExpanded] = useState(showDetails); // 内部状态管理展开/收起

    const toggleStep = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    const getToolConfig = (name: string) => {
        return TOOL_CONFIG[name] || {
            icon: '⚙️',
            label: name,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50'
        };
    };

    const formatResult = (result: any): string => {
        if (!result) return '无返回';

        // 特殊处理 think_step
        if (result.thought) {
            return `"${result.thought}"`;
        }

        // 特殊处理 decide_teaching_intent
        if (result.type) {
            const intentLabels: Record<string, string> = {
                reinforce: '巩固练习',
                verify: '验证检测',
                challenge: '挑战提升',
                lighten: '轻松模式',
                introduce: '新知识',
                pause: '休息调整'
            };
            return intentLabels[result.type] || result.type;
        }

        // 特殊处理 trend
        if (result.trend) {
            const trendLabels: Record<string, string> = {
                improving: '📈 进步中',
                stable: '➡️ 稳定',
                declining: '📉 下降'
            };
            return trendLabels[result.trend] || result.trend;
        }

        // 默认
        if (typeof result === 'object') {
            const keys = Object.keys(result);
            if (keys.length > 3) {
                return `${keys.length} 项数据`;
            }
            return JSON.stringify(result, null, 2).slice(0, 100);
        }

        return String(result);
    };

    if (!steps || steps.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 cursor-pointer"
                onClick={() => { setIsExpanded(!isExpanded); onToggle?.(); }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="font-medium text-gray-700">Agent 思考过程</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        {steps.length} 步
                    </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    {isExpanded ? '收起' : '展开'}
                </button>
            </div>

            {/* Timeline */}
            {isExpanded && (
                <div className="p-4">
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200"></div>

                        {/* Steps */}
                        <div className="space-y-3">
                            {steps.map((call, index) => {
                                const config = getToolConfig(call.name);
                                const isExpanded = expandedSteps.has(index);
                                const isThinkStep = call.name === 'think_step';

                                return (
                                    <div
                                        key={index}
                                        className={`relative pl-12 ${isThinkStep ? 'opacity-80' : ''}`}
                                    >
                                        {/* Step indicator */}
                                        <div
                                            className={`absolute left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm ${config.bgColor} border-2 border-white shadow-sm`}
                                        >
                                            {config.icon}
                                        </div>

                                        {/* Content card */}
                                        <div
                                            className={`${config.bgColor} rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm`}
                                            onClick={() => toggleStep(index)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`font-medium text-sm ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Step {index + 1}
                                                </span>
                                            </div>

                                            {/* Result preview */}
                                            <div className="mt-1 text-sm text-gray-600">
                                                {formatResult(call.result)}
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && (
                                                <div className="mt-2 pt-2 border-t border-white/50">
                                                    <div className="text-xs text-gray-500 mb-1">参数:</div>
                                                    <pre className="text-xs bg-white/50 rounded p-2 overflow-x-auto">
                                                        {JSON.stringify(call.params, null, 2)}
                                                    </pre>
                                                    <div className="text-xs text-gray-500 mt-2 mb-1">完整结果:</div>
                                                    <pre className="text-xs bg-white/50 rounded p-2 overflow-x-auto max-h-32">
                                                        {JSON.stringify(call.result, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="relative pl-12">
                                    <div className="absolute left-2 w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 border-2 border-white shadow-sm animate-pulse">
                                        ⏳
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <span className="text-sm text-gray-500">思考中...</span>
                                    </div>
                                </div>
                            )}

                            {/* Final answer */}
                            {finalAnswer && (
                                <div className="relative pl-12">
                                    <div className="absolute left-2 w-7 h-7 rounded-full flex items-center justify-center bg-green-100 border-2 border-white shadow-sm">
                                        ✨
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                                        <div className="text-sm font-medium text-green-700">最终结论</div>
                                        <div className="mt-1 text-sm text-gray-700">{finalAnswer}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 紧凑版：一行显示
export const AgentTraceBadge: React.FC<{ toolCalls?: ToolCall[], trace?: any[] }> = ({ toolCalls, trace }) => {
    const steps = toolCalls || (trace ? trace.map(t => ({
        name: t.step || 'think_step',
        params: {},
        result: t.result
    })) : []);

    if (!steps || steps.length === 0) return null;

    return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>🤖</span>
            <span>执行了 {steps.length} 步</span>
            <div className="flex -space-x-1">
                {steps.slice(0, 4).map((call, i) => (
                    <span
                        key={i}
                        className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]"
                    >
                        {TOOL_CONFIG[call.name]?.icon || '⚙️'}
                    </span>
                ))}
                {steps.length > 4 && (
                    <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">
                        +{steps.length - 4}
                    </span>
                )}
            </div>
        </div>
    );
};

export default AgentTracePanel;

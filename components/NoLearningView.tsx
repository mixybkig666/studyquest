import React from 'react';
import { Button } from './Button';

interface NoLearningViewProps {
    message: string;
    reminder?: string;
    onDismiss: () => void;
    showParentSummary?: boolean;
    parentSummary?: {
        why_this_decision: string;
        detected_risks: string[];
        next_suggested_check?: string;
    };
}

export const NoLearningView: React.FC<NoLearningViewProps> = ({
    message,
    reminder,
    onDismiss,
    showParentSummary = false,
    parentSummary,
}) => {
    const [showDetails, setShowDetails] = React.useState(false);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
            {/* Success Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pop">
                <span className="text-5xl">✅</span>
            </div>

            {/* Main Message */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                今天的学习已经完成
            </h2>

            <p className="text-gray-600 mb-6 max-w-sm">
                {message}
            </p>

            {/* Reminder (if any) */}
            {reminder && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 max-w-sm">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div className="text-left">
                            <p className="text-sm font-medium text-amber-800">小提醒</p>
                            <p className="text-sm text-amber-700 mt-1">{reminder}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dismiss Button */}
            <Button
                onClick={onDismiss}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-8 py-3 text-lg"
            >
                知道了，去休息 👋
            </Button>

            {/* Parent Summary (Collapsible) */}
            {showParentSummary && parentSummary && (
                <div className="mt-8 w-full max-w-md">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
                    >
                        <span>{showDetails ? '▼' : '▶'}</span>
                        {showDetails ? '收起详情' : '查看系统判断依据（家长）'}
                    </button>

                    {showDetails && (
                        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left text-sm animate-fade-in">
                            <div className="space-y-3">
                                <div>
                                    <p className="font-medium text-gray-700">📋 决策原因</p>
                                    <p className="text-gray-600 mt-1">{parentSummary.why_this_decision}</p>
                                </div>

                                {parentSummary.detected_risks.length > 0 && (
                                    <div>
                                        <p className="font-medium text-gray-700">⚠️ 检测到的风险点</p>
                                        <ul className="text-gray-600 mt-1 list-disc list-inside">
                                            {parentSummary.detected_risks.map((risk, i) => (
                                                <li key={i}>{risk}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {parentSummary.next_suggested_check && (
                                    <div>
                                        <p className="font-medium text-gray-700">📅 下次建议检查</p>
                                        <p className="text-gray-600 mt-1">{parentSummary.next_suggested_check}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

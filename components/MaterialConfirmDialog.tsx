import React from 'react';
import { MaterialType } from '../types';

interface MaterialConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (materialType: MaterialType) => void;
    detectedType?: MaterialType;
    previewUrl?: string;
    fileName?: string;
}

const MATERIAL_OPTIONS: { type: MaterialType; icon: string; title: string; subtitle: string }[] = [
    { type: 'completed_exam', icon: '✅', title: '已经写过', subtitle: '帮我分析错题' },
    { type: 'blank_exam', icon: '📝', title: '还没写', subtitle: '只看知识点' },
    { type: 'essay_prompt', icon: '✍️', title: '作文题目', subtitle: '解析 + 范文' },
    { type: 'student_essay', icon: '📄', title: '孩子的作文', subtitle: '评析 + 建议' },
    { type: 'textbook_notes', icon: '📖', title: '课本/笔记', subtitle: '整理知识点' },
    { type: 'review_summary', icon: '📋', title: '复习资料', subtitle: '生成练习' },
];

export const MaterialConfirmDialog: React.FC<MaterialConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    detectedType,
    previewUrl,
    fileName,
}) => {
    if (!isOpen) return null;

    const getDetectedLabel = () => {
        if (!detectedType) return null;
        const found = MATERIAL_OPTIONS.find(o => o.type === detectedType);
        return found ? `${found.icon} ${found.title}` : null;
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-pop">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">📄 检测到上传资料</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Preview */}
                    {(previewUrl || fileName) && (
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="预览"
                                    className="w-16 h-16 object-cover rounded-lg"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                                    📄
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{fileName || '上传的资料'}</p>
                                {detectedType && (
                                    <p className="text-sm text-purple-600">
                                        AI 识别：{getDetectedLabel()}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 确认标题 */}
                    <p className="text-center text-gray-700 font-medium">请确认资料状态：</p>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {MATERIAL_OPTIONS.map((option) => (
                            <button
                                key={option.type}
                                onClick={() => onConfirm(option.type)}
                                className={`
                                    p-4 rounded-2xl border-2 transition-all duration-200
                                    flex flex-col items-center gap-1 text-center
                                    hover:border-purple-400 hover:shadow-md hover:scale-105
                                    ${detectedType === option.type
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 bg-white'
                                    }
                                `}
                            >
                                <span className="text-2xl">{option.icon}</span>
                                <span className="font-bold text-sm text-gray-800">{option.title}</span>
                                <span className="text-xs text-gray-500">{option.subtitle}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

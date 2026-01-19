import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
    message?: string;
    suggestion?: string;
    onRetry?: () => void;
    className?: string;
}

/**
 * 错误状态组件 - 友好的错误提示
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
    message = '哎呀，出了点小问题',
    suggestion = '试试刷新页面，或者稍后再来',
    onRetry,
    className = ''
}) => (
    <div className={`clay-card text-center py-10 px-6 border-l-4 border-brand-error ${className}`}>
        <div className="text-4xl mb-3">🤔</div>
        <h3 className="text-display text-brand-textDark mb-2">{message}</h3>
        <p className="text-caption text-brand-textLight mb-4 max-w-xs mx-auto">{suggestion}</p>
        {onRetry && (
            <Button
                onClick={onRetry}
                variant="secondary"
                icon={<i className="fas fa-redo" />}
            >
                再试一次
            </Button>
        )}
    </div>
);

/**
 * 预定义错误消息
 */
export const ERROR_MESSAGES = {
    network: {
        message: '网络连接不太顺畅',
        suggestion: '检查一下网络，然后再试试'
    },
    ai: {
        message: 'AI老师开小差了',
        suggestion: '换个方式再试试，或者稍后再来'
    },
    upload: {
        message: '上传遇到问题',
        suggestion: '检查一下文件格式和大小后重试'
    },
    load: {
        message: '内容加载失败',
        suggestion: '刷新页面试试，或者稍后再来'
    },
    save: {
        message: '保存失败了',
        suggestion: '检查网络连接后再试一次'
    },
    permission: {
        message: '权限不足',
        suggestion: '请联系家长账号进行操作'
    },
    notFound: {
        message: '找不到这个内容',
        suggestion: '它可能已经被删除了'
    },
    generic: {
        message: '出了点小问题',
        suggestion: '稍后再试试，问题可能会自行解决'
    }
} as const;

/**
 * 网络错误组件
 */
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <ErrorState {...ERROR_MESSAGES.network} onRetry={onRetry} />
);

/**
 * AI错误组件
 */
export const AIError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <ErrorState {...ERROR_MESSAGES.ai} onRetry={onRetry} />
);

/**
 * 加载错误组件
 */
export const LoadError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <ErrorState {...ERROR_MESSAGES.load} onRetry={onRetry} />
);

/**
 * 内联错误提示 - 用于表单或小区域
 */
export const InlineError: React.FC<{ message: string; className?: string }> = ({
    message,
    className = ''
}) => (
    <div className={`flex items-center gap-2 text-brand-errorDark text-caption p-2 bg-brand-error/10 rounded-card-sm ${className}`}>
        <i className="fas fa-exclamation-circle text-sm" />
        <span>{message}</span>
    </div>
);

/**
 * 将技术错误转换为用户友好消息
 */
export function formatErrorMessage(error: unknown): { message: string; suggestion: string } {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
            return ERROR_MESSAGES.network;
        }
        if (msg.includes('ai') || msg.includes('gemini') || msg.includes('openai')) {
            return ERROR_MESSAGES.ai;
        }
        if (msg.includes('upload') || msg.includes('file')) {
            return ERROR_MESSAGES.upload;
        }
        if (msg.includes('not found') || msg.includes('404')) {
            return ERROR_MESSAGES.notFound;
        }
        if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('403')) {
            return ERROR_MESSAGES.permission;
        }
    }

    return ERROR_MESSAGES.generic;
}

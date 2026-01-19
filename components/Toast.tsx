import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

/**
 * Toast 提示组件 - 底部弹出，支持多种状态
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onClose
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 200); // 提前 200ms 开始退出动画

    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-brand-darkTeal to-brand-teal',
      icon: '✓',
      iconBg: 'bg-white/20'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-red-400',
      icon: '!',
      iconBg: 'bg-white/20'
    },
    info: {
      bg: 'bg-gradient-to-r from-brand-blue to-blue-400',
      icon: 'i',
      iconBg: 'bg-white/20'
    },
    warning: {
      bg: 'bg-gradient-to-r from-brand-secondaryDark to-brand-secondary',
      icon: '⚠',
      iconBg: 'bg-white/20'
    }
  };

  const currentStyle = styles[type];

  return (
    <div
      className={`
        fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50
        ${isExiting ? 'animate-exit' : 'animate-enter'}
      `}
    >
      <div
        className={`
          ${currentStyle.bg} text-white 
          px-5 py-3 rounded-full shadow-elev-2
          flex items-center gap-3 min-w-[200px] max-w-[90vw]
          backdrop-blur-sm
        `}
      >
        {/* 图标 */}
        <span
          className={`
            ${currentStyle.iconBg} 
            w-6 h-6 rounded-full 
            flex items-center justify-center 
            text-sm font-bold
            ${type === 'success' ? 'animate-success-check' : ''}
          `}
        >
          {currentStyle.icon}
        </span>

        {/* 消息 */}
        <span className="font-bold text-body flex-1 truncate">{message}</span>
      </div>
    </div>
  );
};

/**
 * Toast 容器 - 用于管理多个 Toast
 */
interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
    {toasts.map((toast) => (
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type}
        onClose={() => onRemove(toast.id)}
      />
    ))}
  </div>
);

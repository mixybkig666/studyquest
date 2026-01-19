import React, { useEffect, useState } from 'react';
import { useReducedMotion, useConfettiData } from '../hooks/useMotion';

interface ConfettiProps {
    /** 是否显示彩纸 */
    show: boolean;
    /** 彩纸数量 */
    count?: number;
    /** 动画结束后回调 */
    onComplete?: () => void;
}

/**
 * 彩纸庆祝动效组件
 * 用于任务完成、成就解锁等庆祝场景
 */
export const Confetti: React.FC<ConfettiProps> = ({
    show,
    count = 50,
    onComplete
}) => {
    const reduceMotion = useReducedMotion();
    const [isVisible, setIsVisible] = useState(show);
    const confettiData = useConfettiData(count);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            // 动画结束后隐藏
            const timer = setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    // 减少动态模式下不显示
    if (reduceMotion || !isVisible) {
        return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {confettiData.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute w-3 h-3 rounded-sm animate-confetti"
                    style={{
                        left: piece.left,
                        top: '-12px',
                        backgroundColor: piece.color,
                        animationDelay: piece.delay,
                        animationDuration: piece.duration,
                        transform: `rotate(${Math.random() * 360}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

/**
 * 星星闪烁动效
 */
export const Sparkles: React.FC<{ show: boolean }> = ({ show }) => {
    const reduceMotion = useReducedMotion();

    if (reduceMotion || !show) return null;

    const sparkles = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: `${10 + Math.random() * 80}%`,
        top: `${10 + Math.random() * 80}%`,
        delay: `${Math.random() * 500}ms`,
        size: 8 + Math.random() * 12,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {sparkles.map((s) => (
                <div
                    key={s.id}
                    className="absolute animate-pop text-brand-secondary"
                    style={{
                        left: s.left,
                        top: s.top,
                        animationDelay: s.delay,
                        fontSize: `${s.size}px`,
                    }}
                >
                    ✨
                </div>
            ))}
        </div>
    );
};

/**
 * 成就光环动效
 */
export const GlowRing: React.FC<{ show: boolean; color?: string }> = ({
    show,
    color = 'rgba(255, 138, 101, 0.4)'
}) => {
    const reduceMotion = useReducedMotion();

    if (reduceMotion || !show) return null;

    return (
        <div
            className="absolute inset-0 rounded-full animate-glow-pulse pointer-events-none"
            style={{ boxShadow: `0 0 0 0 ${color}` }}
        />
    );
};

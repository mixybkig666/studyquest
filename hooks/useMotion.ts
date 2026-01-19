import { useState, useEffect } from 'react';

/**
 * 检测用户是否开启了"减少动态"无障碍设置
 */
export function useReducedMotion(): boolean {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        // 检查系统偏好
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(mediaQuery.matches);

        // 监听变化
        const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return reduceMotion;
}

/**
 * 动效时长常量
 */
export const MOTION = {
    // 快速反馈（hover/press）
    instant: 100,
    // 进入/退出动效
    fast: 200,
    // 抽屉/模态
    normal: 280,
    // 庆祝动效
    slow: 400,
    celebration: 600,
    // 瀑布延迟
    staggerDelay: 40,
    // 缓动曲线
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * 生成瀑布动画延迟样式
 */
export function useStaggerAnimation<T>(
    items: T[],
    baseDelay: number = MOTION.staggerDelay
): Array<{ animationDelay: string; style: React.CSSProperties }> {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return items.map(() => ({
            animationDelay: '0ms',
            style: { animationDelay: '0ms' }
        }));
    }

    return items.map((_, index) => ({
        animationDelay: `${index * baseDelay}ms`,
        style: { animationDelay: `${index * baseDelay}ms` }
    }));
}

/**
 * 按压反馈样式
 */
export function usePressAnimationClass(): string {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return 'active:opacity-70 transition-opacity duration-100';
    }

    return 'active:scale-[0.97] active:shadow-elev-1 transition-all duration-[80ms] ease-out';
}

/**
 * 进入动画 hook
 */
export function useEnterAnimation(shouldAnimate: boolean = true): {
    className: string;
    style: React.CSSProperties;
} {
    const reduceMotion = useReducedMotion();

    if (!shouldAnimate || reduceMotion) {
        return {
            className: '',
            style: {}
        };
    }

    return {
        className: 'animate-enter',
        style: {}
    };
}

/**
 * 带延迟的进入动画
 */
export function useDelayedEnter(delay: number = 0): {
    className: string;
    style: React.CSSProperties;
} {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return { className: '', style: {} };
    }

    return {
        className: 'animate-enter',
        style: { animationDelay: `${delay}ms` }
    };
}

/**
 * 彩纸庆祝动效数据生成
 */
export function useConfettiData(count: number = 50): Array<{
    id: number;
    left: string;
    color: string;
    delay: string;
    duration: string;
}> {
    const colors = ['#FF8A65', '#FFCA28', '#81C784', '#B39DDB', '#64B5F6'];

    return Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: colors[i % colors.length],
        delay: `${Math.random() * 600}ms`,
        duration: `${600 + Math.random() * 400}ms`,
    }));
}

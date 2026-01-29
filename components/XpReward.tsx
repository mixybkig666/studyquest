import React, { useEffect, useState } from 'react';

interface XpRewardProps {
    amount: number;
    onComplete?: () => void;
    showCombo?: boolean;
    comboCount?: number;
}

/**
 * XP 奖励动画组件
 * 答对题目时显示金币飞向右上角的动画效果
 */
export const XpReward: React.FC<XpRewardProps> = ({
    amount,
    onComplete,
    showCombo = false,
    comboCount = 1,
}) => {
    const [particles, setParticles] = useState<{ id: number; x: number; delay: number }[]>([]);
    const [showNumber, setShowNumber] = useState(true);

    useEffect(() => {
        // 生成多个粒子
        const newParticles = Array.from({ length: Math.min(amount / 2, 8) }, (_, i) => ({
            id: i,
            x: Math.random() * 60 - 30, // 随机水平偏移
            delay: i * 50, // 错开动画
        }));
        setParticles(newParticles);

        // 动画结束后回调
        const timer = setTimeout(() => {
            setShowNumber(false);
            onComplete?.();
        }, 1500);

        return () => clearTimeout(timer);
    }, [amount, onComplete]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {/* XP 数字弹出 */}
            {showNumber && (
                <div
                    className="absolute left-1/2 top-1/3 -translate-x-1/2 animate-bounce-up"
                    style={{ animation: 'bounceUp 0.6s ease-out forwards' }}
                >
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-2xl px-4 py-2 rounded-full shadow-lg">
                        <span>⭐</span>
                        <span>+{amount} XP</span>
                    </div>
                </div>
            )}

            {/* 连击提示 */}
            {showCombo && comboCount > 1 && (
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ animation: 'comboIn 0.4s ease-out forwards' }}
                >
                    <div className={`font-black text-4xl ${comboCount >= 5 ? 'text-red-500' :
                            comboCount >= 3 ? 'text-orange-500' : 'text-yellow-500'
                        }`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                        🔥 Combo x{comboCount}!
                    </div>
                </div>
            )}

            {/* 金币粒子飞向右上角 */}
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="absolute left-1/2 top-1/3 text-2xl"
                    style={{
                        animation: `flyToCorner 0.8s ease-in forwards`,
                        animationDelay: `${particle.delay}ms`,
                        transform: `translateX(${particle.x}px)`,
                    }}
                >
                    ⭐
                </div>
            ))}

            {/* 小彩花 */}
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i],
                            animation: `sparkle 0.6s ease-out forwards`,
                            animationDelay: `${i * 50}ms`,
                            transform: `rotate(${i * 60}deg) translateY(-20px)`,
                        }}
                    />
                ))}
            </div>

            <style>{`
                @keyframes bounceUp {
                    0% { opacity: 0; transform: translate(-50%, 20px) scale(0.5); }
                    50% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); }
                    100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }
                
                @keyframes flyToCorner {
                    0% { opacity: 1; }
                    100% { 
                        opacity: 0; 
                        transform: translate(calc(50vw - 60px), -30vh) scale(0.5);
                    }
                }
                
                @keyframes sparkle {
                    0% { opacity: 1; transform: rotate(var(--rotate, 0deg)) translateY(0) scale(1); }
                    100% { opacity: 0; transform: rotate(var(--rotate, 0deg)) translateY(-40px) scale(0); }
                }
                
                @keyframes comboIn {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(0.9); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `}</style>
        </div>
    );
};

/**
 * 答对时的小音效提示（可选）
 */
export const playCorrectSound = () => {
    // 使用 Web Audio API 生成简单的"叮"声
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        // 忽略音频错误
    }
};

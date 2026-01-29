/**
 * 触屏软键盘组件
 * 适合儿童操作的英文字母键盘
 */

import React, { useCallback } from 'react';

interface WordKeyboardProps {
    onKeyPress: (key: string) => void;
    disabled?: boolean;
}

// 键盘布局
const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export function WordKeyboard({ onKeyPress, disabled }: WordKeyboardProps) {
    const handleKeyClick = useCallback((key: string) => {
        if (disabled) return;

        // 播放按键音效
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleV0yOnWmv7h5RwoLXJWspIJYLBxIe5qbh2s/IkVlfoZ1XEI2VHN8dGZUTFxscm9eVFJfaW5rY1pgZ25xaGBdY2ZoZGNkZ2hnZGNmaGdlZGVmZmRlZ2dmZGVmZmVlZWZmZWVmZmZlZWZmZmVlZmZmZWVmZmZlZmZm');
            audio.volume = 0.1;
            audio.play().catch(() => { });
        } catch { }

        onKeyPress(key);
    }, [onKeyPress, disabled]);

    return (
        <div className="word-keyboard">
            <style>{`
                .word-keyboard {
                    margin-top: 20px;
                    padding: 12px;
                    background: #f0f4f8;
                    border-radius: 16px;
                }

                .word-keyboard__row {
                    display: flex;
                    justify-content: center;
                    gap: 6px;
                    margin-bottom: 8px;
                }

                .word-keyboard__row:last-child {
                    margin-bottom: 0;
                }

                .word-keyboard__key {
                    min-width: 32px;
                    height: 44px;
                    padding: 0 8px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(180deg, #fff 0%, #f5f5f5 100%);
                    box-shadow: 
                        0 2px 4px rgba(0, 0, 0, 0.1),
                        0 -1px 0 rgba(255, 255, 255, 0.5) inset;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.1s;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }

                .word-keyboard__key:hover {
                    background: linear-gradient(180deg, #f5f5f5 0%, #eee 100%);
                }

                .word-keyboard__key:active {
                    transform: translateY(2px);
                    box-shadow: 
                        0 1px 2px rgba(0, 0, 0, 0.1),
                        0 -1px 0 rgba(255, 255, 255, 0.5) inset;
                    background: linear-gradient(180deg, #eee 0%, #e0e0e0 100%);
                }

                .word-keyboard__key--action {
                    min-width: 60px;
                    font-size: 0.85rem;
                }

                .word-keyboard__key--backspace {
                    background: linear-gradient(180deg, #ffebee 0%, #ffcdd2 100%);
                    color: #c62828;
                }

                .word-keyboard__key--backspace:hover {
                    background: linear-gradient(180deg, #ffcdd2 0%, #ef9a9a 100%);
                }

                .word-keyboard__key--enter {
                    min-width: 80px;
                    background: linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%);
                    color: #2e7d32;
                }

                .word-keyboard__key--enter:hover {
                    background: linear-gradient(180deg, #c8e6c9 0%, #a5d6a7 100%);
                }

                .word-keyboard__key--space {
                    min-width: 120px;
                    font-size: 0.8rem;
                    color: #888;
                }

                .word-keyboard__key:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* 适配小屏幕 */
                @media (max-width: 380px) {
                    .word-keyboard__key {
                        min-width: 28px;
                        height: 40px;
                        font-size: 1rem;
                    }

                    .word-keyboard__row {
                        gap: 4px;
                    }
                }
            `}</style>

            {/* 字母行 */}
            {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="word-keyboard__row">
                    {/* 第三行开头加入删除键 */}
                    {rowIndex === 2 && (
                        <button
                            className="word-keyboard__key word-keyboard__key--action word-keyboard__key--backspace"
                            onClick={() => handleKeyClick('backspace')}
                            disabled={disabled}
                        >
                            ⌫
                        </button>
                    )}

                    {row.map(key => (
                        <button
                            key={key}
                            className="word-keyboard__key"
                            onClick={() => handleKeyClick(key)}
                            disabled={disabled}
                        >
                            {key}
                        </button>
                    ))}

                    {/* 第三行结尾加入确认键 */}
                    {rowIndex === 2 && (
                        <button
                            className="word-keyboard__key word-keyboard__key--action word-keyboard__key--enter"
                            onClick={() => handleKeyClick('enter')}
                            disabled={disabled}
                        >
                            确认
                        </button>
                    )}
                </div>
            ))}

            {/* 功能行 */}
            <div className="word-keyboard__row">
                <button
                    className="word-keyboard__key word-keyboard__key--space"
                    onClick={() => handleKeyClick(' ')}
                    disabled={disabled}
                >
                    空格 (词组专用)
                </button>
            </div>
        </div>
    );
}

export default WordKeyboard;

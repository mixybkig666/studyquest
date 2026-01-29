/**
 * 单词卡片组件
 * 用于拼写模式的核心交互组件
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Word, LetterState } from '../types/word';
import { usePronunciation } from '../hooks/usePronunciation';

interface WordCardProps {
    word: Word;
    mode: 'recognize' | 'spell' | 'challenge';
    onComplete: (correct: boolean, hintsUsed: number) => void;
    showXpReward?: (xp: number) => void;
}

export function WordCard({ word, mode, onComplete, showXpReward }: WordCardProps) {
    const { speak, speaking } = usePronunciation();

    // 用户输入
    const [input, setInput] = useState('');
    // 提示次数
    const [hintsUsed, setHintsUsed] = useState(0);
    // 显示提示
    const [showHint, setShowHint] = useState(false);
    // 答题结果
    const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
    // 是否已提交
    const [submitted, setSubmitted] = useState(false);

    // 目标单词（去掉空格用于比较）
    const targetWord = word.word.toLowerCase().trim();
    // 去除空格的版本（用于比较）
    const targetWordNoSpaces = targetWord.replace(/\s+/g, '');

    // 输入框引用
    const inputRef = useRef<HTMLInputElement>(null);

    // 重置状态
    useEffect(() => {
        setInput('');
        setHintsUsed(0);
        setShowHint(false);
        setResult('idle');
        setSubmitted(false);
        // 自动聚焦输入框
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [word]);

    // 自动播放发音
    useEffect(() => {
        if (mode === 'spell') {
            speak(word.word, 'us');
        }
    }, [word.word, mode, speak]);

    // 获取字母状态
    const getLetterStates = useCallback((): LetterState[] => {
        return targetWord.split('').map((char, i) => {
            const userChar = input[i]?.toLowerCase() || '';
            let status: LetterState['status'] = 'pending';

            if (i < input.length) {
                status = userChar === char ? 'correct' : 'wrong';
            }

            return { char, status, userInput: userChar };
        });
    }, [targetWord, input]);

    // 检查答案（忽略空格）
    const checkAnswer = useCallback(() => {
        if (submitted) return;

        const userInputNoSpaces = input.toLowerCase().trim().replace(/\s+/g, '');
        const isCorrect = userInputNoSpaces === targetWordNoSpaces;
        setResult(isCorrect ? 'correct' : 'wrong');
        setSubmitted(true);

        if (isCorrect && showXpReward) {
            const xp = Math.max(5, 10 - hintsUsed * 2);
            showXpReward(xp);
        }

        // 延迟后回调
        setTimeout(() => {
            onComplete(isCorrect, hintsUsed);
        }, isCorrect ? 1500 : 2500);
    }, [input, targetWordNoSpaces, submitted, hintsUsed, onComplete, showXpReward]);

    // 使用提示
    const useHint = useCallback(() => {
        if (hintsUsed === 0) {
            // 第一次提示：显示首字母
            setShowHint(true);
        } else if (hintsUsed === 1) {
            // 第二次提示：填充首字母
            if (input.length === 0) {
                setInput(targetWord[0]);
            }
        } else if (hintsUsed === 2) {
            // 第三次提示：显示一半字母
            const half = Math.ceil(targetWord.length / 2);
            setInput(targetWord.slice(0, half));
        }
        setHintsUsed(h => h + 1);
    }, [hintsUsed, input, targetWord]);

    // 键盘输入处理
    const handleKeyPress = useCallback((key: string) => {
        if (submitted) return;

        if (key === 'backspace') {
            setInput(prev => prev.slice(0, -1));
        } else if (key === 'enter') {
            if (input.length > 0) {
                checkAnswer();
            }
        } else if (/^[a-zA-Z\s-]$/.test(key)) {
            setInput(prev => prev + key.toLowerCase());
        }
    }, [submitted, input, checkAnswer]);

    // 物理键盘事件
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                handleKeyPress('backspace');
            } else if (e.key === 'Enter') {
                handleKeyPress('enter');
            } else if (/^[a-zA-Z\s-]$/.test(e.key)) {
                handleKeyPress(e.key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    const letterStates = getLetterStates();

    return (
        <div className="word-card">
            <style>{`
                .word-card {
                    background: linear-gradient(145deg, #ffffff, #f0f4f8);
                    border-radius: 24px;
                    padding: 32px;
                    box-shadow: 
                        8px 8px 16px rgba(0, 0, 0, 0.08),
                        -8px -8px 16px rgba(255, 255, 255, 0.9);
                    max-width: 95%;
                    width: 100%;
                    margin: 0 auto;
                }

                .word-card__translation {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #333;
                    text-align: center;
                    margin-bottom: 12px;
                }

                .word-card__phonetic {
                    font-size: 0.9rem;
                    color: #888;
                    text-align: center;
                    margin-bottom: 16px;
                }

                .word-card__pronunciation {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .word-card__speak-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    border: none;
                    background: linear-gradient(145deg, #4ECDC4, #45B7AA);
                    color: white;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 3px 6px rgba(78, 205, 196, 0.3);
                }

                .word-card__speak-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(78, 205, 196, 0.4);
                }

                .word-card__speak-btn:active {
                    transform: translateY(0);
                }

                .word-card__speak-btn.speaking {
                    animation: pulse 1s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                .word-card__hint {
                    text-align: center;
                    color: #888;
                    font-size: 0.9rem;
                    margin-bottom: 16px;
                    min-height: 24px;
                }

                .word-card__hint span {
                    font-weight: 700;
                    color: #8B5CF6;
                    font-size: 1.1rem;
                }

                .word-card__letters {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    padding: 16px 0;
                }

                .word-card__letter {
                    width: 52px;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.8rem;
                    font-weight: 700;
                    border-radius: 12px;
                    transition: all 0.2s;
                    text-transform: uppercase;
                }

                .word-card__letter--pending {
                    background: #f0f4f8;
                    border: 2px dashed #ccc;
                    color: transparent;
                }

                .word-card__letter--correct {
                    background: linear-gradient(145deg, #10B981, #059669);
                    border: none;
                    color: white;
                    animation: popIn 0.2s ease-out;
                }

                .word-card__letter--wrong {
                    background: linear-gradient(145deg, #F59E0B, #D97706);
                    border: none;
                    color: white;
                    animation: shake 0.3s ease-out;
                }

                @keyframes popIn {
                    0% { transform: scale(0.8); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }

                .word-card__actions {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .word-card__btn {
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: none;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .word-card__btn--hint {
                    background: #f0f4f8;
                    color: #666;
                }

                .word-card__btn--hint:hover {
                    background: #e0e4e8;
                }

                .word-card__btn--hint:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .word-card__btn--submit {
                    background: linear-gradient(145deg, #8B5CF6, #7C3AED);
                    color: white;
                    box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
                }

                .word-card__btn--submit:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4);
                }

                .word-card__btn--submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .word-card__result {
                    text-align: center;
                    padding: 16px;
                    border-radius: 12px;
                    margin-top: 16px;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .word-card__result--correct {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10B981;
                }

                .word-card__result--wrong {
                    background: rgba(245, 158, 11, 0.1);
                    color: #D97706;
                }

                .word-card__correct-answer {
                    font-size: 1.5rem;
                    color: #333;
                    margin-top: 8px;
                }

                .word-card__sentence {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 12px 16px;
                    margin-top: 16px;
                    font-size: 0.9rem;
                }

                .word-card__sentence-en {
                    color: #333;
                    margin-bottom: 4px;
                }

                .word-card__sentence-cn {
                    color: #888;
                    font-size: 0.85rem;
                }
            `}</style>

            {/* 中文释义 */}
            <div className="word-card__translation">
                {word.translations.map((t, i) => (
                    <span key={i}>
                        {t.pos} {t.meaning}
                        {i < word.translations.length - 1 ? '；' : ''}
                    </span>
                ))}
            </div>

            {/* 音标（答对后显示） */}
            {result === 'correct' && word.phonetic_us && (
                <div className="word-card__phonetic">
                    {word.phonetic_us}
                </div>
            )}

            {/* 发音按钮 */}
            <div className="word-card__pronunciation">
                <button
                    className={`word-card__speak-btn ${speaking ? 'speaking' : ''}`}
                    onClick={() => speak(word.word, 'us')}
                    disabled={speaking}
                >
                    🔊 美音
                </button>
                <button
                    className={`word-card__speak-btn ${speaking ? 'speaking' : ''}`}
                    onClick={() => speak(word.word, 'uk')}
                    disabled={speaking}
                >
                    🔊 英音
                </button>
            </div>

            {/* 提示 */}
            <div className="word-card__hint">
                {showHint && (
                    <>
                        💡 首字母: <span>{targetWord[0].toUpperCase()}</span>
                        ，共 {targetWord.length} 个字母
                    </>
                )}
            </div>

            {/* 字母槽 */}
            <div className="word-card__letters">
                {letterStates.map((letter, i) => (
                    <div
                        key={i}
                        className={`word-card__letter word-card__letter--${letter.status}`}
                    >
                        {letter.status === 'pending'
                            ? (result === 'wrong' ? letter.char : '_')
                            : letter.userInput?.toUpperCase()}
                    </div>
                ))}
            </div>

            {/* 操作按钮 */}
            {!submitted && (
                <div className="word-card__actions">
                    <button
                        className="word-card__btn word-card__btn--hint"
                        onClick={useHint}
                        disabled={hintsUsed >= 3}
                    >
                        💡 提示 ({3 - hintsUsed})
                    </button>
                    <button
                        className="word-card__btn word-card__btn--submit"
                        onClick={checkAnswer}
                        disabled={input.length === 0}
                    >
                        确认 ✓
                    </button>
                </div>
            )}

            {/* 结果反馈 */}
            {submitted && (
                <div className={`word-card__result word-card__result--${result}`}>
                    {result === 'correct' ? (
                        <>
                            🎉 太棒了！
                        </>
                    ) : (
                        <>
                            💪 加油！正确答案是：
                            <div className="word-card__correct-answer">
                                {word.word}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 例句 */}
            {result !== 'idle' && word.sentences && word.sentences[0] && (
                <div className="word-card__sentence">
                    <div className="word-card__sentence-en">
                        {word.sentences[0].en}
                    </div>
                    <div className="word-card__sentence-cn">
                        {word.sentences[0].cn}
                    </div>
                </div>
            )}

            {/* 输入提示（使用物理键盘） */}
            {!submitted && (
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: '#888'
                }}>
                    ⌨️ 直接用键盘输入，按 Enter 确认
                </div>
            )}
        </div>
    );
}

export default WordCard;

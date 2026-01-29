/**
 * 单词练习主页面
 * 整合词库选择、模式选择、练习流程和结果小结
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Word, WordBookMeta, PracticeMode, PracticeSummary } from '../types/word';
import { wordService } from '../services/wordService';
import { WordCard } from '../components/WordCard';
import { WordBookSelector } from '../components/WordBookSelector';
import { XpReward } from '../components/XpReward';
import { TextbookUploader } from '../components/TextbookUploader';

interface WordPracticeProps {
    userId: string;
    onBack: () => void;
}

type ViewState = 'select-book' | 'select-mode' | 'practice' | 'summary' | 'upload-textbook';

export function WordPractice({ userId, onBack }: WordPracticeProps) {
    // 状态
    const [viewState, setViewState] = useState<ViewState>('select-book');
    const [wordBooks, setWordBooks] = useState<WordBookMeta[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [selectedMode, setSelectedMode] = useState<PracticeMode>('spell');
    const [practiceWords, setPracticeWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState<{ word: string; correct: boolean }[]>([]);
    const [summary, setSummary] = useState<PracticeSummary | null>(null);
    const [loading, setLoading] = useState(false);

    // XP 奖励
    const [showXp, setShowXp] = useState(false);
    const [xpAmount, setXpAmount] = useState(0);
    const [comboCount, setComboCount] = useState(0);

    // 加载词库列表
    useEffect(() => {
        async function loadBooks() {
            setLoading(true);
            try {
                const books = await wordService.getWordBooks(userId);
                setWordBooks(books);
            } catch (err) {
                console.error('Failed to load word books:', err);
            }
            setLoading(false);
        }
        loadBooks();
    }, [userId]);

    // 选择词库
    const handleSelectBook = useCallback((bookId: string) => {
        setSelectedBookId(bookId);
        setViewState('select-mode');
    }, []);

    // 课本上传成功
    const handleTextbookSuccess = useCallback(async (bookId: string, words: Word[]) => {
        // 刷新词库列表
        const books = await wordService.getWordBooks(userId);
        setWordBooks(books);
        // 自动选择新创建的词库
        setSelectedBookId(bookId);
        setViewState('select-mode');
    }, [userId]);

    // 开始练习
    const handleStartPractice = useCallback(async (mode: PracticeMode) => {
        setSelectedMode(mode);
        setLoading(true);

        try {
            const words = await wordService.getWordsForPractice(userId, selectedBookId, 10);
            if (words.length === 0) {
                alert('该词库暂无可练习的单词');
                setLoading(false);
                return;
            }

            setPracticeWords(words);
            setCurrentIndex(0);
            setResults([]);
            setComboCount(0);
            setViewState('practice');
        } catch (err) {
            console.error('Failed to load practice words:', err);
        }

        setLoading(false);
    }, [userId, selectedBookId]);

    // 完成一个单词
    const handleWordComplete = useCallback(async (correct: boolean, hintsUsed: number) => {
        const currentWord = practiceWords[currentIndex];

        // 记录结果
        setResults(prev => [...prev, { word: currentWord.word, correct }]);

        // 更新连击
        if (correct) {
            setComboCount(prev => prev + 1);
        } else {
            setComboCount(0);
        }

        // 保存到数据库
        await wordService.recordAnswer(userId, currentWord.word, selectedBookId, correct);

        // 进入下一个或结束
        if (currentIndex < practiceWords.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // 练习结束，计算小结
            const allResults = [...results, { word: currentWord.word, correct }];
            const sum = wordService.calculateSummary(allResults);
            setSummary(sum);
            setViewState('summary');
        }
    }, [currentIndex, practiceWords, results, userId, selectedBookId]);

    // 显示 XP 奖励
    const handleShowXp = useCallback((xp: number) => {
        setXpAmount(xp);
        setShowXp(true);
        setTimeout(() => setShowXp(false), 1500);
    }, []);

    // 返回词库选择
    const handleBackToBooks = useCallback(() => {
        setViewState('select-book');
        setSelectedBookId('');
        setPracticeWords([]);
        setResults([]);
        setSummary(null);
    }, []);

    // 再练一次
    const handlePracticeAgain = useCallback(() => {
        handleStartPractice(selectedMode);
    }, [handleStartPractice, selectedMode]);

    return (
        <div className="word-practice">
            <style>{`
                .word-practice {
                    min-height: 100vh;
                    background: linear-gradient(180deg, #FFF9F0 0%, #F0F4F8 100%);
                    padding-bottom: 40px;
                }

                .word-practice__header {
                    display: flex;
                    align-items: center;
                    padding: 16px 20px;
                    background: white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .word-practice__back-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 8px;
                    margin-right: 8px;
                }

                .word-practice__title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #333;
                }

                .word-practice__content {
                    padding: 20px;
                    max-width: 480px;
                    margin: 0 auto;
                }

                .word-practice__mode-select {
                    margin-top: 20px;
                }

                .word-practice__mode-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #333;
                    text-align: center;
                    margin-bottom: 20px;
                }

                .word-practice__modes {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .word-practice__mode-card {
                    display: flex;
                    align-items: center;
                    padding: 16px 20px;
                    background: linear-gradient(145deg, #ffffff, #f8f9fa);
                    border-radius: 16px;
                    box-shadow: 
                        4px 4px 8px rgba(0, 0, 0, 0.05),
                        -4px -4px 8px rgba(255, 255, 255, 0.8);
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    width: 100%;
                    text-align: left;
                }

                .word-practice__mode-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 
                        6px 6px 12px rgba(0, 0, 0, 0.08),
                        -6px -6px 12px rgba(255, 255, 255, 0.9);
                }

                .word-practice__mode-icon {
                    font-size: 2.5rem;
                    margin-right: 16px;
                }

                .word-practice__mode-info {
                    flex: 1;
                }

                .word-practice__mode-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 4px;
                }

                .word-practice__mode-desc {
                    font-size: 0.85rem;
                    color: #888;
                }

                .word-practice__progress {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 20px;
                    background: white;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .word-practice__progress-bar {
                    flex: 1;
                    height: 8px;
                    background: #e0e0e0;
                    border-radius: 4px;
                    margin: 0 16px;
                    overflow: hidden;
                }

                .word-practice__progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4ECDC4, #45B7AA);
                    border-radius: 4px;
                    transition: width 0.3s;
                }

                .word-practice__combo {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #F59E0B;
                }

                .word-practice__summary {
                    text-align: center;
                    padding: 24px;
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                }

                .word-practice__summary-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                }

                .word-practice__summary-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 20px;
                }

                .word-practice__summary-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .word-practice__stat {
                    padding: 16px;
                    background: #f8f9fa;
                    border-radius: 12px;
                }

                .word-practice__stat-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #333;
                }

                .word-practice__stat-label {
                    font-size: 0.85rem;
                    color: #888;
                    margin-top: 4px;
                }

                .word-practice__stat--highlight .word-practice__stat-value {
                    color: #4ECDC4;
                }

                .word-practice__summary-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }

                .word-practice__btn {
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: none;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .word-practice__btn--primary {
                    background: linear-gradient(145deg, #4ECDC4, #45B7AA);
                    color: white;
                    box-shadow: 0 4px 8px rgba(78, 205, 196, 0.3);
                }

                .word-practice__btn--primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(78, 205, 196, 0.4);
                }

                .word-practice__btn--secondary {
                    background: #f0f4f8;
                    color: #666;
                }

                .word-practice__btn--secondary:hover {
                    background: #e0e4e8;
                }

                .word-practice__loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 60px;
                    color: #888;
                }

                .word-practice__upload-entry {
                    margin-top: 24px;
                    padding-top: 24px;
                    border-top: 1px dashed #e0e0e0;
                }

                .word-practice__upload-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    padding: 16px 20px;
                    background: white;
                    border: 2px dashed #4ECDC4;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }

                .word-practice__upload-btn:hover {
                    background: #f0fffe;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.15);
                }

                .word-practice__upload-btn-icon {
                    font-size: 2rem;
                    margin-right: 16px;
                }

                .word-practice__upload-btn-text {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .word-practice__upload-btn-text strong {
                    font-size: 1rem;
                    color: #333;
                    margin-bottom: 2px;
                }

                .word-practice__upload-btn-text small {
                    font-size: 0.85rem;
                    color: #888;
                }

                .word-practice__upload-btn-arrow {
                    font-size: 1.25rem;
                    color: #4ECDC4;
                    font-weight: bold;
                }
            `}</style>

            {/* 头部 */}
            <div className="word-practice__header">
                <button
                    className="word-practice__back-btn"
                    onClick={viewState === 'select-book' ? onBack : handleBackToBooks}
                >
                    ←
                </button>
                <div className="word-practice__title">
                    {viewState === 'select-book' && '单词练习'}
                    {viewState === 'select-mode' && '选择模式'}
                    {viewState === 'practice' && '拼写练习'}
                    {viewState === 'summary' && '练习完成'}
                    {viewState === 'upload-textbook' && '上传课本'}
                </div>
            </div>

            <div className="word-practice__content">
                {/* 词库选择 */}
                {viewState === 'select-book' && (
                    <>
                        <WordBookSelector
                            wordBooks={wordBooks}
                            selectedBookId={selectedBookId}
                            onSelect={handleSelectBook}
                            loading={loading}
                        />
                        {/* 课本上传入口 */}
                        <div className="word-practice__upload-entry">
                            <button
                                className="word-practice__upload-btn"
                                onClick={() => setViewState('upload-textbook')}
                            >
                                <span className="word-practice__upload-btn-icon">📷</span>
                                <span className="word-practice__upload-btn-text">
                                    <strong>上传课本图片</strong>
                                    <small>AI 自动识别生成词库</small>
                                </span>
                                <span className="word-practice__upload-btn-arrow">→</span>
                            </button>
                        </div>
                    </>
                )}

                {/* 课本上传 */}
                {viewState === 'upload-textbook' && (
                    <TextbookUploader
                        userId={userId}
                        onSuccess={handleTextbookSuccess}
                        onCancel={() => setViewState('select-book')}
                    />
                )}

                {/* 模式选择 */}
                {viewState === 'select-mode' && (
                    <div className="word-practice__mode-select">
                        <div className="word-practice__mode-title">
                            🎯 选择练习模式
                        </div>
                        <div className="word-practice__modes">
                            <button
                                className="word-practice__mode-card"
                                onClick={() => handleStartPractice('spell')}
                            >
                                <div className="word-practice__mode-icon">✍️</div>
                                <div className="word-practice__mode-info">
                                    <div className="word-practice__mode-name">拼写模式</div>
                                    <div className="word-practice__mode-desc">
                                        听发音，输入单词拼写
                                    </div>
                                </div>
                            </button>

                            <button
                                className="word-practice__mode-card"
                                onClick={() => handleStartPractice('recognize')}
                            >
                                <div className="word-practice__mode-icon">👀</div>
                                <div className="word-practice__mode-info">
                                    <div className="word-practice__mode-name">认识模式</div>
                                    <div className="word-practice__mode-desc">
                                        浏览单词，加深印象
                                    </div>
                                </div>
                            </button>

                            <button
                                className="word-practice__mode-card"
                                onClick={() => handleStartPractice('challenge')}
                            >
                                <div className="word-practice__mode-icon">🎮</div>
                                <div className="word-practice__mode-info">
                                    <div className="word-practice__mode-name">挑战模式</div>
                                    <div className="word-practice__mode-desc">
                                        限时答题，检验掌握度
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* 练习中 */}
                {viewState === 'practice' && practiceWords.length > 0 && (
                    <>
                        {/* 进度条 */}
                        <div className="word-practice__progress">
                            <span>{currentIndex + 1}/{practiceWords.length}</span>
                            <div className="word-practice__progress-bar">
                                <div
                                    className="word-practice__progress-fill"
                                    style={{ width: `${((currentIndex + 1) / practiceWords.length) * 100}%` }}
                                />
                            </div>
                            {comboCount >= 3 && (
                                <span className="word-practice__combo">
                                    🔥 x{comboCount}
                                </span>
                            )}
                        </div>

                        {/* 单词卡片 */}
                        <WordCard
                            key={practiceWords[currentIndex].word}
                            word={practiceWords[currentIndex]}
                            mode={selectedMode}
                            onComplete={handleWordComplete}
                            showXpReward={handleShowXp}
                        />
                    </>
                )}

                {/* 练习小结 */}
                {viewState === 'summary' && summary && (
                    <div className="word-practice__summary">
                        <div className="word-practice__summary-icon">
                            {summary.accuracy >= 0.8 ? '🏆' : summary.accuracy >= 0.6 ? '👍' : '💪'}
                        </div>
                        <div className="word-practice__summary-title">
                            {summary.accuracy >= 0.8 ? '太棒了！' : summary.accuracy >= 0.6 ? '不错哦！' : '继续加油！'}
                        </div>

                        <div className="word-practice__summary-stats">
                            <div className="word-practice__stat word-practice__stat--highlight">
                                <div className="word-practice__stat-value">
                                    +{summary.xpEarned}
                                </div>
                                <div className="word-practice__stat-label">获得 XP</div>
                            </div>
                            <div className="word-practice__stat">
                                <div className="word-practice__stat-value">
                                    {Math.round(summary.accuracy * 100)}%
                                </div>
                                <div className="word-practice__stat-label">正确率</div>
                            </div>
                            <div className="word-practice__stat">
                                <div className="word-practice__stat-value">
                                    {summary.correctCount}/{summary.totalWords}
                                </div>
                                <div className="word-practice__stat-label">答对</div>
                            </div>
                            <div className="word-practice__stat">
                                <div className="word-practice__stat-value">
                                    x{summary.maxCombo}
                                </div>
                                <div className="word-practice__stat-label">最高连击</div>
                            </div>
                        </div>

                        <div className="word-practice__summary-actions">
                            <button
                                className="word-practice__btn word-practice__btn--secondary"
                                onClick={handleBackToBooks}
                            >
                                换个词库
                            </button>
                            <button
                                className="word-practice__btn word-practice__btn--primary"
                                onClick={handlePracticeAgain}
                            >
                                再练一组
                            </button>
                        </div>
                    </div>
                )}

                {/* 加载状态 */}
                {loading && (
                    <div className="word-practice__loading">
                        加载中...
                    </div>
                )}
            </div>

            {/* XP 奖励动画 */}
            {showXp && (
                <XpReward amount={xpAmount} showCombo={comboCount >= 3} comboCount={comboCount} onComplete={() => setShowXp(false)} />
            )}
        </div>
    );
}

export default WordPractice;

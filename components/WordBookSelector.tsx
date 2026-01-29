/**
 * 词库选择器组件
 * 按年级分组展示词库，显示学习进度
 */

import React from 'react';
import type { WordBookMeta } from '../types/word';

interface WordBookSelectorProps {
    wordBooks: WordBookMeta[];
    selectedBookId?: string;
    onSelect: (bookId: string) => void;
    loading?: boolean;
}

export function WordBookSelector({
    wordBooks,
    selectedBookId,
    onSelect,
    loading,
}: WordBookSelectorProps) {
    // 按年级分组
    const groupedBooks = wordBooks.reduce((groups, book) => {
        const grade = book.gradeLevel || 0;
        if (!groups[grade]) {
            groups[grade] = [];
        }
        groups[grade].push(book);
        return groups;
    }, {} as Record<number, WordBookMeta[]>);

    // 计算进度百分比（基于已掌握）
    const getProgressPercent = (progress?: WordBookMeta['progress'], total?: number): number => {
        if (!progress || !total) return 0;
        return total > 0 ? Math.round((progress.mastered / total) * 100) : 0;
    };

    // 获取详细进度信息
    const getProgressDetails = (progress?: WordBookMeta['progress']) => {
        if (!progress) return { learning: 0, reviewing: 0, mastered: 0 };
        return {
            learning: progress.learning,
            reviewing: progress.reviewing,
            mastered: progress.mastered,
        };
    };

    const getGradeName = (grade: number): string => {
        if (grade === 0) return '其他';
        return `${grade}年级`;
    };

    return (
        <div className="wordbook-selector">
            <style>{`
                .wordbook-selector {
                    padding: 16px;
                }

                .wordbook-selector__title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 16px;
                    text-align: center;
                }

                .wordbook-selector__group {
                    margin-bottom: 20px;
                }

                .wordbook-selector__group-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #888;
                    margin-bottom: 10px;
                    padding-left: 4px;
                }

                .wordbook-selector__list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .wordbook-selector__item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    background: linear-gradient(145deg, #ffffff, #f8f9fa);
                    border-radius: 16px;
                    box-shadow: 
                        4px 4px 8px rgba(0, 0, 0, 0.05),
                        -4px -4px 8px rgba(255, 255, 255, 0.8);
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 2px solid transparent;
                }

                .wordbook-selector__item:hover {
                    transform: translateY(-2px);
                    box-shadow: 
                        6px 6px 12px rgba(0, 0, 0, 0.08),
                        -6px -6px 12px rgba(255, 255, 255, 0.9);
                }

                .wordbook-selector__item--selected {
                    border-color: #4ECDC4;
                    background: linear-gradient(145deg, #e8fffe, #d0f5f3);
                }

                .wordbook-selector__icon {
                    font-size: 2rem;
                    margin-right: 12px;
                }

                .wordbook-selector__info {
                    flex: 1;
                }

                .wordbook-selector__name {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 4px;
                }

                .wordbook-selector__meta {
                    display: flex;
                    gap: 12px;
                    font-size: 0.8rem;
                    color: #888;
                }

                .wordbook-selector__progress {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    min-width: 60px;
                }

                .wordbook-selector__progress-bar {
                    width: 50px;
                    height: 6px;
                    background: #e0e0e0;
                    border-radius: 3px;
                    overflow: hidden;
                    margin-bottom: 4px;
                }

                .wordbook-selector__progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4ECDC4, #45B7AA);
                    border-radius: 3px;
                    transition: width 0.3s;
                }

                .wordbook-selector__progress-text {
                    font-size: 0.75rem;
                    color: #888;
                }

                .wordbook-selector__loading {
                    display: flex;
                    justify-content: center;
                    padding: 40px;
                    color: #888;
                }

                .wordbook-selector__empty {
                    text-align: center;
                    padding: 40px;
                    color: #888;
                }
            `}</style>

            <div className="wordbook-selector__title">
                📚 选择词库
            </div>

            {loading ? (
                <div className="wordbook-selector__loading">
                    加载中...
                </div>
            ) : wordBooks.length === 0 ? (
                <div className="wordbook-selector__empty">
                    暂无可用词库
                </div>
            ) : (
                Object.entries(groupedBooks)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([grade, books]) => (
                        <div key={grade} className="wordbook-selector__group">
                            <div className="wordbook-selector__group-title">
                                {getGradeName(Number(grade))}
                            </div>
                            <div className="wordbook-selector__list">
                                {books.map(book => {
                                    const percent = getProgressPercent(book.progress, book.wordCount);
                                    const details = getProgressDetails(book.progress);
                                    const isSelected = book.id === selectedBookId;

                                    return (
                                        <div
                                            key={book.id}
                                            className={`wordbook-selector__item ${isSelected ? 'wordbook-selector__item--selected' : ''}`}
                                            onClick={() => onSelect(book.id)}
                                        >
                                            <div className="wordbook-selector__icon">
                                                📖
                                            </div>
                                            <div className="wordbook-selector__info">
                                                <div className="wordbook-selector__name">
                                                    {book.name}
                                                </div>
                                                <div className="wordbook-selector__meta">
                                                    <span>{book.wordCount} 词</span>
                                                    <span style={{ color: '#4ECDC4' }}>学习中 {details.learning}</span>
                                                    <span style={{ color: '#F59E0B' }}>复习中 {details.reviewing}</span>
                                                    <span style={{ color: '#10B981' }}>已掌握 {details.mastered}</span>
                                                </div>
                                            </div>
                                            <div className="wordbook-selector__progress">
                                                <div className="wordbook-selector__progress-bar">
                                                    <div
                                                        className="wordbook-selector__progress-fill"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                                <div className="wordbook-selector__progress-text">
                                                    {percent}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
            )}
        </div>
    );
}

export default WordBookSelector;

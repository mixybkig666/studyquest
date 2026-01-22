import React from 'react';

interface SimpleMarkdownProps {
    content: string;
    className?: string;
}

/**
 * 简单 Markdown 渲染组件
 * 支持：粗体 **text**、标题 #、分隔线 ---、emoji
 */
export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content, className = '' }) => {
    /**
     * 处理内联 Markdown（粗体等）
     */
    const renderInlineMarkdown = (text: string): React.ReactNode => {
        const parts: React.ReactNode[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        let keyIndex = 0;

        while ((match = boldRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            parts.push(
                <strong key={`bold-${keyIndex++}`} className="font-bold text-stone-800">
                    {match[1]}
                </strong>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    const renderParagraph = (text: string, key: number): React.ReactNode => {
        // 检查是否是标题
        if (text.startsWith('### ')) {
            return <h3 key={key} className="text-lg font-bold mb-3 text-stone-800">{renderInlineMarkdown(text.slice(4))}</h3>;
        }
        if (text.startsWith('## ')) {
            return <h2 key={key} className="text-xl font-bold mb-4 text-stone-800">{renderInlineMarkdown(text.slice(3))}</h2>;
        }
        if (text.startsWith('# ')) {
            return <h1 key={key} className="text-2xl font-bold mb-4 text-stone-800">{renderInlineMarkdown(text.slice(2))}</h1>;
        }

        // 检查是否是分隔线
        if (text.match(/^[-*_]{3,}$/)) {
            return <hr key={key} className="my-4 border-stone-200" />;
        }

        // 检查是否是空行
        if (!text.trim()) {
            return <div key={key} className="h-2" />;
        }

        // 检查是否是列表项
        if (text.match(/^\d+\.\s/)) {
            return (
                <p key={key} className="mb-3 leading-relaxed text-stone-700 pl-4">
                    {renderInlineMarkdown(text)}
                </p>
            );
        }

        // 普通段落
        return (
            <p key={key} className="mb-4 leading-relaxed text-stone-700">
                {renderInlineMarkdown(text)}
            </p>
        );
    };

    // 按换行符分割内容
    const paragraphs = content.split('\n');

    return (
        <div className={`prose prose-stone max-w-none ${className}`}>
            {paragraphs.map((para, idx) => renderParagraph(para, idx))}
        </div>
    );
};

import React from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface SimpleMarkdownProps {
    content: string;
    className?: string;
}

/**
 * 检测文本是否包含 LaTeX 公式
 */
const containsLatex = (text: string): boolean => {
    const latexPattern = /\\(frac|times|div|sqrt|sum|int|cdot|leq|geq|neq|pm|infty|alpha|beta|pi|theta)/;
    return text.includes('$') || latexPattern.test(text);
};

/**
 * 预处理和包裹 LaTeX 公式
 */
const wrapLatexFormulas = (text: string): string => {
    let result = text;

    // 规范化双反斜杠为单反斜杠
    result = result.replace(/\\\\(frac|times|div|sqrt|sum|int|cdot|leq|geq|neq|pm|infty|alpha|beta|pi|theta)/g, '\\$1');

    // 移除已有的 $ 包裹，避免双重包裹
    result = result.replace(/\$\$([^$]+)\$\$/g, '$1');
    result = result.replace(/\$([^$]+)\$/g, '$1');

    // 包裹 \frac{a}{b}
    result = result.replace(/(\\frac\{[^}]*\}\{[^}]*\})/g, ' $$$1$$ ');

    // 包裹 \sqrt{x}
    result = result.replace(/(\\sqrt\{[^}]*\})/g, ' $$$1$$ ');

    // 包裹独立操作符 \times, \div 等
    result = result.replace(/\\(times|div|cdot|pm|leq|geq|neq|infty|alpha|beta|pi|theta)(?![a-zA-Z{])/g, ' $$\\$1$$ ');

    // 清理多余空格
    result = result.replace(/\s+/g, ' ').trim();

    return result;
};

/**
 * 简单 Markdown 渲染组件
 * 支持：粗体 **text**、标题 #、分隔线 ---、emoji、LaTeX 公式
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
                const segment = text.substring(lastIndex, match.index);
                parts.push(renderTextWithLatex(segment, `seg-${keyIndex++}`));
            }
            parts.push(
                <strong key={`bold-${keyIndex++}`} className="font-bold text-stone-800">
                    {renderTextWithLatex(match[1], `bold-inner-${keyIndex}`)}
                </strong>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            const segment = text.substring(lastIndex);
            parts.push(renderTextWithLatex(segment, `seg-final-${keyIndex++}`));
        }

        return parts.length > 0 ? parts : renderTextWithLatex(text, 'single');
    };

    /**
     * 渲染包含 LaTeX 的文本
     */
    const renderTextWithLatex = (text: string, key: string): React.ReactNode => {
        if (containsLatex(text)) {
            const wrapped = wrapLatexFormulas(text);
            return <span key={key}><Latex>{wrapped}</Latex></span>;
        }
        return <span key={key}>{text}</span>;
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

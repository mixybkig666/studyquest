import React from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface SafeTextProps {
    children: string;
    className?: string;
}

const LATEX_COMMANDS = 'frac|times|div|sqrt|sum|int|cdot|leq|geq|neq|pm|infty|alpha|beta|gamma|delta|pi|theta|lambda|sigma';

/**
 * 安全的文本渲染组件：处理 LaTeX 公式、换行符、双反斜杠等问题
 * 从 QuestMode 抽取，用于统一处理数学公式和特殊字符
 */
export const SafeText: React.FC<SafeTextProps> = ({ children, className }) => {
    if (!children) return null;
    let text = String(children);

    // ====== Step 1: 预处理 - 规范化特殊字符 ======

    // 1.1 处理换行符：将字符串 "\n" 转换为真实换行
    text = text.replace(/\\n/g, '\n');

    // 1.2 将 JSON 转义的双反斜杠 LaTeX 命令转换为单反斜杠
    text = text.replace(new RegExp(`\\\\\\\\(${LATEX_COMMANDS})`, 'g'), '\\$1');

    // 1.3 清理畸形的 $$ 标记
    text = text.replace(/\\\$\$/g, ' ');
    text = text.replace(/\$\\\$/g, ' ');

    // ====== Step 2: 检测是否包含 LaTeX ======
    const latexPattern = new RegExp(`\\\\(${LATEX_COMMANDS})`);
    const hasLatex = text.includes('$') || latexPattern.test(text);

    if (!hasLatex) {
        // 无 LaTeX，处理换行后直接返回
        const lines = text.split('\n');
        if (lines.length === 1) {
            return <span className={className}>{text}</span>;
        }
        return (
            <span className={className}>
                {lines.map((line, i) => (
                    <React.Fragment key={i}>
                        {line}
                        {i < lines.length - 1 && <br />}
                    </React.Fragment>
                ))}
            </span>
        );
    }

    // ====== Step 3: 包裹 LaTeX 公式 ======
    const wrapLatexFormulas = (input: string): string => {
        let result = input;

        // 移除已有的 $ 或 $$ 包裹，避免双重包裹
        result = result.replace(/\$\$([^$]+)\$\$/g, '$1');
        result = result.replace(/\$([^$]+)\$/g, '$1');

        // 3.1 处理 \frac{a}{b}
        result = result.replace(
            /(\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
            ' $$$1$$ '
        );

        // 3.2 处理 \sqrt{x}
        result = result.replace(
            /(\\sqrt\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
            ' $$$1$$ '
        );

        // 3.3 处理独立操作符
        result = result.replace(
            new RegExp(`\\\\(${LATEX_COMMANDS})(?![a-zA-Z{])`, 'g'),
            ' $$\\$1$$ '
        );

        // 3.4 清理多余空格
        result = result.replace(/[ \t]+/g, ' ').trim();

        return result;
    };

    // ====== Step 4: 渲染 ======
    const lines = text.split('\n');

    return (
        <span className={className}>
            {lines.map((line, lineIdx) => {
                if (!line.trim()) {
                    return <br key={lineIdx} />;
                }

                const lineHasLatex = latexPattern.test(line) || line.includes('$');

                return (
                    <React.Fragment key={lineIdx}>
                        {lineHasLatex ? (
                            <span style={{ display: 'inline' }}>
                                <Latex>{wrapLatexFormulas(line)}</Latex>
                            </span>
                        ) : (
                            <span>{line}</span>
                        )}
                        {lineIdx < lines.length - 1 && <br />}
                    </React.Fragment>
                );
            })}
        </span>
    );
};

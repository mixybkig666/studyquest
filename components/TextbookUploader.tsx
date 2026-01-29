/**
 * 课本上传组件
 * 支持上传课本图片，AI 自动解析生成词库
 */

import React, { useState, useRef, useCallback } from 'react';
import type { Attachment } from '../types';
import type { Word } from '../types/word';
import { parseTextbookForWords, createWordBookFromParsed, type TextbookParseResult } from '../services/textbookParser';

interface TextbookUploaderProps {
    userId: string;
    onSuccess: (bookId: string, words: Word[]) => void;
    onCancel: () => void;
}

type Step = 'upload' | 'parsing' | 'preview' | 'saving' | 'done';

export function TextbookUploader({ userId, onSuccess, onCancel }: TextbookUploaderProps) {
    const [step, setStep] = useState<Step>('upload');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [hints, setHints] = useState({
        gradeLevel: 4,
        publisher: '',
        unit: ''
    });
    const [parseResult, setParseResult] = useState<TextbookParseResult | null>(null);
    const [customName, setCustomName] = useState('');
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 动态引入 pdfjs
    const loadPdfJs = async () => {
        const pdfjs = await import('pdfjs-dist');
        // 设置 worker 路径，使用 cdnjs 确保稳定
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        return pdfjs;
    };

    // 处理 PDF 文件：转换为图片数组
    const processPdfFile = async (file: File): Promise<Attachment[]> => {
        try {
            const pdfjs = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

            const pdfImages: Attachment[] = [];
            const totalPages = pdf.numPages;

            // 限制最大页数，防止浏览器崩溃
            const MAX_PAGES = 50;
            const pagesToProcess = Math.min(totalPages, MAX_PAGES);

            for (let i = 1; i <= pagesToProcess; i++) {
                const page = await pdf.getPage(i);
                const scale = 1.5; // 提高清晰度
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;
                    pdfImages.push({
                        name: `${file.name}_page_${i}.jpg`,
                        type: 'image/jpeg',
                        data: canvas.toDataURL('image/jpeg', 0.8)
                    });
                }
            }

            return pdfImages;
        } catch (error) {
            console.error('PDF parsing error:', error);
            throw new Error('PDF 解析失败，请尝试上传图片');
        }
    };

    // 处理文件选择
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setError('');
        const newAttachments: Attachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 检查文件大小 (PDF放宽到 50MB)
            const maxSize = file.type === 'application/pdf' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                setError(`文件 ${file.name} 太大，超过了限制`);
                continue;
            }

            if (file.type === 'application/pdf') {
                try {
                    // PDF 转图片处理
                    const pdfImages = await processPdfFile(file);
                    newAttachments.push(...pdfImages);
                } catch (err: any) {
                    setError(err.message);
                }
            } else if (file.type.startsWith('image/')) {
                // 普通图片处理
                const base64 = await fileToBase64(file);
                newAttachments.push({
                    name: file.name,
                    type: file.type,
                    data: base64
                });
            } else {
                setError('只支持图片和 PDF 格式');
            }
        }

        setAttachments(prev => [...prev, ...newAttachments]);
    }, []);

    // 文件转 base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 删除附件
    const removeAttachment = useCallback((index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    }, []);

    // 开始解析
    const handleParse = useCallback(async () => {
        if (attachments.length === 0) {
            setError('请先上传课本图片');
            return;
        }

        setStep('parsing');
        setError('');

        try {
            const result = await parseTextbookForWords(attachments, hints);
            setParseResult(result);

            if (result.success && result.words) {
                setCustomName(result.bookInfo?.name || '');
                setStep('preview');
            } else {
                setError(result.error || '解析失败');
                setStep('upload');
            }
        } catch (err: any) {
            setError(err.message || '解析失败');
            setStep('upload');
        }
    }, [attachments, hints]);

    // 保存词库
    const handleSave = useCallback(async () => {
        if (!parseResult?.success || !parseResult.words) return;

        setStep('saving');

        try {
            const result = await createWordBookFromParsed(userId, parseResult, customName);

            if (result.success && result.bookId) {
                setStep('done');
                setTimeout(() => {
                    onSuccess(result.bookId!, parseResult.words!);
                }, 1500);
            } else {
                setError(result.error || '保存失败');
                setStep('preview');
            }
        } catch (err: any) {
            setError(err.message || '保存失败');
            setStep('preview');
        }
    }, [userId, parseResult, customName, onSuccess]);

    return (
        <div className="textbook-uploader">
            <style>{`
                .textbook-uploader {
                    background: white;
                    border-radius: 24px;
                    padding: 24px;
                    max-width: 500px;
                    margin: 0 auto;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }

                .textbook-uploader__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .textbook-uploader__title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #333;
                }

                .textbook-uploader__close {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: #f0f4f8;
                    color: #666;
                    font-size: 1.2rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .textbook-uploader__upload-area {
                    border: 2px dashed #ddd;
                    border-radius: 16px;
                    padding: 40px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #fafafa;
                }

                .textbook-uploader__upload-area:hover {
                    border-color: #4ECDC4;
                    background: #f0fffe;
                }

                .textbook-uploader__upload-icon {
                    font-size: 3rem;
                    margin-bottom: 12px;
                }

                .textbook-uploader__upload-text {
                    font-size: 1rem;
                    color: #666;
                    margin-bottom: 8px;
                }

                .textbook-uploader__upload-hint {
                    font-size: 0.8rem;
                    color: #999;
                }

                .textbook-uploader__attachments {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 16px;
                }

                .textbook-uploader__attachment {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .textbook-uploader__attachment img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .textbook-uploader__attachment-remove {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .textbook-uploader__hints {
                    margin-top: 20px;
                    padding: 16px;
                    background: #f8f9fa;
                    border-radius: 12px;
                }

                .textbook-uploader__hints-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #666;
                    margin-bottom: 12px;
                }

                .textbook-uploader__hint-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .textbook-uploader__hint-row:last-child {
                    margin-bottom: 0;
                }

                .textbook-uploader__hint-field {
                    flex: 1;
                }

                .textbook-uploader__hint-label {
                    font-size: 0.75rem;
                    color: #888;
                    margin-bottom: 4px;
                }

                .textbook-uploader__hint-input,
                .textbook-uploader__hint-select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 0.9rem;
                }

                .textbook-uploader__actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }

                .textbook-uploader__btn {
                    flex: 1;
                    padding: 14px 20px;
                    border-radius: 12px;
                    border: none;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .textbook-uploader__btn--primary {
                    background: linear-gradient(145deg, #4ECDC4, #45B7AA);
                    color: white;
                    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
                }

                .textbook-uploader__btn--primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(78, 205, 196, 0.4);
                }

                .textbook-uploader__btn--primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .textbook-uploader__btn--secondary {
                    background: #f0f4f8;
                    color: #666;
                }

                .textbook-uploader__error {
                    margin-top: 12px;
                    padding: 12px;
                    background: #fff5f5;
                    border-radius: 8px;
                    color: #e53e3e;
                    font-size: 0.9rem;
                }

                .textbook-uploader__parsing {
                    text-align: center;
                    padding: 60px 20px;
                }

                .textbook-uploader__parsing-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }

                .textbook-uploader__parsing-text {
                    font-size: 1.1rem;
                    color: #333;
                    font-weight: 600;
                }

                .textbook-uploader__parsing-hint {
                    font-size: 0.85rem;
                    color: #888;
                    margin-top: 8px;
                }

                .textbook-uploader__preview {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .textbook-uploader__preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #eee;
                }

                .textbook-uploader__preview-count {
                    font-size: 0.9rem;
                    color: #888;
                }

                .textbook-uploader__name-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #4ECDC4;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 16px;
                }

                .textbook-uploader__word-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .textbook-uploader__word-item {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    background: #f8f9fa;
                    border-radius: 10px;
                }

                .textbook-uploader__word-text {
                    font-weight: 600;
                    color: #333;
                    min-width: 100px;
                }

                .textbook-uploader__word-phonetic {
                    font-size: 0.8rem;
                    color: #888;
                    margin-left: 8px;
                }

                .textbook-uploader__word-meaning {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #666;
                    margin-left: 16px;
                }

                .textbook-uploader__done {
                    text-align: center;
                    padding: 40px 20px;
                }

                .textbook-uploader__done-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                }

                .textbook-uploader__done-text {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #10B981;
                }
            `}</style>

            {/* 头部 */}
            <div className="textbook-uploader__header">
                <div className="textbook-uploader__title">
                    📷 上传课本生成词库
                </div>
                <button className="textbook-uploader__close" onClick={onCancel}>
                    ×
                </button>
            </div>

            {/* 上传步骤 */}
            {step === 'upload' && (
                <>
                    {/* 上传区域 */}
                    <div
                        className="textbook-uploader__upload-area"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="textbook-uploader__upload-icon">📚</div>
                        <div className="textbook-uploader__upload-text">
                            点击或拖拽上传课本图片
                        </div>
                        <div className="textbook-uploader__upload-hint">
                            支持 JPG、PNG、PDF，最大 10MB
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />

                    {/* 已上传的图片 */}
                    {attachments.length > 0 && (
                        <div className="textbook-uploader__attachments">
                            {attachments.map((att, i) => (
                                <div key={i} className="textbook-uploader__attachment">
                                    <img src={att.data} alt={att.name} />
                                    <button
                                        className="textbook-uploader__attachment-remove"
                                        onClick={() => removeAttachment(i)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 提示信息 */}
                    <div className="textbook-uploader__hints">
                        <div className="textbook-uploader__hints-title">
                            📝 补充信息（可选，帮助 AI 更准确识别）
                        </div>
                        <div className="textbook-uploader__hint-row">
                            <div className="textbook-uploader__hint-field">
                                <div className="textbook-uploader__hint-label">年级</div>
                                <select
                                    className="textbook-uploader__hint-select"
                                    value={hints.gradeLevel}
                                    onChange={e => setHints(h => ({ ...h, gradeLevel: Number(e.target.value) }))}
                                >
                                    {[3, 4, 5, 6].map(g => (
                                        <option key={g} value={g}>{g}年级</option>
                                    ))}
                                </select>
                            </div>
                            <div className="textbook-uploader__hint-field">
                                <div className="textbook-uploader__hint-label">出版社</div>
                                <select
                                    className="textbook-uploader__hint-select"
                                    value={hints.publisher}
                                    onChange={e => setHints(h => ({ ...h, publisher: e.target.value }))}
                                >
                                    <option value="">自动识别</option>
                                    <option value="PEP">人教版 PEP</option>
                                    <option value="外研版">外研版</option>
                                    <option value="译林版">译林版</option>
                                    <option value="北师大版">北师大版</option>
                                </select>
                            </div>
                        </div>
                        <div className="textbook-uploader__hint-row">
                            <div className="textbook-uploader__hint-field">
                                <div className="textbook-uploader__hint-label">单元（如 Unit 3）</div>
                                <input
                                    className="textbook-uploader__hint-input"
                                    type="text"
                                    placeholder="可选"
                                    value={hints.unit}
                                    onChange={e => setHints(h => ({ ...h, unit: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="textbook-uploader__error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="textbook-uploader__actions">
                        <button
                            className="textbook-uploader__btn textbook-uploader__btn--secondary"
                            onClick={onCancel}
                        >
                            取消
                        </button>
                        <button
                            className="textbook-uploader__btn textbook-uploader__btn--primary"
                            onClick={handleParse}
                            disabled={attachments.length === 0}
                        >
                            🔍 开始解析
                        </button>
                    </div>
                </>
            )}

            {/* 解析中 */}
            {step === 'parsing' && (
                <div className="textbook-uploader__parsing">
                    <div className="textbook-uploader__parsing-icon">🔍</div>
                    <div className="textbook-uploader__parsing-text">
                        AI 正在识别课本内容...
                    </div>
                    <div className="textbook-uploader__parsing-hint">
                        这可能需要 10-30 秒
                    </div>
                </div>
            )}

            {/* 预览结果 */}
            {step === 'preview' && parseResult?.success && parseResult.words && (
                <div className="textbook-uploader__preview">
                    <div className="textbook-uploader__preview-header">
                        <span>识别结果</span>
                        <span className="textbook-uploader__preview-count">
                            共 {parseResult.words.length} 个单词
                        </span>
                    </div>

                    {/* 词库名称 */}
                    <input
                        className="textbook-uploader__name-input"
                        type="text"
                        placeholder="词库名称"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                    />

                    {/* 单词列表 */}
                    <div className="textbook-uploader__word-list">
                        {parseResult.words.slice(0, 20).map((word, i) => (
                            <div key={i} className="textbook-uploader__word-item">
                                <span className="textbook-uploader__word-text">
                                    {word.word}
                                </span>
                                {word.phonetic_us && (
                                    <span className="textbook-uploader__word-phonetic">
                                        {word.phonetic_us}
                                    </span>
                                )}
                                <span className="textbook-uploader__word-meaning">
                                    {word.translations?.[0]?.meaning || ''}
                                </span>
                            </div>
                        ))}
                        {parseResult.words.length > 20 && (
                            <div className="textbook-uploader__word-item" style={{ justifyContent: 'center', color: '#888' }}>
                                ... 还有 {parseResult.words.length - 20} 个单词
                            </div>
                        )}
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="textbook-uploader__error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="textbook-uploader__actions">
                        <button
                            className="textbook-uploader__btn textbook-uploader__btn--secondary"
                            onClick={() => setStep('upload')}
                        >
                            重新上传
                        </button>
                        <button
                            className="textbook-uploader__btn textbook-uploader__btn--primary"
                            onClick={handleSave}
                        >
                            ✓ 保存词库
                        </button>
                    </div>
                </div>
            )}

            {/* 保存中 */}
            {step === 'saving' && (
                <div className="textbook-uploader__parsing">
                    <div className="textbook-uploader__parsing-icon">💾</div>
                    <div className="textbook-uploader__parsing-text">
                        正在保存词库...
                    </div>
                </div>
            )}

            {/* 完成 */}
            {step === 'done' && (
                <div className="textbook-uploader__done">
                    <div className="textbook-uploader__done-icon">✅</div>
                    <div className="textbook-uploader__done-text">
                        词库已成功创建！
                    </div>
                </div>
            )}
        </div>
    );
}

export default TextbookUploader;

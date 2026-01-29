/**
 * Attachment Tools - 附件解析工具集
 * 
 * 支持：
 * - 图片：OCR + 内容描述（使用 Gemini Vision）
 * - PDF：提取文字（使用 pdf-parse，需安装）
 * - Excel：转结构化数据（使用 xlsx，需安装）
 * - Markdown/Text：直接返回内容
 */

import { GoogleGenAI, Type } from "@google/genai";
import { getAIConfig } from './aiService';

// 复用 AI 配置
const config = getAIConfig();

const ai = new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: {
        baseUrl: config.baseUrl,
        headers: config.headers
    }
});

// ============================================
// 类型定义
// ============================================

export interface AttachmentParseResult {
    success: boolean;
    type: 'image' | 'pdf' | 'excel' | 'markdown' | 'text';
    content: string;           // 提取的文本内容
    description?: string;      // 图片内容描述
    subject?: string;          // 推断的科目
    metadata?: Record<string, any>;
    error?: string;
}

// ============================================
// 图片分析（OCR + 内容理解）
// ============================================

export async function analyzeImage(
    base64Data: string,
    mimeType: string = 'image/jpeg'
): Promise<AttachmentParseResult> {
    try {
        // 去掉 data:image/... 前缀
        const cleanData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
                role: 'user',
                parts: [
                    {
                        text: `请分析这张图片，完成以下任务：
1. OCR 识别：提取图片中的所有文字内容
2. 内容描述：简要描述图片内容（教材页面、练习题、试卷等）
3. 科目判断：判断这是什么科目的内容（math/chinese/english/science/other）
4. 难度评估：评估内容的难度等级（小学低年级/中年级/高年级/初中）

请用 JSON 格式回复：
{
  "ocr_text": "识别的文字...",
  "description": "内容描述...",
  "subject": "math",
  "difficulty": "中年级",
  "topic": "主题/知识点"
}`
                    },
                    {
                        inlineData: {
                            mimeType,
                            data: cleanData
                        }
                    }
                ]
            }],
            config: {
                temperature: 0.2,
                maxOutputTokens: 4096
            }
        });

        const text = response.text || '';

        // 尝试解析 JSON
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    type: 'image',
                    content: parsed.ocr_text || '',
                    description: parsed.description,
                    subject: parsed.subject,
                    metadata: {
                        difficulty: parsed.difficulty,
                        topic: parsed.topic
                    }
                };
            }
        } catch {
            // JSON 解析失败，返回原始文本
        }

        return {
            success: true,
            type: 'image',
            content: text,
            description: '图片内容分析结果'
        };
    } catch (error: any) {
        console.error('[AttachmentTools] Image analysis failed:', error);
        return {
            success: false,
            type: 'image',
            content: '',
            error: error.message || 'Image analysis failed'
        };
    }
}

// ============================================
// PDF 解析（需要安装 pdf-parse）
// ============================================

export async function parsePDF(base64Data: string): Promise<AttachmentParseResult> {
    try {
        // 动态导入 pdf-parse（可能未安装）
        let pdfParse: any;
        try {
            pdfParse = (await import('pdf-parse')).default;
        } catch {
            return {
                success: false,
                type: 'pdf',
                content: '',
                error: 'PDF 解析库未安装。请运行: pnpm add pdf-parse'
            };
        }

        // 去掉 data:application/pdf;base64, 前缀
        const cleanData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const buffer = Buffer.from(cleanData, 'base64');

        const data = await pdfParse(buffer);

        return {
            success: true,
            type: 'pdf',
            content: data.text || '',
            metadata: {
                pages: data.numpages,
                info: data.info
            }
        };
    } catch (error: any) {
        console.error('[AttachmentTools] PDF parse failed:', error);
        return {
            success: false,
            type: 'pdf',
            content: '',
            error: error.message || 'PDF parse failed'
        };
    }
}

// ============================================
// Excel 解析（需要安装 xlsx）
// ============================================

export async function parseExcel(base64Data: string): Promise<AttachmentParseResult> {
    try {
        // 动态导入 xlsx（可能未安装）
        let XLSX: any;
        try {
            XLSX = await import('xlsx');
        } catch {
            return {
                success: false,
                type: 'excel',
                content: '',
                error: 'Excel 解析库未安装。请运行: pnpm add xlsx'
            };
        }

        // 去掉前缀
        const cleanData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const buffer = Buffer.from(cleanData, 'base64');

        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // 将所有 sheet 转为文本
        let allText = '';
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            allText += `=== Sheet: ${sheetName} ===\n${csv}\n\n`;
        }

        return {
            success: true,
            type: 'excel',
            content: allText,
            metadata: {
                sheets: workbook.SheetNames
            }
        };
    } catch (error: any) {
        console.error('[AttachmentTools] Excel parse failed:', error);
        return {
            success: false,
            type: 'excel',
            content: '',
            error: error.message || 'Excel parse failed'
        };
    }
}

// ============================================
// Markdown/Text 解析（直接返回）
// ============================================

export function parseText(content: string, type: 'markdown' | 'text'): AttachmentParseResult {
    return {
        success: true,
        type,
        content
    };
}

// ============================================
// 统一解析入口
// ============================================

export async function parseAttachment(
    data: string,
    type: 'image' | 'pdf' | 'excel' | 'markdown' | 'text',
    mimeType?: string
): Promise<AttachmentParseResult> {
    console.log(`[AttachmentTools] Parsing ${type} attachment...`);

    switch (type) {
        case 'image':
            return analyzeImage(data, mimeType);
        case 'pdf':
            return parsePDF(data);
        case 'excel':
            return parseExcel(data);
        case 'markdown':
        case 'text':
            // 如果是 base64，先解码
            const textContent = data.includes(',')
                ? Buffer.from(data.split(',')[1], 'base64').toString('utf-8')
                : data;
            return parseText(textContent, type);
        default:
            return {
                success: false,
                type: 'text',
                content: '',
                error: `Unsupported attachment type: ${type}`
            };
    }
}

export default {
    analyzeImage,
    parsePDF,
    parseExcel,
    parseText,
    parseAttachment
};

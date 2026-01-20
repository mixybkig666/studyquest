
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Attachment } from "../types";

// Use Cloudflare Worker proxy to bypass CORS and regional restrictions
// Worker requires X-API-Key header for authentication
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.restoremotion.xyz';
const WORKER_API_KEY = import.meta.env.VITE_WORKER_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'cf-worker-proxy',
  httpOptions: {
    baseUrl: AI_BASE_URL,
    headers: WORKER_API_KEY ? { 'X-API-Key': WORKER_API_KEY } : undefined
  }
});

// 带重试的生成函数
const generateWithRetry = async (config: any, maxRetries = 2): Promise<any> => {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 指数退避
      }
      return await ai.models.generateContent(config);
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ API call failed (attempt ${attempt + 1}):`, error.message);
      // 如果是非网络错误（如内容安全问题），不重试
      if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
        throw error;
      }
    }
  }
  throw lastError;
};

// --- SCHEMA DEFINITIONS ---

// 步骤 1: 仅生成分析和阅读材料
const MATERIAL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.OBJECT,
      properties: {
        detected_language: { type: Type.STRING, enum: ['English', 'Chinese', 'Mixed'] },
        subject: { type: Type.STRING, enum: ['math', 'chinese', 'english', 'science', 'other'] },
        topic: { type: Type.STRING },
        difficulty: { type: Type.STRING },
        summary: { type: Type.STRING }
      },
      required: ["detected_language", "subject", "topic", "difficulty"]
    },
    daily_challenge: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        reading_material: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            source_style: { type: Type.STRING }
          },
          required: ["title", "content", "source_style"]
        }
      },
      required: ["title", "reading_material"]
    }
  },
  required: ["analysis", "daily_challenge"]
};

// 步骤 2: 仅生成题目列表
const QUESTIONS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question_text: { type: Type.STRING },
          question_type: { type: Type.STRING, enum: ["choice", "fill", "true_false", "short_answer", "correction", "open_ended"] },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          expected: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING, enum: ["text", "number", "open_ended"] },
              value: { type: Type.STRING },
              unit: { type: Type.STRING },
              tolerance: { type: Type.NUMBER },
              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              evaluation_hints: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["mode", "value"]
          },
          correct_answer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          score_value: { type: Type.NUMBER },
          difficulty_tag: { type: Type.STRING, enum: ["Easy", "Medium", "Hard", "Challenge"] },
          // 语文专项标签
          chinese_skill: { type: Type.STRING, enum: ["rhetoric", "word_meaning", "character_analysis", "author_intent", "summary", "open_reflection"] },
          // 英语专项标签
          english_skill: { type: Type.STRING, enum: ["grammar_3rd_person", "grammar_there_be", "sentence_transform", "spelling", "reading"] },
          // 知识点标签
          knowledge_points: { type: Type.ARRAY, items: { type: Type.STRING } },
          // 常见错误类型
          common_mistakes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["concept", "calculation", "reading", "careless"] },
                description: { type: Type.STRING }
              }
            }
          }
        },
        required: ["question_text", "question_type", "expected", "explanation", "correct_answer", "score_value", "knowledge_points"]
      }
    }
  },
  required: ["questions"]
};

import JSON5 from 'json5';

// JSON Cleaning Helper
const cleanJson = (text: string) => {
  if (!text) return "";
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');

  // 改进：即使没有找到结尾的 '}'，只要有开始的 '{'，就尝试截取
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  } else if (start !== -1) {
    clean = clean.substring(start);
  }

  // 移除可能导致解析失败的特殊字符或 markdown 格式残留
  clean = clean.replace(/\\n/g, "\\n")
    .replace(/\\'/g, "\\'")
    .replace(/\\"/g, '\\"')
    .replace(/\\&/g, "\\&")
    .replace(/\\r/g, "\\r")
    .replace(/\\t/g, "\\t")
    .replace(/\\b/g, "\\b")
    .replace(/\\f/g, "\\f");
  // 移除控制字符
  clean = clean.replace(/[\u0000-\u0019]+/g, "");
  return clean;
}

const parseJsonWithRepair = (text: string) => {
  const cleaned = cleanJson(text);
  try {
    return JSON5.parse(cleaned);
  } catch (e) {
    console.warn("JSON5 parse failed, attempting repair...", e);

    // 计算缺失的括号数量
    let openBraces = 0, closeBraces = 0;
    let openBrackets = 0, closeBrackets = 0;
    for (const char of cleaned) {
      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
      if (char === '[') openBrackets++;
      if (char === ']') closeBrackets++;
    }

    // 构建修复后缀
    let suffix = '';
    // 如果在字符串中间截断，先补引号
    const lastQuote = cleaned.lastIndexOf('"');
    const quotes = (cleaned.match(/"/g) || []).length;
    if (quotes % 2 !== 0) suffix += '"';

    // 补足缺失的括号
    for (let i = 0; i < openBrackets - closeBrackets; i++) suffix += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) suffix += '}';

    if (suffix) {
      try {
        return JSON5.parse(cleaned + suffix);
      } catch (err) {
        console.warn("Bracket balancing failed, trying heuristics...");
      }
    }

    // 备用：尝试常见的截断模式
    const braces = ['"}]}', '"}]}}', '"}}}', '"}}', ']}', ']}}}', ']}}'];
    for (const fix of braces) {
      try {
        return JSON5.parse(cleaned + fix);
      } catch (err) {
        // continue
      }
    }

    console.error("Failed to repair JSON. Length:", text.length);
    throw e;
  }
};

const prepareParts = (instruction: string, attachments: Attachment[]) => {
  const parts: any[] = [];
  if (instruction) parts.push({ text: instruction });
  attachments.forEach(file => {
    const base64Data = file.data.split(',')[1];
    if (base64Data) {
      parts.push({ inlineData: { mimeType: file.type, data: base64Data } });
    }
  });
  return parts;
};

// 主入口函数
export const analyzeMaterialsAndCreatePlan = async (
  instruction: string,
  attachments: Attachment[],
  gradeLevel: number = 4,
  recentAccuracy: number = 0.7,
  knowledgeSummary?: string,  // 知识点掌握情况汇总，用于个性化出题
  teachingIntent?: {          // Master Agent 传入的教学意图
    type: 'reinforce' | 'verify' | 'challenge' | 'lighten' | 'introduce' | 'pause';
    questionCount?: number;
    difficultyLevel?: 'low' | 'medium' | 'high';
    focusKnowledgePoints?: string[];
    reason?: string;
  }
): Promise<any> => {
  try {
    console.log("🚀 Step 1: Generating Material & Analysis...");

    // --- STEP 1: 生成阅读材料 ---
    const materialPrompt = `
          You are an expert tutor for Grade ${gradeLevel} students in China.
          
          🔥 **CRITICAL PARENT INSTRUCTION**: "${instruction || 'None provided'}"
          (Highest priority: If parent specifies topic, grammar, or focus, you MUST center all content around it.)

          【OUTPUT FORMAT - CRITICAL】
          You MUST output valid JSON.
          - DO NOT use Markdown code blocks (like \`\`\`json). Just output the raw JSON object.
          - If the content contains mathematical formulas (Latex), you MUST escape backslashes.
            Example: Use "a^2 + b^2 = c^2" OR "a\\\\^2 + b\\\\^2" instead of "a\\^2".
            Ideally, use plain text or widely compatible unicode symbols where possible to avoid JSON parsing errors.
          - Avoid control characters inside strings.

          【Task】
          1. Carefully analyze the attached images/text (if any).
          2. Detect subject and language.
          3. Generate appropriate "reading_material".
          
          ⚠️ **NO ATTACHMENT CASE**:
          - If NO images/text are provided, you MUST **RANDOMLY** select an interesting topic suitable for Grade ${gradeLevel}.
          - **AVOID** repeating the same topic (e.g., "Golden Ratio", "Fibonacci") every time.
          - Pick from a diverse pool: 
            • Math: Geometry, Algebra, Logic Puzzles, History of Math, Measurements.
            • Science: Space, Biology, Physics, Chemistry, Nature.
            • English: Adventure stories, Cultural facts, Biographies.
            • Chinese: Ancient Poems, Modern Essays, Idiom Stories, Mythologies, Classical Literature.
          - **Topic Selection Strategy**: Use the current timestamp ${Date.now()} as a seed to randomize your selection.

          【Subject Decision Rule - MUST FOLLOW】
          - If content contains numbers, formulas, math symbols > 30% → classify as "math".
          - If continuous text paragraphs > 3 sentences with no formulas → classify as "chinese" or "english".
          - If diagrams with labels about natural phenomena → classify as "science".
          - If uncertain → choose "other" and explain in summary.

          【FIDELITY RULES - CRITICAL】
          - If attachments contain textbook content, lesson text, or specific article:
            • reading_material MUST be a faithful retelling, detailed explanation, or structured extension of the ORIGINAL content.
            • DO NOT invent unrelated new stories or characters.
          - For Chinese Reading Comprehension:
            • Generate a full, detailed passage (minimum 600 Chinese characters, at least 5 paragraphs).
            • Include rich details, vocabulary in context, character emotions, and events suitable for comprehension questions.
            • If fewer than 600 characters, the output is INVALID.
            • 【段落格式】每个段落之间必须使用两个换行符分隔（\\n\\n），让内容清晰易读。
          - For Math/Science:
            • "reading_material" MUST be a pure CONCEPT REVIEW only.
            • Format: Key definitions + Important formulas + 2-4 step-by-step worked examples + Common pitfalls.
            • NO stories, NO fictional scenarios, NO narrative.
            • 【段落格式】使用清晰的标题和分段，每个概念/公式/例题之间用空行分隔。
          - For English:
            • 【段落格式】每段用两个换行符分隔，段落不宜过长（3-5句为佳）。

          【Difficulty Calibration】
          - Recent Student Accuracy: ${Math.round(recentAccuracy * 100)}%
          - Rules:
            • If accuracy < 60%: simplify vocabulary, shorter sentences, focus on basics.
            • If 60-85%: standard difficulty.
            • If > 85%: richer vocabulary, deeper inference, more complex examples.

          【Language Rules】
          - If input is primarily Chinese → Output reading_material in Chinese.
          - If input is primarily English → Output reading_material in English.
          - If mixed → Follow the dominant language.

          【Output】
          Strictly JSON matching the schema:
          - analysis: detected_language ('Chinese', 'English', 'Mixed'), subject ('math', 'chinese', 'english', 'science', 'other'), topic, difficulty ('Easy'/'Medium'/'Hard'), summary
          - daily_challenge: title + reading_material (title, content, source_style: 'Concept Review' or 'Story' or 'Explanation')
        `;

    const materialResponse = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: { parts: prepareParts(materialPrompt, attachments) },
      config: {
        responseMimeType: "application/json",
        responseSchema: MATERIAL_SCHEMA,
        maxOutputTokens: 8192,
        temperature: 0.25, // Lowered for educational consistency
      },
    });

    const rawMaterialText = materialResponse.text || "{}";
    console.log("📄 Step 1 Raw Response Length:", rawMaterialText.length);

    let materialData;
    try {
      materialData = parseJsonWithRepair(rawMaterialText);
    } catch (parseError) {
      console.error("❌ Step 1 JSON Parse Failed. First 500 chars:", rawMaterialText.substring(0, 500));
      throw new Error(`Step 1 Failed: JSON parse error - ${parseError}`);
    }

    if (!materialData?.daily_challenge?.reading_material) {
      console.error("❌ Step 1 Missing reading_material. Data structure:", JSON.stringify(materialData, null, 2).substring(0, 1000));
      throw new Error("Step 1 Failed: No reading material in response structure.");
    }

    const isEnglish = materialData.analysis?.detected_language === 'English' || materialData.analysis?.subject === 'english';
    const subject = materialData.analysis?.subject || 'other';
    console.log(`✅ Step 1 Complete. Subject: ${subject}, Lang: ${isEnglish ? 'En' : 'Zh'}`);
    console.log("🚀 Step 2: Generating Questions...");

    // --- STEP 2: 基于生成的材料出题 ---
    // Validation: Ensure material is sufficient
    const materialContent = materialData.daily_challenge.reading_material.content || '';
    if (materialContent.length < 100) {
      console.warn("⚠️ Reading material too short, continuing with caution.");
    }

    const contextText = `
        Title: ${materialData.daily_challenge.title}
        Content: ${materialContent}
        Detected Subject: ${subject}
    `;

    // Adaptive difficulty calculation - 可被 Teaching Intent 覆盖
    const accuracyPercent = Math.round(recentAccuracy * 100);
    let difficultyRule = "Easy 40%, Medium 40%, Hard 15%, Challenge 5% (1-2 questions)";

    // 如果有 Teaching Intent，使用 Intent 指定的难度策略
    if (teachingIntent?.difficultyLevel) {
      const intentDifficulty = teachingIntent.difficultyLevel;
      if (intentDifficulty === 'low') {
        difficultyRule = "Easy 70%, Medium 25%, Hard 5%, Challenge 0% (轻松模式/巩固练习)";
      } else if (intentDifficulty === 'high') {
        difficultyRule = "Easy 20%, Medium 35%, Hard 30%, Challenge 15% (挑战模式)";
      } else {
        difficultyRule = "Easy 40%, Medium 40%, Hard 15%, Challenge 5% (验证模式)";
      }
      console.log(`📊 [TeachingIntent] Using ${intentDifficulty} difficulty: ${difficultyRule}`);
    } else {
      // 默认基于 accuracy 的自适应难度
      if (recentAccuracy < 0.7) {
        difficultyRule = "Easy 60%, Medium 30%, Hard 10%, Challenge 0-1 question (student struggling)";
      } else if (recentAccuracy > 0.85) {
        difficultyRule = "Easy 30%, Medium 40%, Hard 20%, Challenge 10% (2 questions, student excelling)";
      }
    }

    // 按年级调整题量 - 可被 Teaching Intent 覆盖
    let questionCount = "10-12";

    // 如果有 Teaching Intent，使用 Intent 指定的题量
    if (teachingIntent?.questionCount) {
      questionCount = String(teachingIntent.questionCount);
      console.log(`📊 [TeachingIntent] Using ${questionCount} questions (intent: ${teachingIntent.type})`);
    } else {
      // 默认基于年级的题量
      if (gradeLevel <= 3) {
        questionCount = "8-10";  // 低年级注意力较短
      } else if (gradeLevel <= 5) {
        questionCount = "10-12"; // 中年级标准
      } else {
        questionCount = "12-15"; // 高年级培养专注
      }
    }

    // Intent 附加信息（用于 prompt）
    const intentContext = teachingIntent ? `
    【Teaching Intent from Master Agent】
    - Intent Type: ${teachingIntent.type}
    - Reason: ${teachingIntent.reason || 'N/A'}
    - Focus Points: ${teachingIntent.focusKnowledgePoints?.join(', ') || 'N/A'}
    - If focus points are specified, prioritize questions testing those knowledge points.
    ` : '';

    const questionsPrompt = `
        Generate ${questionCount} high-quality questions based on the KNOWLEDGE POINTS from the reading material.
        Target: Grade ${gradeLevel} in China.
        Detected Subject: ${subject}
        Recent Student Accuracy: ${accuracyPercent}%
        ${intentContext}
        
        🔥 **CRITICAL PARENT INSTRUCTION**: "${instruction || 'None provided'}"
        
        【OUTPUT FORMAT - CRITICAL】
        You MUST output valid JSON.
        - DO NOT use Markdown code blocks. Just raw JSON.
        - **ESCAPE ALL BACKSLASHES** in Latex formulas: Use "\\\\" instead of "\\".
        - Example: "\\\\frac{1}{2}" (Correct) vs "\\frac{1}{2}" (Invalid JSON string).
        
        ⛔️ **STRICT FORMATTING RULES**:
        - 'options' MUST be an array of STRINGS only. NO keys like "A:", "B:", "type:", "difficulty:".
        - BAD: ["A. 5", "B. 6", "difficulty: easy"]
        - GOOD: ["5", "6"]
        - 'difficulty_tag' and other metadata MUST be separate fields, NOT inside 'options' or 'question_text'.


        ═══════════════════════════════════════════════════════════════
        【🎓 EDUCATIONAL PHILOSOPHY - HIGHEST PRIORITY】
        ═══════════════════════════════════════════════════════════════
        
        1. **思维过程引导** - 每道题的 explanation 必须包含"解题思路"：
           ❌ 错误示范："速度=距离÷时间，150÷25=6 米/秒"
           ✅ 正确示范："解题三步法：
              ① 找条件：距离150米，时间25秒
              ② 想公式：速度 = 距离 ÷ 时间
              ③ 算结果：150÷25=6 米/秒
              🌟 太棒了！你已经学会用速度公式解决问题啦！"
        
        2. **鼓励性语言** - 每道题的 explanation 必须包含正向激励：
           - 用 emoji 增加趣味：🌟⭐💪🎉👍
           - 做对时："太棒了！""你真厉害！""完全正确！"
           - 做错时："没关系，我们一起来看看..."、"这道题确实有点难..."
        
        3. **知识点标注** - 每道题必须标注 knowledge_points 数组：
           - 使用简洁的知识点名称，如 ["速度公式", "单位换算"]
           - 便于系统追踪学生的知识点掌握情况
           - 每道题 1-3 个知识点
        
        4. **错误诊断** - 为复杂题目提供 common_mistakes（可选）：
           - concept: 概念错误（公式/定义理解有问题）
           - calculation: 计算错误（公式对但算错了）
           - reading: 审题错误（没看清题目条件）
           - careless: 粗心错误（会做但疏忽了）

        【ADAPTIVE DIFFICULTY DISTRIBUTION - MUST FOLLOW】
        ${difficultyRule}
        - Easy: direct recall or single-step calculation
        - Medium: simple application or combination of concepts
        - Hard: multi-step reasoning
        - Challenge: logic puzzle or complex application (max 2, clearly tagged)

        ═══════════════════════════════════════════════════════════════
        【🧠 扩展思维融入 - 每次必须包含 1-2 道】
        ═══════════════════════════════════════════════════════════════
        
        ⚠️ 核心原则：不单独教思维方法，而是在做题中自然运用
        
        **题目分布调整**：
        - 85% = 课本知识点
        - 15% = 扩展思维题（1-2 道，标记 difficulty_tag: "Challenge"）
        
        **根据主科目自动匹配扩展思维类型**：
        
        ▸ 数学/科学 → 【使用 choice 题型，有明确答案】
          - **逻辑推理**：
            question_type: "choice"
            例："甲比乙快，乙比丙快。如果甲6米/秒，丙可能是？ A.7米/秒 B.5米/秒 C.6米/秒"
            correct_answer: "5米/秒"  ⚠️ 必须是选项全文
            knowledge_points: ["逻辑推理", "传递性推断"]
          - **概率直觉**：
            question_type: "choice"
            例："抛硬币10次，最可能出现几次正面？ A.正好5次 B.大约5次左右 C.一定是5次"
            correct_answer: "大约5次左右"
            knowledge_points: ["概率估算", "可能性判断"]
          - **财商计算**：
            question_type: "fill" 或 "choice"
            例："书25元打8折，实际要付多少钱？"
            expected.value: "20元"
            expected.synonyms: ["20", "二十元", "20元钱"]
            knowledge_points: ["财商思维", "折扣计算"]
        
        ▸ 语文/英语 → 【使用 open_ended 题型，AI 评判】
          - **批判性思维**：
            question_type: "open_ended"
            expected.mode: "open_ended"
            例："你同意'龟兔赛跑'说明坚持最重要吗？从正反两方面说说你的想法。"
            expected.evaluation_hints: ["是否有正方观点", "是否有反方观点", "逻辑是否清晰"]
            knowledge_points: ["批判性思维", "多角度分析"]
          - **因果推理**：
            question_type: "open_ended"
            expected.mode: "open_ended"
            例："如果故事中的狐狸一开始就说实话，结局会怎样？"
            expected.evaluation_hints: ["是否合理推测", "是否结合故事情节"]
            knowledge_points: ["因果推理", "假设思考"]
        
        **扩展思维题的答案格式要点**：
        ⚠️ choice 题：correct_answer 必须是选项的完整文本，不能是 A/B/C
        ⚠️ fill 题：必须提供 synonyms 包含常见写法变体
        ⚠️ open_ended 题：必须设置 expected.mode: "open_ended"，由 AI 鼓励性评判


        ⚠️【ANTI-COPY RULES - HIGHEST PRIORITY】⚠️
        You MUST follow these rules to ensure students THINK rather than COPY:
        
        1. **NEVER use the SAME scenario as examples in reading_material**
           - If material mentions "小明跑步" → Use different character AND activity (e.g., "小红骑自行车", "汽车行驶")
           - If material shows "100米用20秒" → Use DIFFERENT numbers that require actual calculation
        
        2. **VARY the question structure**:
           - If material teaches: 速度 = 距离 ÷ 时间
           - You MUST create these variations:
             • Forward: Given distance + time → ask for speed (30% of questions)
             • Reverse 1: Given speed + time → ask for distance (30% of questions)  
             • Reverse 2: Given speed + distance → ask for time (20% of questions)
             • Comparison: Two objects, compare which is faster (10% of questions)
             • Applied: Real-world scenario requiring the formula (10% of questions)
        
        3. **NUMBER DESIGN - Avoid Obvious Answers**:
           - DO NOT use simple integers that can be guessed (e.g., 100÷20=5)
           - USE numbers requiring actual calculation (e.g., 150÷25=6, 180÷15=12)
           - Include at least 2 questions with decimal answers (e.g., 125÷30≈4.17)
        
        4. **CONTEXT SWITCHING**:
           - Each question MUST use a UNIQUE context/character
           - Contexts pool: 骑自行车、开汽车、火车、飞机、游泳、滑冰、跑马拉松、快递配送、动物奔跑等
           - Characters pool: 小红、小华、王老师、警察叔叔、运动员、快递员、动物（猎豹、兔子）等

        【SUBJECT-SPECIFIC RULES - STRICT】
        
        ═══════════════════════════════════════════════════════════════
        1. **MATH / SCIENCE (CRITICAL)**:
        ═══════════════════════════════════════════════════════════════
           - **NO Reading Comprehension style questions** (DO NOT ask "What is mentioned in the text?")
           - Focus on: Calculation, Logic Reasoning, Pattern Recognition, Word Problems
           - Types: 'choice' (calculation), 'fill' (numeric answer)
           - **THINKING REQUIRED**: Student must APPLY the formula, NOT look up the answer
             - **Answer Format**: 
             • For fractions/formulas: MUST use standard LaTeX format (e.g., "\\frac{1}{2}", "x^2 + y^2")
             • Always include unit in expected.value if applicable (e.g., "15 cm", "6 米/秒")
             • Set tolerance: 0.01 for decimal answers
           - **SYNONYMS - MUST PROVIDE for fill questions**:
             • Include common unit variations: ["6米/秒", "6 米/秒", "6m/s", "6 m/s"]
             • Include with/without parentheses: ["6米/秒", "6（米/秒）", "6(米/秒)"]

        ═══════════════════════════════════════════════════════════════
        2. **CHINESE (语文) - DETAILED QUESTION TYPE DESIGN**:
        ═══════════════════════════════════════════════════════════════
           【题型分布 - 必须遵守】
           - 修辞辨析 (rhetoric): 15% - 识别比喻/拟人/排比/夸张等，分析表达效果
           - 词句理解 (word_meaning): 15% - 解释重点词句在语境中的深层含义
           - 人物分析 (character_analysis): 10% - 通过言行神态分析人物性格特点
           - 作者意图 (author_intent): 15% - "作者认为..."、"本文表达了..."
           - 概括主旨 (summary): 15% - 总结中心思想/主要内容
           - 细节理解: 20% - 原文信息提取（但要变换问法，不能直接复制原文）
           - **开放感悟 (open_reflection): 10% - 最后一题必须是开放式大题**
           
           【修辞手法题示例】
           - "文中画线句'春风像妈妈的手'使用了什么修辞手法？有什么表达效果？"
           - 答案模板："使用了比喻的修辞手法，把春风比作妈妈的手，生动形象地写出了春风的温柔。"
           - Set chinese_skill: "rhetoric"
           
           【词句理解题示例】
           - "文中'他的眼睛里闪着光'中的'光'指的是什么？"
           - 不能直接从原文找到，需要理解和推断
           - Set chinese_skill: "word_meaning"
           
           【人物分析题示例】
           - "从文中哪些地方可以看出小明是一个勇敢的孩子？"
           - "结合文中描写，说说你对这个人物的看法。"
           - Set chinese_skill: "character_analysis"
           
           【作者意图题示例】
           - "作者写这篇文章想要告诉我们什么道理？"
           - "文章最后一段有什么深层含义？"
           - Set chinese_skill: "author_intent"
           
           【⭐ 开放感悟题 - 最后一题必须是这个类型】
           - question_type: "open_ended"
           - expected.mode: "open_ended"
           - expected.value: 保留一个参考方向，但明确说明"答案不唯一"
           - expected.evaluation_hints: 提供评判维度，如 ["是否结合文章内容", "是否有个人感受", "逻辑是否清晰"]
           - Set chinese_skill: "open_reflection"
           - 例题：
             • "读完这篇文章，你有什么感受或启发？请结合文章内容谈一谈。"
             • "如果你是文中的主人公，你会怎么做？为什么？"
             • "你觉得文章中哪个情节最打动你？说说你的理由。"

        ═══════════════════════════════════════════════════════════════
        3. **ENGLISH (英语) - ADAPTIVE GRAMMAR & VOCABULARY FOCUS**:
        ═══════════════════════════════════════════════════════════════
           【核心原则 - 动态分析而非固定模板】
           ⚠️ 不要固定考察某个语法点！要根据以下优先级动态确定重点：
           
           **优先级 1**: 家长指令 (PARENT INSTRUCTION)
           - 如果家长说"练习第三人称单数" → 40% 题目聚焦此语法
           - 如果家长说"复习 there be 句型" → 40% 题目聚焦此语法
           - 如果家长没有特别指定 → 看材料内容
           
           **优先级 2**: 材料内容分析
           - 分析阅读材料中出现的语法现象
           - 识别材料中的核心语法点（时态、句型、词性变化等）
           - 围绕材料中的语法点设计题目
           
           **优先级 3**: 年级匹配
           - Grade 3-4: be 动词、简单现在时、基础疑问句、简单介词
           - Grade 5: 现在进行时、一般将来时、情态动词 can/must、比较级
           - Grade 6: 一般过去时、现在完成时、被动语态入门、复合句
           
           【难度分级 - 必须匹配年级】
           - Grade 3-4: 基础 200 词, 5-8 词句子
           - Grade 5: 400 词, 8-12 词句子
           - Grade 6: 600 词, 10-15 词句子
           
           【题型分布 - 灵活运用】
           - 语法选择/填空: 30-40% (根据材料中的语法点)
           - 句型转换: 15-25% (围绕材料中的句型)
           - 拼写填空: 15-25% (材料中的重点词汇)
           - 阅读理解: 20-30% (变通问法，不直接复制原文)
           
           【语法题型示例库 - 根据材料选择适用的】
           
           ▸ 时态相关:
             - 一般现在时: "She ____ (go) to school every day."
             - 现在进行时: "Look! The children ____ (play) in the park."
             - 一般过去时: "Yesterday, Tom ____ (visit) his grandma."
             
           ▸ 句型相关:
             - there be: "There ____ a cat and two dogs in the room."
             - 疑问句转换: 肯定句 → 一般疑问句 → 特殊疑问句
             - 否定句转换: some → any, too → either
             
           ▸ 词汇/拼写:
             - 首字母提示: "She likes a____ (苹果)."
             - 词形变化: "happy → happ____ (比较级)"
             - 动词变形: "go → ____ (过去式)"
           
           【变通原则 - 避免直接复制】
           - 原文 "The boy played football." 
           - ❌ 不要问 "What did the boy do?" (直接复制)
           - ✅ 要问 "What sport did the boy play?" (变换问法)
           - ✅ 或者 "Did the boy play basketball?" (理解判断)

        【ANSWER FORMAT - CRITICAL】
        - For "choice" questions: 
          • correct_answer MUST be the FULL TEXT of the correct option (NEVER "A" or "B")
          • expected.value MUST equal correct_answer exactly
        - For "fill" questions:
          • expected.value: primary answer with unit (e.g., "6米/秒")
          • expected.synonyms: MUST include at least 3-5 acceptable variations
          • expected.tolerance: 0.01 for decimals, 0 for integers
        - For "open_ended" questions:
          • expected.mode: "open_ended"
          • expected.value: 参考方向（但标注"答案不唯一"）
          • expected.evaluation_hints: ["评判维度1", "评判维度2", ...]
          • correct_answer: 一个示范性答案
        - Every question MUST have explanation (clear, encouraging, in Chinese)
        - Use difficulty_tag: 'Easy', 'Medium', 'Hard', 'Challenge'

        【Language Consistency】
        - If detected_language === 'English': questions & options in English, explanations in simple Chinese
        - If 'Chinese': all in Chinese
        - If 'Mixed': follow reading_material language

        ${knowledgeSummary ? `
        ═══════════════════════════════════════════════════════════════
        【📊 PERSONALIZED LEARNING - KNOWLEDGE MASTERY DATA】
        ═══════════════════════════════════════════════════════════════
        ${knowledgeSummary}
        
        【出题策略调整】
        - 40% 题目考察"需要复习"或"薄弱"的知识点
        - 30% 题目巩固"基本掌握"的知识点
        - 30% 题目为新知识点
        ` : ''}

        Reading Material Context:
        ${contextText}
    `;

    const questionsResponse = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: questionsPrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: QUESTIONS_SCHEMA,
        maxOutputTokens: 16384, // Increased for 10-15 questions with explanations
        temperature: 0.25, // Lowered for consistency
      }
    });

    const questionsData = parseJsonWithRepair(questionsResponse.text || "{}");

    // --- SANITIZATION & RECOVERY: 强力清洗 + 数据抢救 ---
    if (questionsData.questions && Array.isArray(questionsData.questions)) {
      questionsData.questions.forEach((q: any) => {
        // ========== 1. True/False 答案规范化 ==========
        if (q.question_type === 'true_false') {
          // 确保 correct_answer 是规范的 "True" 或 "False"
          const normalizeBoolean = (val: any): string => {
            if (val === true || val === 1) return 'True';
            if (val === false || val === 0) return 'False';
            const s = String(val).trim().toLowerCase();
            if (['true', 't', 'yes', 'y', '对', '是', 'correct', 'right', '1', '正确', '对的'].includes(s)) return 'True';
            if (['false', 'f', 'no', 'n', '错', '否', 'incorrect', 'wrong', '0', '错误', '不对', '错的'].includes(s)) return 'False';
            return 'True'; // 默认
          };

          // 规范化 correct_answer
          if (q.correct_answer !== undefined) {
            q.correct_answer = normalizeBoolean(q.correct_answer);
          }
          // 规范化 expected.value
          if (q.expected?.value !== undefined) {
            q.expected.value = normalizeBoolean(q.expected.value);
          }
          // 确保两者一致
          if (q.correct_answer && q.expected) {
            q.expected.value = q.correct_answer;
          }
          // True/False 题不需要 options
          delete q.options;
          return;
        }

        // ========== 2. 选择题 options 清洗 ==========
        if (Array.isArray(q.options)) {
          const originalOptions = [...q.options];

          q.options = q.options.filter((opt: string) => {
            const cleanOpt = String(opt).trim();
            const lowerOpt = cleanOpt.toLowerCase();

            // 过滤空选项
            if (!cleanOpt || cleanOpt.length === 0) return false;

            // 过滤纯字母选项 (A, B, C, D)
            if (/^[A-D]$/i.test(cleanOpt)) return false;

            // 抢救难度标签
            if (['easy', 'medium', 'hard', 'challenge'].includes(lowerOpt)) {
              if (!q.difficulty_tag) {
                q.difficulty_tag = cleanOpt.charAt(0).toUpperCase() + cleanOpt.slice(1);
              }
              return false;
            }

            // 过滤已知垃圾数据（精确匹配）
            const forbidden = new Set([
              "common_mistakes", "knowledge_points", "question_type",
              "expected", "explanation", "score_value", "correct_answer",
              "type", "reading", "description", "analysis", "daily_challenge",
              "difficulty_tag", "chinese_skill", "english_skill",
              "options", "questions", "null", "undefined"
            ]);

            for (let f of forbidden) {
              if (f.toLowerCase() === lowerOpt) return false;
            }

            // 匹配 key:value 结构 (e.g. "difficulty: easy")
            if (cleanOpt.match(/^[a-z_]+:\s/i)) return false;

            return true;
          });

          // 如果过滤后选项为空，尝试从原始数据恢复
          if (q.question_type === 'choice' && q.options.length === 0) {
            console.warn(`[AI Sanitization] All options filtered for: ${q.question_text?.substring(0, 50)}`);
            console.warn(`[AI Sanitization] Original options:`, originalOptions);

            // 尝试恢复：保留所有非空、非纯字母的选项
            const recovered = originalOptions.filter((opt: string) => {
              const clean = String(opt).trim();
              return clean.length > 1 || !/^[A-D]$/i.test(clean);
            });

            if (recovered.length > 0) {
              q.options = recovered;
              console.log(`[AI Sanitization] Recovered ${recovered.length} options`);
            } else {
              // 真的没有有效选项，标记为需要重新生成
              console.error(`[AI Sanitization] Cannot recover options, marking question as invalid`);
              q._invalid = true;
              q.options = ["选项加载失败，请重新生成"];
            }
          }
        }

        // ========== 3. 非选择题清理 options ==========
        if (['fill', 'short_answer', 'open_ended'].includes(q.question_type)) {
          delete q.options;
        }
      });

      // 过滤掉无效题目
      questionsData.questions = questionsData.questions.filter((q: any) => !q._invalid);
    }


    // --- MERGE RESULTS ---
    const finalData = {
      ...materialData,
      daily_challenge: {
        ...materialData.daily_challenge,
        questions: questionsData.questions || []
      }
    };

    return finalData;

  } catch (error) {
    console.error("AI Generation Chain Failed:", error);
    throw error;
  }
};

export const evaluateSubjectiveAnswer = async (q: string, u: string, r: string) => {
  // Improved heuristic: keyword matching instead of just length
  // Extract keywords from reference answer (words longer than 1 char, ignore common words)
  const commonWords = new Set(['的', '是', '在', '了', '和', '与', '或', '也', '都', 'the', 'a', 'an', 'is', 'are', 'to', 'of']);
  const extractKeywords = (text: string): string[] => {
    return text
      .replace(/[。，、？！；：""''《》（）\.\,\?\!\;\:\"\'\(\)\[\]]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !commonWords.has(w.toLowerCase()))
      .map(w => w.toLowerCase());
  };

  const referenceKeywords = extractKeywords(r);
  const userKeywords = extractKeywords(u);

  // Count how many reference keywords appear in user answer
  let matchedCount = 0;
  for (const keyword of referenceKeywords) {
    if (userKeywords.some(uk => uk.includes(keyword) || keyword.includes(uk))) {
      matchedCount++;
    }
  }

  const coverageRatio = referenceKeywords.length > 0 ? matchedCount / referenceKeywords.length : 0;

  // Scoring logic
  let score = 0;
  let isCorrect = false;
  let feedback = '';

  if (u.trim().length < 2) {
    score = 0;
    feedback = "试着写一些内容哦，不要空着。";
  } else if (coverageRatio >= 0.7) {
    score = 100;
    isCorrect = true;
    feedback = "太棒了！答案非常完整！🌟";
  } else if (coverageRatio >= 0.5) {
    score = 80;
    isCorrect = true;
    feedback = "写得不错！再加一些细节会更好。👍";
  } else if (coverageRatio >= 0.3) {
    score = 60;
    feedback = "有一定理解，但还可以更完整一些。";
  } else if (u.length > 5) {
    score = 40;
    feedback = "内容有些偏离主题，再看一遍题目哦。";
  } else {
    score = 20;
    feedback = "再多写一点点细节会更好哦。";
  }

  return { isCorrect, feedback, score };
};

export const explainQuestionSimple = async (q: string, a: string, grade: number) => {
  const prompt = `
        Explain this question to a Grade ${grade} student in Chinese. 
        Question: "${q}"
        Answer: "${a}"
        Use simple metaphors. Keep it under 50 words.
    `;
  const response = await generateWithRetry({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] }
  });
  return response.text || "AI 正在思考解释...";
};

export const generateQuizFromBook = async (bookTitle: string, gradeLevel: number): Promise<any> => {
  try {
    const prompt = `
            Generate a reading quest for the book "${bookTitle}".
            Target Audience: Grade ${gradeLevel}.

            【SUBJECT DETECTION】
            - Infer if "${bookTitle}" is an English book or Chinese book.

            【CONTENT GENERATION】
            1. **Reading Material**: A deep summary or key excerpt (500-800 words/chars).
               - If English Book: Material in English.
               - If Chinese Book: Material in Chinese.
            2. **Questions**: **12-15 Questions**. 
               - If English Book: Questions in English with Chinese hints.
               - If Chinese Book: All in Chinese.
            
            【DATA INTEGRITY】
            - Strict JSON Schema.
            - 'correct_answer' must be the exact text of the option.
        `;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 生成失败");

    let data = parseJsonWithRepair(text);

    if (!data.analysis) {
      data.analysis = { subject: 'reading', topic: bookTitle, difficulty: 'Medium' };
    }
    if (!data.daily_challenge) {
      data.daily_challenge = {
        title: bookTitle,
        reading_material: { title: bookTitle, content: data.reading_material || data.summary || "Summary not generated.", source_style: 'Story' },
        questions: data.questions || []
      };
    }

    return data;

  } catch (e) {
    console.error("Generate Quiz From Book Failed", e);
    throw e;
  }
}

// 开放式题目评判结果的 Schema
const OPEN_ENDED_EVALUATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    feedback: { type: Type.STRING },
    sample_answer: { type: Type.STRING },
    improvement_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "feedback", "sample_answer", "improvement_tips", "strengths"]
};

/**
 * 开放式题目 AI 深度评判
 * 不简单判对错，而是给予鼓励、示范和引导
 */
export const evaluateOpenEndedAnswer = async (
  question: string,
  userAnswer: string,
  referenceDirection: string,
  evaluationHints: string[],
  gradeLevel: number = 4
): Promise<{
  score: number;
  feedback: string;
  sample_answer: string;
  improvement_tips: string[];
  strengths: string[];
}> => {
  try {
    // 如果答案太短，直接返回鼓励继续写
    if (!userAnswer || userAnswer.trim().length < 5) {
      return {
        score: 30,
        feedback: "🌱 你已经迈出了第一步！试着多写一些，说说你的想法吧~",
        sample_answer: referenceDirection,
        improvement_tips: ["可以先想想文章讲了什么", "再说说这让你想到了什么"],
        strengths: ["勇于尝试"]
      };
    }

    const prompt = `
      你是一位温柔、鼓励型的小学${gradeLevel}年级语文老师。
      
      【任务】评价学生对开放式题目的回答，给予积极反馈和指导。
      
      【题目】${question}
      
      【学生回答】${userAnswer}
      
      【参考方向】${referenceDirection}
      （注意：这是参考方向，不是唯一标准答案，学生有自己的理解是好的！）
      
      【评判维度】
      ${evaluationHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}
      
      【评分标准 - 宽松鼓励为主】
      - 90-100分：内容丰富、有个人见解、表达清晰
      - 70-89分：有基本理解、表达较清楚
      - 50-69分：有尝试表达、但不够完整
      - 30-49分：内容较少、需要引导
      
      【重要原则】
      1. 🌟 先找亮点！即使回答简单，也要发现值得表扬的地方
      2. 💬 用孩子能听懂的语言
      3. 📝 示范答案不要太长（80-120字），要让孩子觉得"我也能写出来"
      4. 💡 改进建议要具体可操作，不要泛泛而谈
      
      【输出格式】严格按 JSON Schema 输出：
      - score: 分数 (30-100)
      - feedback: 鼓励性反馈（用 emoji，语气温暖）
      - sample_answer: 优质示范答案（80-120字，适合该年级）
      - improvement_tips: 1-3条具体改进建议
      - strengths: 1-2个回答中的亮点（即使很小也要找到）
    `;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: OPEN_ENDED_EVALUATION_SCHEMA,
        temperature: 0.3,
      }
    });

    const result = parseJsonWithRepair(response.text || "{}");

    // 确保分数在合理范围
    result.score = Math.max(30, Math.min(100, result.score || 60));

    return {
      score: result.score,
      feedback: result.feedback || "🌟 你的想法很棒！继续加油！",
      sample_answer: result.sample_answer || referenceDirection,
      improvement_tips: result.improvement_tips || ["试着多写一些自己的感受"],
      strengths: result.strengths || ["认真思考了题目"]
    };

  } catch (error) {
    console.error("Open-ended evaluation failed:", error);
    // 降级处理：给一个基础鼓励反馈
    return {
      score: 60,
      feedback: "🌟 你已经很棒了！AI 老师正在学习如何更好地帮助你~",
      sample_answer: referenceDirection,
      improvement_tips: ["可以多写一些自己的想法", "试着结合文章内容来说"],
      strengths: ["认真回答了问题"]
    };
  }
};
/**
 * 与教育顾问 Agent 对话
 * 家长可以询问孩子的学习情况、寻求辅导建议
 * 现在会读取孩子的学习记忆、知识点掌握情况和近期学习历史
 */
export const chatWithAgent = async (
  message: string,
  context: {
    childId?: string;
    childName: string;
    childGrade?: number;
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<string> => {
  try {
    const historyContext = context.chatHistory
      ?.slice(-5) // 只取最近5轮对话
      .map(m => `${m.role === 'user' ? '家长' : 'Agent'}: ${m.content}`)
      .join('\n') || '';

    // 尝试读取孩子的完整学习数据（如果有 childId）
    let learningContext = '';

    if (context.childId) {
      try {
        // 动态导入以避免循环依赖
        const { getMemorySummary } = await import('./memoryService');
        const { loadUserMasteries, getMasterySummaryFromDb } = await import('./knowledgeService');
        const { taskService } = await import('./taskService');

        // 1. 读取记忆
        const memory = await getMemorySummary(context.childId);

        // 2. 读取知识点掌握情况
        const masterySummary = await getMasterySummaryFromDb(context.childId);
        const masteryDetails = await loadUserMasteries(context.childId);

        // 3. 读取近期任务历史 (7天)
        const recentTasks = await taskService.getTaskHistory(context.childId, 7);

        // 构建详细的学习上下文
        let contextParts: string[] = [];

        // 记忆部分
        if (memory) {
          const stableInfo = memory.stablePatterns?.map((m: any) => m.content?.description || m.key).slice(0, 3).join('、');
          const recentInfo = memory.recentObservations?.slice(0, 3).map((m: any) => m.content?.description || m.key).join('、');
          if (stableInfo || recentInfo) {
            contextParts.push(`【学习特点】\n- 稳定特征: ${stableInfo || '暂无'}\n- 近期观察: ${recentInfo || '暂无'}`);
          }
        }

        // 知识点掌握部分
        if (masterySummary && masterySummary.total_points > 0) {
          const masteryPercent = Math.round((masterySummary.mastered_count / masterySummary.total_points) * 100);
          const weakPoints = masteryDetails.filter(m => m.mastery_level <= 1).slice(0, 5).map(m => m.knowledge_point_name);
          const strongPoints = masteryDetails.filter(m => m.mastery_level >= 3).slice(0, 5).map(m => m.knowledge_point_name);

          contextParts.push(`【知识点掌握】\n- 总计: ${masterySummary.total_points}个知识点，掌握率${masteryPercent}%\n- 熟练掌握: ${masterySummary.mastered_count}个\n- 正在学习: ${masterySummary.learning_count}个\n- 需要加强: ${weakPoints.length}个${weakPoints.length > 0 ? '（' + weakPoints.join('、') + '）' : ''}\n- 强项: ${strongPoints.length > 0 ? strongPoints.join('、') : '暂无数据'}`);
        }

        // 近期学习历史
        if (recentTasks && recentTasks.length > 0) {
          const completedTasks = recentTasks.filter(t => t.status === 'completed');
          const subjects = [...new Set(recentTasks.map(t => t.learning_material?.subject).filter(Boolean))];
          const avgScore = completedTasks.length > 0
            ? Math.round(completedTasks.reduce((sum, t) => sum + (t.score || 0), 0) / completedTasks.length)
            : 0;

          contextParts.push(`【近7天学习】\n- 完成任务: ${completedTasks.length}个\n- 涉及科目: ${subjects.join('、') || '暂无'}\n- 平均得分: ${avgScore}分`);
        }

        if (contextParts.length > 0) {
          learningContext = '\n\n' + contextParts.join('\n\n');
        }

      } catch (err) {
        console.warn('[ChatWithAgent] Could not load learning data, continuing without it:', err);
      }
    }

    const systemPrompt = `你是${context.childName}的专属教育顾问。

【你的职责】
1. 根据孩子的真实学习数据回答家长问题
2. 提供具体、可操作的辅导建议
3. 用温暖、专业的语气交流

【孩子信息】
- 姓名: ${context.childName}
- 年级: ${context.childGrade || 4}年级
${learningContext}

${historyContext ? `【对话历史】\n${historyContext}\n` : ''}
【家长提问】
${message}

【回复要求】
1. 使用纯文本格式，不要使用任何 ** 或 ## 等 Markdown 符号
2. 用数字序号（1. 2. 3.）来组织建议
3. 如果有学习数据，必须引用具体数据来回答
4. 回复长度控制在 150-250 字
5. 语气友好专业，像一位经验丰富的老师`;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
    });

    return response.text || '抱歉，我暂时无法回答这个问题，请稍后再试。';
  } catch (error) {
    console.error('[ChatWithAgent] Error:', error);
    return '抱歉，AI 服务暂时不可用，请稍后再试。';
  }
};

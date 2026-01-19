import { AnswerExpected } from "../types";

// 数字词到阿拉伯数字的映射
const numberWordMap: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14',
  'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19',
  'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50',
  '零': '0', '一': '1', '二': '2', '两': '2', '三': '3', '四': '4',
  '五': '5', '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
};

/**
 * 数字归一化：将英文/中文数字词转换为阿拉伯数字
 */
function normalizeNumber(s: string): string {
  const lower = s.trim().toLowerCase();
  return numberWordMap[lower] || s;
}

/**
 * 全角/半角字符归一化映射
 */
const fullWidthToHalfWidth: Record<string, string> = {
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '／': '/',
  '＝': '=',
  '＋': '+',
  '－': '-',
  '×': '*',
  '÷': '/',
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
};

/**
 * 单位同义词映射（用于答案容错）
 */
const unitAliases: Record<string, string[]> = {
  'm/s': ['米/秒', '米每秒', 'm/s', '米／秒', 'm／s'],
  'km/h': ['千米/时', '公里/小时', 'km/h', '千米每小时', '千米／时', '公里／小时'],
  'm': ['米', '公尺', 'm'],
  'cm': ['厘米', 'cm', '公分'],
  'km': ['千米', '公里', 'km'],
  's': ['秒', 's', '秒钟'],
  'min': ['分钟', 'min', '分'],
  'h': ['小时', 'h', '时', 'hour'],
  'kg': ['千克', 'kg', '公斤'],
  'g': ['克', 'g'],
  'yuan': ['元', '块', '¥', 'yuan'],
};

/**
 * 文本归一化：去除标点、多余空格，转小写，统一全角/半角
 */
export function normalizeText(s: string): string {
  if (!s) return "";
  let result = String(s).trim();

  // 1. 全角转半角
  for (const [full, half] of Object.entries(fullWidthToHalfWidth)) {
    result = result.split(full).join(half);
  }

  // 2. 去除标点和空格
  result = result
    .replace(/[，。,.、!?！？;；:'\"'""''《》\s]/g, '')
    .toLowerCase();

  return result;
}

/**
 * 归一化单位：将各种单位写法转换为标准形式
 */
export function normalizeUnit(s: string): { value: string; unit: string } {
  if (!s) return { value: '', unit: '' };

  const input = String(s).trim();

  // 提取数值部分
  const numMatch = input.match(/^[-+]?[0-9]*\.?[0-9]+/);
  const numPart = numMatch ? numMatch[0] : '';
  const unitPart = numMatch ? input.slice(numMatch[0].length).trim() : input;

  // 查找标准单位
  let standardUnit = unitPart;
  for (const [standard, aliases] of Object.entries(unitAliases)) {
    const normalizedUnitPart = normalizeText(unitPart);
    for (const alias of aliases) {
      if (normalizeText(alias) === normalizedUnitPart) {
        standardUnit = standard;
        break;
      }
    }
  }

  return { value: numPart, unit: standardUnit };
}

/**
 * 布尔值归一化：处理各种 True/False 的变体
 */
function normalizeBoolean(val: string | boolean | number): boolean | null {
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();

  // True 变体 - 包括中英文
  if (['true', 't', 'yes', 'y', '对', '是', 'correct', 'right', '1', '正确', '对的'].includes(s)) return true;

  // False 变体 - 包括中英文
  if (['false', 'f', 'no', 'n', '错', '否', 'incorrect', 'wrong', '0', '错误', '不对', '错的'].includes(s)) return false;

  return null;
}

/**
 * 判断文本是否匹配（支持同义词和数字词）
 */
export function isTextMatch(userAnswer: string, expected: AnswerExpected): boolean {
  const u = normalizeText(userAnswer);
  const e = normalizeText(String(expected.value));

  // 1. 直接匹配
  if (u === e) return true;

  // 2. 数字词匹配（four = 4）
  const uNum = normalizeNumber(userAnswer.trim().toLowerCase());
  const eNum = normalizeNumber(String(expected.value).trim().toLowerCase());
  if (uNum === eNum) return true;
  if (normalizeText(uNum) === e) return true;
  if (u === normalizeText(eNum)) return true;

  // 3. 同义词匹配
  if (expected.synonyms && Array.isArray(expected.synonyms)) {
    for (const syn of expected.synonyms) {
      if (u === normalizeText(syn)) return true;
      if (uNum === normalizeNumber(syn.trim().toLowerCase())) return true;
    }
  }

  return false;
}

/**
 * 判断数值是否匹配（支持容差和单位）
 */
export function isNumberMatch(userAnswer: string, expected: AnswerExpected): boolean {
  // 1. 预处理：全角转半角
  let normalizedUserAnswer = userAnswer;
  for (const [full, half] of Object.entries(fullWidthToHalfWidth)) {
    normalizedUserAnswer = normalizedUserAnswer.split(full).join(half);
  }

  // 2. 提取数值
  const match = normalizedUserAnswer.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return false;

  const userVal = parseFloat(match[0]);
  if (isNaN(userVal)) return false;

  // 3. 处理期望值（可能是字符串如 "5米/秒"）
  let expectedVal: number;
  const expectedStr = String(expected.value);
  const expectedMatch = expectedStr.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (expectedMatch) {
    expectedVal = parseFloat(expectedMatch[0]);
  } else {
    expectedVal = Number(expected.value);
  }
  if (isNaN(expectedVal)) return false;

  // 4. 默认容差：小数0.01，整数0
  const defaultTolerance = expectedVal % 1 !== 0 ? 0.01 : 0;
  const tolerance = expected.tolerance ?? defaultTolerance;

  // 5. 数值比较
  if (Math.abs(userVal - expectedVal) <= tolerance) {
    return true;
  }

  // 6. 额外：检查单位是否匹配（如果期望值带单位）
  const userUnit = normalizeUnit(normalizedUserAnswer);
  const expectedUnit = normalizeUnit(expectedStr);

  if (userUnit.value && expectedUnit.value) {
    const userNumVal = parseFloat(userUnit.value);
    const expectedNumVal = parseFloat(expectedUnit.value);
    if (!isNaN(userNumVal) && !isNaN(expectedNumVal)) {
      if (Math.abs(userNumVal - expectedNumVal) <= tolerance) {
        // 数值相同，单位可忽略或相同都算对
        if (!userUnit.unit || !expectedUnit.unit || userUnit.unit === expectedUnit.unit) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * 主判定入口
 */
export function checkUserAnswer(
  userAnswer: string | number | boolean,
  expected?: AnswerExpected,
  legacyCorrectAnswer?: string,
  questionType?: string
): boolean {

  // 1. 特殊处理判断题 (True/False)
  if (questionType === 'true_false') {
    const userBool = normalizeBoolean(userAnswer);

    // 尝试从 expected 获取
    let expectedBool = expected ? normalizeBoolean(expected.value) : null;

    // 如果 expected 没解析出来，尝试 legacy
    if (expectedBool === null && legacyCorrectAnswer) {
      expectedBool = normalizeBoolean(legacyCorrectAnswer);
    }

    // 如果两者都有效，进行布尔比较
    if (userBool !== null && expectedBool !== null) {
      return userBool === expectedBool;
    }
    // 否则降级到文本比较（防止解析失败）
  }

  // 2. 兼容旧数据（无 expected 对象）
  if (!expected) {
    if (!legacyCorrectAnswer) return false;
    return normalizeText(String(userAnswer)) === normalizeText(legacyCorrectAnswer);
  }

  // 3. 数值模式
  if (expected.mode === 'number') {
    return isNumberMatch(String(userAnswer), expected);
  }

  // 4. 文本模式
  return isTextMatch(String(userAnswer), expected);
}
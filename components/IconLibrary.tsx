import React from 'react';

// ===== 图标尺寸规范 =====
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
};

interface IconProps {
    size?: IconSize;
    className?: string;
    color?: string;
}

// ===== 基础 SVG 包装器 =====
const IconWrapper: React.FC<IconProps & { children: React.ReactNode }> = ({
    size = 'md',
    className = '',
    color,
    children,
}) => {
    const dimension = sizeMap[size];
    return (
        <svg
            width={dimension}
            height={dimension}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color || 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`inline-block shrink-0 ${className}`}
        >
            {children}
        </svg>
    );
};

// ===================================================================
// 🎁 奖励类图标
// ===================================================================

/** 平板/屏幕时间 - 替换 📱 */
export const TabletIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" />
        <path d="M9 6h6" strokeOpacity="0.6" />
    </IconWrapper>
);

/** 户外玩耍/足球 - 替换 ⚽️ */
export const OutdoorIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
        <path d="M12 2c2.5 2.5 4 5.5 4 10s-1.5 7.5-4 10" strokeOpacity="0.7" />
        <path d="M12 2c-2.5 2.5-4 5.5-4 10s1.5 7.5 4 10" strokeOpacity="0.7" />
    </IconWrapper>
);

/** 经验值/能量 - 替换 ⚡️ */
export const XpIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.2" />
    </IconWrapper>
);

/** 奖杯 - 替换 🏆 */
export const TrophyIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="currentColor" fillOpacity="0.15" />
    </IconWrapper>
);

/** 星星 - 替换 ⭐ */
export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({ filled, ...props }) => (
    <IconWrapper {...props}>
        <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill={filled ? 'currentColor' : 'currentColor'}
            fillOpacity={filled ? '0.9' : '0.15'}
        />
    </IconWrapper>
);

/** 礼物 - 替换 🎁 */
export const GiftIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <rect x="3" y="8" width="18" height="4" rx="1" fill="currentColor" fillOpacity="0.15" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </IconWrapper>
);

/** 火焰/连续打卡 - 替换 🔥 */
export const FireIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            fill="currentColor"
            fillOpacity="0.2"
        />
    </IconWrapper>
);

// ===================================================================
// 📚 学习类图标
// ===================================================================

/** 书本/阅读 - 替换 📖📚 */
export const BookIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor" fillOpacity="0.1" />
        <path d="M8 7h8" strokeOpacity="0.6" />
        <path d="M8 11h6" strokeOpacity="0.4" />
    </IconWrapper>
);

/** 测验/答题 - 替换 📝 */
export const QuizIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="currentColor" fillOpacity="0.1" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15l2 2 4-4" />
    </IconWrapper>
);

/** 灵感/提示 - 替换 💡 */
export const LightbulbIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <circle cx="12" cy="8" r="2" fill="currentColor" fillOpacity="0.3" />
    </IconWrapper>
);

/** 目标/探险 - 替换 🎯 */
export const TargetIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" strokeOpacity="0.6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
    </IconWrapper>
);

/** 思考/智慧 - 替换 🧠 */
export const BrainIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" fill="currentColor" fillOpacity="0.1" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" fill="currentColor" fillOpacity="0.1" />
    </IconWrapper>
);

/** 完成/正确 - 替换 ✅ */
export const CheckIcon: React.FC<IconProps & { circle?: boolean }> = ({ circle, ...props }) => (
    <IconWrapper {...props}>
        {circle ? (
            <>
                <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
                <path d="m9 12 2 2 4-4" />
            </>
        ) : (
            <polyline points="20 6 9 17 4 12" />
        )}
    </IconWrapper>
);

/** 错误 - 替换 ❌ */
export const CrossIcon: React.FC<IconProps & { circle?: boolean }> = ({ circle, ...props }) => (
    <IconWrapper {...props}>
        {circle ? (
            <>
                <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
            </>
        ) : (
            <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
            </>
        )}
    </IconWrapper>
);

// ===================================================================
// ⏱️ 状态类图标
// ===================================================================

/** 时钟/时间 - 替换 ⏱️ */
export const ClockIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" />
        <polyline points="12 6 12 12 16 14" />
    </IconWrapper>
);

/** 警告/注意 */
export const WarningIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </IconWrapper>
);

/** 成功状态 */
export const SuccessIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
        <path d="m9 12 2 2 4-4" />
    </IconWrapper>
);

/** 加载中 */
export const LoadingIcon: React.FC<IconProps & { animate?: boolean }> = ({ animate = true, ...props }) => (
    <IconWrapper {...props} className={`${props.className || ''} ${animate ? 'animate-spin' : ''}`}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </IconWrapper>
);

// ===================================================================
// 🔧 其他实用图标
// ===================================================================

/** 力量/数学 - 统计面板 */
export const StrengthIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="m6.5 6.5 11 11" />
        <path d="m21 21-1-1" />
        <path d="m3 3 1 1" />
        <path d="m18 22 4-4" />
        <path d="m2 6 4-4" />
        <path d="m3 10 7-7" />
        <path d="m14 21 7-7" />
        <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3" />
    </IconWrapper>
);

/** 智慧/语言 - 统计面板 */
export const WisdomIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.15" />
    </IconWrapper>
);

/** 魔法/科学 - 统计面板 */
export const MagicIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M5 3v4" strokeOpacity="0.5" />
        <path d="M19 17v4" strokeOpacity="0.5" />
        <path d="M3 5h4" strokeOpacity="0.5" />
        <path d="M17 19h4" strokeOpacity="0.5" />
    </IconWrapper>
);

/** 退出/电源 - 替换 fa-power-off */
export const PowerIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
    </IconWrapper>
);

/** 播放按钮 */
export const PlayIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.3" />
    </IconWrapper>
);

/** 箭头右 */
export const ArrowRightIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </IconWrapper>
);

/** 日历 */
export const CalendarIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor" fillOpacity="0.1" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </IconWrapper>
);

/** 停止/上限 - 替换 🛑 */
export const StopIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
    </IconWrapper>
);

/** 阳光満格 - 替换 🌟 */
export const SunIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.3" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </IconWrapper>
);

/** 加号 - 替换 ➕ */
export const PlusIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </IconWrapper>
);

/** 难度指示器（可配置颜色） */
export const DifficultyDot: React.FC<{ level: 'low' | 'medium' | 'high'; size?: IconSize; className?: string }> = ({
    level,
    size = 'sm',
    className = '',
}) => {
    const dimension = sizeMap[size];
    const colors = {
        low: '#81C784',    // 绿色 - 简单
        medium: '#FFCA28', // 黄色 - 适中
        high: '#EF9A9A',   // 红色 - 挑战
    };
    return (
        <svg
            width={dimension}
            height={dimension}
            viewBox="0 0 24 24"
            className={`inline-block shrink-0 ${className}`}
        >
            <circle cx="12" cy="12" r="8" fill={colors[level]} />
            <circle cx="12" cy="12" r="10" fill="none" stroke={colors[level]} strokeWidth="2" strokeOpacity="0.3" />
        </svg>
    );
};

// ===================================================================
// 📦 导出集合
// ===================================================================

export const Icons = {
    // 奖励类
    Tablet: TabletIcon,
    Outdoor: OutdoorIcon,
    Xp: XpIcon,
    Trophy: TrophyIcon,
    Star: StarIcon,
    Gift: GiftIcon,
    Fire: FireIcon,
    // 学习类
    Book: BookIcon,
    Quiz: QuizIcon,
    Lightbulb: LightbulbIcon,
    Target: TargetIcon,
    Brain: BrainIcon,
    Check: CheckIcon,
    Cross: CrossIcon,
    // 状态类
    Clock: ClockIcon,
    Warning: WarningIcon,
    Success: SuccessIcon,
    Loading: LoadingIcon,
    // 其他
    Strength: StrengthIcon,
    Wisdom: WisdomIcon,
    Magic: MagicIcon,
    Power: PowerIcon,
    Play: PlayIcon,
    ArrowRight: ArrowRightIcon,
    Calendar: CalendarIcon,
    Stop: StopIcon,
    Sun: SunIcon,
    Plus: PlusIcon,
    DifficultyDot: DifficultyDot,
};

export default Icons;

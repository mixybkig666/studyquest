export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./constants/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            // ===== 设计令牌：字体阶梯 =====
            fontSize: {
                'display-lg': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],  // 28px 大标题
                'display': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],     // 20px H1
                'heading': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '500' }],     // 18px H2
                'body': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],            // 16px 正文
                'caption': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],    // 14px 说明
                'tiny': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],           // 12px 标签
            },
            // ===== 设计令牌：8pt 间距网格 =====
            spacing: {
                'grid-1': '8px',
                'grid-2': '16px',
                'grid-3': '24px',
                'grid-4': '32px',
                'grid-5': '40px',
                'grid-6': '48px',
            },
            fontFamily: {
                sans: ['"Nunito"', '"Noto Sans SC"', 'sans-serif'],
                display: ['"Fredoka"', '"Noto Sans SC"', 'sans-serif'],
            },
            colors: {
                brand: {
                    bg: '#FFF8F0',
                    surface: '#FFFDFB',
                    primary: '#FF8A65',
                    primaryDark: '#E64A19',
                    secondary: '#FFCA28',
                    secondaryDark: '#F9A825',
                    accent: '#B39DDB',
                    success: '#81C784',
                    successDark: '#4CAF50',
                    error: '#EF9A9A',
                    errorDark: '#E57373',
                    warning: '#FFE082',
                    info: '#64B5F6',
                    text: '#4A4A4A',
                    textLight: '#7A7A7A',
                    textDark: '#2D2D2D',
                    border: '#FFE0B2',
                    borderLight: '#FFF3E0',
                    teal: '#26A69A',
                    darkTeal: '#00796B',
                    mint: '#E0F2F1',
                    orange: '#FF8A65',
                    orangeDark: '#E64A19',
                    purple: '#B39DDB',
                    blue: '#64B5F6',
                }
            },
            // ===== 设计令牌：圆角规范 =====
            borderRadius: {
                'card': '12px',       // R12 主卡片
                'card-sm': '8px',     // R8 次级卡片/按钮
                'clay': '20px',
                'clay-lg': '24px',
                'clay-xl': '32px',
            },
            // ===== 设计令牌：海拔阴影 =====
            boxShadow: {
                'elev-1': '0 2px 8px 0 rgba(255, 138, 101, 0.08)',              // 低海拔
                'elev-2': '0 8px 24px -4px rgba(255, 138, 101, 0.15)',          // 高海拔
                'elev-3': '0 16px 48px -8px rgba(255, 138, 101, 0.2)',          // 模态/抽屉
                'clay': '8px 8px 16px rgba(255, 138, 101, 0.15), -4px -4px 12px rgba(255, 255, 255, 0.8), inset 2px 2px 4px rgba(255, 255, 255, 0.5)',
                'clay-sm': '4px 4px 8px rgba(255, 138, 101, 0.12), -2px -2px 6px rgba(255, 255, 255, 0.7)',
                'clay-lg': '12px 12px 24px rgba(255, 138, 101, 0.18), -6px -6px 16px rgba(255, 255, 255, 0.9)',
                'clay-pressed': '2px 2px 6px rgba(255, 138, 101, 0.2), inset 4px 4px 8px rgba(0, 0, 0, 0.05)',
                'soft': '0 4px 20px -2px rgba(255, 138, 101, 0.1)',
                'glow': '0 0 20px rgba(255, 138, 101, 0.25)',
                'glow-success': '0 0 20px rgba(129, 199, 132, 0.4)',
                'card': '0 10px 30px -5px rgba(255, 138, 101, 0.08)',
            },
            // ===== 设计令牌：动效规范 =====
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'bounce-soft': 'bounceSoft 0.6s ease-out',
                'pulse-warm': 'pulseWarm 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.3s ease-out forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'pop': 'pop 0.3s ease-out forwards',
                'scan': 'scan 2s linear infinite',
                // 新增：统一动效
                'enter': 'enter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'exit': 'exit 180ms ease-in forwards',
                'shake': 'shake 400ms ease-in-out',
                'glow-pulse': 'glowPulse 1.5s ease-in-out infinite',
                'success-check': 'successCheck 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'confetti': 'confetti 800ms ease-out forwards',
                'slide-in-right': 'slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-out-right': 'slideOutRight 200ms ease-in forwards',
                'skeleton': 'skeleton 1.5s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                bounceSoft: {
                    '0%': { transform: 'scale(0.95)' },
                    '50%': { transform: 'scale(1.02)' },
                    '100%': { transform: 'scale(1)' },
                },
                pulseWarm: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                pop: {
                    '0%': { transform: 'scale(0.8)', opacity: '0' },
                    '70%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                scan: {
                    '0%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' }
                },
                // 新增：统一动效 keyframes
                enter: {
                    '0%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                exit: {
                    '0%': { opacity: '1', transform: 'scale(1)' },
                    '100%': { opacity: '0', transform: 'scale(0.95)' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '20%, 60%': { transform: 'translateX(-4px)' },
                    '40%, 80%': { transform: 'translateX(4px)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 138, 101, 0.4)' },
                    '50%': { boxShadow: '0 0 0 12px rgba(255, 138, 101, 0)' },
                },
                successCheck: {
                    '0%': { transform: 'scale(0) rotate(-45deg)', opacity: '0' },
                    '50%': { transform: 'scale(1.2) rotate(0deg)' },
                    '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
                },
                confetti: {
                    '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
                    '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideOutRight: {
                    '0%': { transform: 'translateX(0)', opacity: '1' },
                    '100%': { transform: 'translateX(100%)', opacity: '0' },
                },
                skeleton: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
            }
        }
    },
    plugins: [],
}

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass' | 'sunny' | 'lavender' | 'mint';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
  as?: React.ElementType;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  icon,
  className = '',
  as: Component = 'button',
  ...props
}) => {
  // Claymorphism 基础样式
  const baseStyles = `
    inline-flex items-center justify-center 
    rounded-clay font-bold font-display
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-4 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed 
    active:scale-[0.97] active:translate-y-0.5
    cursor-pointer
  `;

  // Claymorphism 暖色变体
  const variants = {
    // 主要按钮 - Coral Peach
    primary: `
      clay-button
      focus:ring-brand-primary/30
    `,
    // 次要按钮 - 柔和白色
    secondary: `
      bg-gradient-to-br from-white to-brand-surface
      text-brand-text border-3 border-brand-border
      shadow-clay-sm
      hover:shadow-clay hover:-translate-y-0.5
      hover:border-brand-primary/50
      focus:ring-brand-border
    `,
    // 轮廓按钮
    outline: `
      bg-transparent text-brand-primary
      border-3 border-brand-primary
      hover:bg-brand-primary/10
      focus:ring-brand-primary/30
    `,
    // 危险按钮 - 柔和红色
    danger: `
      bg-gradient-to-br from-brand-error to-red-400
      text-white border-3 border-red-300
      shadow-[4px_4px_10px_rgba(239,154,154,0.3)]
      hover:shadow-[6px_6px_14px_rgba(239,154,154,0.4)]
      hover:-translate-y-0.5
      focus:ring-brand-error/30
    `,
    // 幽灵按钮
    ghost: `
      bg-transparent text-brand-textLight
      hover:bg-brand-border/30 hover:text-brand-text
      focus:ring-brand-border
    `,
    // 玻璃按钮
    glass: `
      glass-panel text-brand-text
      hover:bg-white/90
      focus:ring-brand-border
    `,
    // 阳光黄色按钮
    sunny: `
      bg-gradient-to-br from-brand-secondary to-yellow-400
      text-brand-textDark border-3 border-yellow-300
      shadow-[4px_4px_10px_rgba(255,202,40,0.3)]
      hover:shadow-[6px_6px_14px_rgba(255,202,40,0.4)]
      hover:-translate-y-0.5
      focus:ring-brand-secondary/30
    `,
    // 薰衣草紫按钮
    lavender: `
      bg-gradient-to-br from-brand-accent to-purple-300
      text-white border-3 border-purple-200
      shadow-[4px_4px_10px_rgba(179,157,219,0.3)]
      hover:shadow-[6px_6px_14px_rgba(179,157,219,0.4)]
      hover:-translate-y-0.5
      focus:ring-brand-accent/30
    `,
    // 薄荷绿按钮
    mint: `
      bg-gradient-to-br from-brand-success to-green-400
      text-white border-3 border-green-300
      shadow-[4px_4px_10px_rgba(129,199,132,0.3)]
      hover:shadow-[6px_6px_14px_rgba(129,199,132,0.4)]
      hover:-translate-y-0.5
      focus:ring-brand-success/30
    `,
  };

  const sizes = {
    sm: "px-4 py-2 text-xs gap-1.5",
    md: "px-6 py-3 text-sm gap-2",
    lg: "px-8 py-3.5 text-base gap-2",
    xl: "px-10 py-4 text-lg gap-2.5",
  };

  return (
    <Component
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...(props as any)}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="flex items-center">{icon}</span>
      ) : null}
      {children}
    </Component>
  );
};
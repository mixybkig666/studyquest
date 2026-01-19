import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  variant?: 'default' | 'flat' | 'glass' | 'peach' | 'sunny' | 'lavender' | 'mint';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  interactive = false,
  variant = 'default'
}) => {
  // Claymorphism 暖色卡片变体
  const variants = {
    // 默认 - 暖白色
    default: `
      clay-card
    `,
    // 扁平 - 柔和奶油色
    flat: `
      bg-brand-borderLight border-2 border-brand-border/50
      rounded-clay
    `,
    // 玻璃 - 暖色半透明
    glass: `
      glass-panel
    `,
    // 桃色 - 主色调
    peach: `
      bg-gradient-to-br from-orange-50 to-brand-border
      border-3 border-brand-primary/30
      rounded-clay
      shadow-clay-sm
    `,
    // 阳光黄
    sunny: `
      bg-gradient-to-br from-yellow-50 to-yellow-100
      border-3 border-brand-secondary/30
      rounded-clay
      shadow-[4px_4px_12px_rgba(255,202,40,0.15)]
    `,
    // 薰衣草紫
    lavender: `
      bg-gradient-to-br from-purple-50 to-purple-100
      border-3 border-brand-accent/30
      rounded-clay
      shadow-[4px_4px_12px_rgba(179,157,219,0.15)]
    `,
    // 薄荷绿
    mint: `
      bg-gradient-to-br from-green-50 to-green-100
      border-3 border-brand-success/30
      rounded-clay
      shadow-[4px_4px_12px_rgba(129,199,132,0.15)]
    `,
  };

  const interactiveStyles = interactive ? `
    cursor-pointer 
    hover:shadow-clay-lg hover:-translate-y-1 
    transition-all duration-300 ease-out
    active:scale-[0.98] active:shadow-clay-pressed
  ` : '';

  return (
    <div
      onClick={onClick}
      className={`
        p-5 sm:p-6
        ${variants[variant]}
        ${interactiveStyles}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
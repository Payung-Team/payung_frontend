import React from 'react';

interface IconProps {
  name: string;
  variant?: 'filled' | 'outlined' | 'two-tone';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

const sizeMap = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-2xl',
};

const variantMap = {
  filled: 'material-icons',
  outlined: 'material-icons-outlined',
  'two-tone': 'material-icons-two-tone',
};

export const Icon: React.FC<IconProps> = ({
  name,
  variant = 'filled',
  size = 'medium',
  className = '',
  color = 'currentColor',
  style = {},
}) => {
  return (
    <span
      className={`${variantMap[variant]} ${sizeMap[size]} ${className}`}
      style={{ 
        color,
        ...style,
      }}
    >
      {name}
    </span>
  );
};

export default Icon;

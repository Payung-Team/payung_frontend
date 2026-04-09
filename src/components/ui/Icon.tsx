import React from 'react';

interface IconProps {
  name: string;
  variant?: 'filled' | 'outlined' | 'two-tone';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  color?: string;
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
}) => {
  return (
    <span
      className={`${variantMap[variant]} ${sizeMap[size]} ${className}`}
      style={{ color }}
    >
      {name}
    </span>
  );
};

export default Icon;

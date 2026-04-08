import React from 'react';

interface SkeletonProps {
  className?: string; // Optional Tailwind classes
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  circle?: boolean;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  borderRadius = '8px',
  circle = false,
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #F0F1F3 25%, #F6FAF9 50%, #F0F1F3 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    width: width,
    height: height,
    borderRadius: circle ? '50%' : borderRadius,
    ...style,
  };

  return (
    <div 
      className={`skeleton-shimmer ${className}`} 
      style={baseStyle} 
    />
  );
};

export default Skeleton;

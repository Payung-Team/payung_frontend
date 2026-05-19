import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Card({ children, className = '', style }: Readonly<CardProps>) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`} style={style}>
      {children}
    </div>
  );
}

import React from 'react';
import Skeleton from './Skeleton';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number | string;
  className?: string;
  showStatus?: boolean;
  gradient?: string;
  loading?: boolean;
  fallbackColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 76,
  className = '',
  showStatus = false,
  gradient,
  loading = false,
  fallbackColor = '#52B69A',
}) => {
  const getInitials = (userName?: string) => {
    if (!userName) return '?';
    return userName.charAt(0).toUpperCase();
  };

  const containerStyle: React.CSSProperties = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    background: gradient || fallbackColor,
  };

  if (loading) {
    const skeletonSize = typeof size === 'number' ? size : 76;
    return <Skeleton circle width={skeletonSize} height={skeletonSize} className={className} />;
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold relative border-[3px] border-white shadow-[0_4px_16px_rgba(82,182,154,0.2)] flex-shrink-0 ${className}`}
      style={containerStyle}
    >
      {src ? (
        <img src={src} alt={name || 'avatar'} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span style={{ fontSize: typeof size === 'number' ? `${size / 3}px` : '1.5rem' }}>
          {getInitials(name)}
        </span>
      )}

      {showStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] bg-[#52B69A] rounded-full border-2 border-white flex items-center justify-center shadow-sm">
          <svg className="w-[11px] h-[11px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default Avatar;

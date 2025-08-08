import React from 'react';

interface DefaultUserIconProps {
  size?: number;
  className?: string;
}

export const DefaultUserIcon: React.FC<DefaultUserIconProps> = ({ 
  size = 100, 
  className = '' 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="50" cy="50" r="50" fill="#E0E0E0"/>
    <circle cx="50" cy="35" r="15" fill="#9E9E9E"/>
    <path 
      d="M20 80 C20 65, 35 55, 50 55 C65 55, 80 65, 80 80" 
      fill="#9E9E9E"
    />
  </svg>
);

export default DefaultUserIcon;

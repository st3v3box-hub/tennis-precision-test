import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<Props> = ({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled}
    className={`
      inline-flex items-center gap-2 font-medium rounded-xl border transition-all duration-150
      focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
      active:scale-95 select-none
      ${variants[variant]} ${sizes[size]}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${className}
    `}
  >
    {icon && <span>{icon}</span>}
    {children}
  </button>
);

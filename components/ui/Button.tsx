
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nasa-gray-900 transition-all duration-200 ease-in-out inline-flex items-center justify-center';

  const variantClasses = {
    primary: 'bg-nasa-blue hover:bg-nasa-light-blue text-white focus:ring-nasa-light-blue',
    secondary: 'bg-nasa-gray-700 hover:bg-nasa-gray-800 text-nasa-gray-100 focus:ring-nasa-gray-500',
    danger: 'bg-nasa-red hover:bg-red-700 text-white focus:ring-nasa-red',
  };

  const sizeClasses = {
    sm: 'py-1 px-2 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };
  
  const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

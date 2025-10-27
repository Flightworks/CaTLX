
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-nasa-gray-300 mb-1">
        {label}
      </label>
      <select
        id={id}
        className="block w-full pl-3 pr-10 py-2 text-base bg-nasa-gray-700 border-nasa-gray-600 focus:outline-none focus:ring-nasa-blue focus:border-nasa-blue sm:text-sm rounded-md text-white disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;

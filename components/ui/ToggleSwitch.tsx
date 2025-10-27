import React from 'react';

interface ToggleSwitchProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, options, selectedValue, onChange }) => {
  return (
    <div className="flex items-center space-x-2" role="radiogroup" aria-label={label}>
      <span id="toggle-label" className="text-sm font-medium text-nasa-gray-300">
        {label}
      </span>
      <div className="relative flex items-center bg-nasa-gray-700 rounded-full p-1">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nasa-gray-800 focus:ring-nasa-blue ${
              selectedValue === option.value ? 'text-white' : 'text-nasa-gray-300 hover:text-white'
            }`}
            role="radio"
            aria-checked={selectedValue === option.value}
            aria-labelledby={`option-${option.value}`}
          >
            {selectedValue === option.value && (
              <span className="absolute inset-0 bg-nasa-blue rounded-full z-0" aria-hidden="true"></span>
            )}
            <span id={`option-${option.value}`} className="relative z-10">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToggleSwitch;

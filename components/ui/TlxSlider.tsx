import React from 'react';

interface TlxSliderProps {
  title: string;
  description: string;
  lowAnchor: string;
  highAnchor: string;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

const TlxSlider: React.FC<TlxSliderProps> = ({ title, description, lowAnchor, highAnchor, value, onChange, compact = false }) => {
  return (
    <div className="space-y-3 p-4 bg-nasa-gray-900 rounded-md">
      <div>
        <h4 className="text-lg font-semibold text-white">{title}</h4>
        {!compact && (
            <p className="text-sm text-nasa-gray-300">{description}</p>
        )}
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-nasa-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-7">
          <span className="px-2 py-1 text-xs font-semibold text-white bg-nasa-blue rounded-md">{value}</span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-nasa-gray-400">
        <span>{lowAnchor}</span>
        <span>{highAnchor}</span>
      </div>
    </div>
  );
};

export default TlxSlider;
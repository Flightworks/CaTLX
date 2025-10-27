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

const getScoreColor = (score: number): string => {
  const green = [74, 222, 128];
  const blue = [96, 165, 250];
  const red = [248, 113, 113];

  let r, g, b;

  if (score <= 50) {
    const t = score / 50;
    r = Math.round(green[0] + t * (blue[0] - green[0]));
    g = Math.round(green[1] + t * (blue[1] - green[1]));
    b = Math.round(green[2] + t * (blue[2] - green[2]));
  } else {
    const t = (score - 50) / 50;
    r = Math.round(blue[0] + t * (red[0] - blue[0]));
    g = Math.round(blue[1] + t * (red[1] - blue[1]));
    b = Math.round(blue[2] + t * (red[2] - blue[2]));
  }

  return `rgb(${r}, ${g}, ${b})`;
};

const sliderStyle = `
  input[type=range].tlx-slider {
    -webkit-appearance: none;
    background: transparent;
    width: 100%;
    cursor: pointer;
  }
  input[type=range].tlx-slider:focus {
    outline: none;
  }
  /* Track */
  input[type=range].tlx-slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 8px;
    background: linear-gradient(to right, rgb(74, 222, 128), rgb(96, 165, 250), rgb(248, 113, 113));
    border-radius: 4px;
  }
  input[type=range].tlx-slider::-moz-range-track {
    width: 100%;
    height: 8px;
    background: linear-gradient(to right, rgb(74, 222, 128), rgb(96, 165, 250), rgb(248, 113, 113));
    border-radius: 4px;
  }
  /* Thumb */
  input[type=range].tlx-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    margin-top: -6px; /* Position thumb centrally */
    width: 20px;
    height: 20px;
    background: #f8fafc; /* slate-50 */
    border-radius: 50%;
    border: 2px solid #52525b; /* zinc-600 */
    transition: transform 0.15s ease-in-out;
  }
  input[type=range].tlx-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #f8fafc;
    border-radius: 50%;
    border: 2px solid #52525b;
    transition: transform 0.15s ease-in-out;
  }
  input[type=range].tlx-slider:active::-webkit-slider-thumb {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.3);
  }
  input[type=range].tlx-slider:active::-moz-range-thumb {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.3);
  }
`;


const TlxSlider: React.FC<TlxSliderProps> = ({ title, description, lowAnchor, highAnchor, value, onChange, compact = false }) => {
  const color = getScoreColor(value);

  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${value}%`,
    transform: `translateX(-50%)`,
    bottom: '12px',
    backgroundColor: color,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  };

  const pointerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: '-4px',
    transform: 'translateX(-50%)',
    width: '0',
    height: '0',
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: `4px solid ${color}`,
  };

  const content = (
    <div className="w-full">
      <style>{sliderStyle}</style>
      <div className="relative mb-2 h-8">
        <div style={bubbleStyle}>
          {value}
          <div style={pointerStyle}></div>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="tlx-slider"
        aria-label={title}
      />
      <div className="flex justify-between text-xs text-nasa-gray-400 mt-2">
        <span>{lowAnchor}</span>
        <span>{highAnchor}</span>
      </div>
    </div>
  );

  if (compact) {
    return (
        <div className="p-4 bg-nasa-gray-900 rounded-lg">
            <h4 className="text-md font-medium text-white mb-2">{title}</h4>
            {content}
        </div>
    );
  }

  return (
    <div className="p-4 bg-nasa-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-nasa-gray-400 my-2">{description}</p>
        {content}
    </div>
  );
};

export default TlxSlider;

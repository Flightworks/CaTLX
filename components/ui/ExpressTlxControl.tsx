import { useId, type CSSProperties } from 'react';

interface ExpressTlxControlProps {
  title: string;
  lowAnchor: string;
  highAnchor: string;
  value: number;
  onChange: (value: number) => void;
}

export default function ExpressTlxControl({ title, lowAnchor, highAnchor, value, onChange }: ExpressTlxControlProps) {
  const id = useId();
  return (
    <div className="min-w-0 bg-nasa-gray-900 px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex min-h-6 items-center justify-between gap-1.5">
        <label htmlFor={id} className="text-sm font-medium leading-tight text-white">{title}</label>
        <span aria-hidden="true" className="min-w-8 shrink-0 rounded-md bg-blue-400/10 px-1.5 text-center text-sm font-semibold leading-6 tabular-nums text-blue-200">
          {value}
        </span>
      </div>
      <input id={id} type="range" min="0" max="100" value={value} aria-describedby={`${id}-anchors`}
        onChange={event => onChange(event.target.valueAsNumber)}
        className="express-tlx-slider" style={{ '--tlx-progress': `${value}%` } as CSSProperties} />
      <div id={`${id}-anchors`} className="flex justify-between gap-2 text-xs leading-tight text-nasa-gray-300">
        <span>{lowAnchor}</span>
        <span className="text-right">{highAnchor}</span>
      </div>
    </div>
  );
}

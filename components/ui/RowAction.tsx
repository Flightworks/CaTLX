import type { ButtonHTMLAttributes } from 'react';

const paths = {
  edit: 'm14 5 5 5M4 20l4.5-1 12-12a1.5 1.5 0 0 0 0-2l-1.5-1.5a1.5 1.5 0 0 0-2 0l-12 12L4 20Z',
  delete: 'M4 7h16m-10 4v5m4-5v5M9 7V4h6v3m3 0-.8 12a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9L6 7',
  archive: 'M4 4h16v4H4zM6 8v12h12V8m-8 5h4',
  restore: 'M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6',
  up: 'M12 19V5m-5 5 5-5 5 5',
  down: 'M12 5v14m-5-5 5 5 5-5',
};

type RowActionProps = Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled' | 'className'> & {
  icon: keyof typeof paths;
  label: string;
};

export default function RowAction({ icon, label, className = '', ...props }: RowActionProps) {
  return (
    <button type="button" aria-label={label} title={label} {...props}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md text-nasa-gray-400 transition-colors enabled:hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink disabled:cursor-not-allowed disabled:opacity-40 lg:size-8 ${icon === 'delete' ? 'enabled:hover:text-danger-ink' : 'enabled:hover:text-foreground'} ${className}`}>
      <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[icon]} />
      </svg>
    </button>
  );
}

import React from 'react';

interface SelectorProps {
  label: string;
  value: any;
  options: { value: any; label: string }[];
  onChange: (value: any) => void;
  isPLocked?: boolean;
  disabled?: boolean;
}

const Selector: React.FC<SelectorProps> = ({ label, value, options, onChange, isPLocked, disabled = false }) => {
    const currentIndex = options.findIndex(o => String(o.value) === String(value));
    const next = () => {
        if (disabled) return;
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
    };
    const prev = () => {
        if (disabled) return;
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
    };

    return (
        <div className={`flex flex-col items-center space-y-1.5 select-none w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className={`text-[10px] uppercase tracking-wider font-display h-4 transition-colors duration-150 ${isPLocked ? 'text-[var(--plock-color)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
            <div className="flex items-center justify-center w-full min-w-0">
                <button onClick={prev} disabled={disabled} className="px-1 text-gray-500 hover:text-white transition-colors flex-shrink-0">{'<'}</button>
                <div className="flex-grow mx-1">
                    <div className={`text-center text-[11px] font-mono font-bold text-[var(--text-screen)] bg-[var(--bg-control)] px-3 py-1 rounded-sm border ${isPLocked ? 'border-[var(--plock-color)]' : 'border-[var(--border-color)]/50'}`}>
                        {options.find(o => String(o.value) === String(value))?.label || '---'}
                    </div>
                </div>
                <button onClick={next} disabled={disabled} className="px-1 text-gray-500 hover:text-white transition-colors flex-shrink-0">{'>'}</button>
            </div>
        </div>
    );
};

export default React.memo(Selector);
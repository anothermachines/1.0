import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMidiMapping } from '../contexts/MidiContext';
import { MidiMapTarget } from '../types';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  size?: number;
  unit?: string;
  isPLocked?: boolean;
  isAutomated?: boolean;
  disabled?: boolean;
  displayTransform?: (value: number) => string;
  className?: string;
  editable?: boolean;
  animationClass?: string;
  style?: React.CSSProperties;
  mapInfo?: Omit<MidiMapTarget, 'type'>;
  onDisabledClick?: () => void;
}

const Knob: React.FC<KnobProps> = ({ label, value, min, max, step = 1, onChange, size = 50, unit = '', isPLocked = false, isAutomated = false, disabled = false, displayTransform, className = '', editable = true, animationClass, style, mapInfo, onDisabledClick }) => {
  const { isLearning, learningTarget, mapTarget } = useMidiMapping();
  const isSelectedTarget = isLearning && learningTarget?.path === mapInfo?.path;
  
  const dragState = useRef({
      initialY: 0,
      initialValue: 0,
      isFineTuning: false,
  });
  
  const lastSentValueRef = useRef(value);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value));
    }
  }, [value, isEditing]);

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }
    if (isEditing || isLearning) return;
    if ('button' in e && e.button !== 0) return;
    e.preventDefault();
    
    dragState.current.initialY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialVal = typeof value === 'number' && !isNaN(value) ? value : min;
    dragState.current.initialValue = initialVal;
    lastSentValueRef.current = initialVal;
    dragState.current.isFineTuning = e.shiftKey;
    
    setIsInteracting(true);
  }, [value, min, disabled, isEditing, isLearning, dragState, onDisabledClick]);

  useEffect(() => {
    if (!isInteracting) return;

    const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
        if ('preventDefault' in e) e.preventDefault();
        
        const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaY = dragState.current.initialY - currentY;
        
        const range = max - min;
        const sensitivity = 200; 
        const fineTuneMultiplier = dragState.current.isFineTuning ? 0.1 : 1;
        const valueChange = (deltaY / sensitivity) * range * fineTuneMultiplier;
        
        let newValue = dragState.current.initialValue + valueChange;
        
        if (step > 0) {
          newValue = Math.round(newValue / step) * step;
        }
        
        newValue = Math.max(min, Math.min(max, newValue));
    
        const fixedPoints = step < 1 ? String(step).split('.')[1]?.length || 2 : 0;
        const formattedNewValue = parseFloat(newValue.toFixed(fixedPoints));
    
        if (formattedNewValue !== lastSentValueRef.current) {
            onChange(formattedNewValue);
            lastSentValueRef.current = formattedNewValue;
            
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
        }
    };

    const handleInteractionEnd = () => {
      setIsInteracting(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift' && !e.repeat) {
            dragState.current.isFineTuning = true;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift') {
            dragState.current.isFineTuning = false;
        }
    };

    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('touchmove', handleInteractionMove, { passive: false });
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      document.body.style.cursor = 'default';
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  }, [isInteracting, min, max, step, onChange, dragState]);


  const formattedValue = () => {
      if (typeof value !== 'number' || isNaN(value)) return '---';
      if (displayTransform) return displayTransform(value);
      const fixedPoints = step < 1 ? (String(step).split('.')[1] || '').length : 0;
      return value.toFixed(fixedPoints);
  }

  const handleDisplayDoubleClick = () => {
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }
    if (editable) {
      setIsEditing(true);
    }
  };

  const handleEditCommit = () => {
    let numericValue = parseFloat(editValue);
    if (!isNaN(numericValue)) {
      numericValue = Math.max(min, Math.min(max, numericValue));
      onChange(numericValue);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditCommit();
    } else if (e.key === 'Escape') {
      setEditValue(String(value)); // revert
      setIsEditing(false);
    }
  };

  const handleMapClick = () => {
      if (isLearning && mapInfo) {
          mapTarget({
              ...mapInfo,
              type: 'knob',
              range: { min, max },
              step,
          });
      }
  };

  const progress = (Math.max(min, Math.min(max, value)) - min) / (max - min);
  const rotation = -135 + progress * 270;
  
  const indicatorColor = isPLocked
    ? 'var(--plock-color)'
    : isAutomated
    ? '#38bdf8' // light blue
    : 'var(--accent-color)';

  return (
    <div 
      className={`flex flex-col items-center justify-start space-y-1 select-none font-mono ${disabled ? 'opacity-50' : ''} ${className}`} 
      style={{ width: size, touchAction: 'none', ...style }}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      aria-valuetext={`${formattedValue()}${!displayTransform && unit}`}
      tabIndex={disabled ? -1 : 0}
    >
      <div
        className={`knob-container relative rounded-full flex items-center justify-center transition-all duration-150 ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'} ${isInteracting ? 'interacting' : ''}`}
        style={{ 
            width: size, 
            height: size,
        }}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        onClick={handleMapClick}
      >
        {isLearning && mapInfo && (
            <div className={`absolute inset-0 rounded-full z-20 cursor-pointer transition-all ${
                isSelectedTarget 
                ? 'bg-cyan-500/50 animate-pulse-glow border-2 border-cyan-300' 
                : 'bg-transparent hover:bg-cyan-500/20'
            }`} />
        )}

        {/* Knob Body */}
        <div className={`absolute inset-0 rounded-full bg-neutral-800 ${animationClass}`} style={{ boxShadow: 'inset 0 2px 4px var(--shadow-deep), 0 1px 1px var(--highlight-soft)' }}/>
        <div 
          className="absolute rounded-full" 
          style={{ 
            width: '88%', 
            height: '88%',
            background: 'linear-gradient(145deg, #3c3c3c, #2a2a2a)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
          }}
        >
           {/* Indicator */}
          <div className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)` }}>
              <div 
                  className="absolute w-0.5 rounded-full left-1/2 -translate-x-1/2" 
                  style={{
                      background: indicatorColor,
                      boxShadow: `0 0 3px 1px ${indicatorColor}99`,
                      top: '4%',
                      height: '40%',
                  }}
              />
          </div>
        </div>
       
        {isEditing && (
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditCommit}
              onKeyDown={handleEditKeyDown}
              autoFocus
              className="absolute w-full h-full bg-transparent text-center outline-none p-0 border-none rounded-sm text-[var(--text-screen)] text-[10px]"
              style={{MozAppearance: 'textfield'}}
            />
          )
        }
      </div>
      <div className="flex flex-col items-center h-8 justify-start">
        <span className={`text-[10px] uppercase tracking-wider font-display transition-colors duration-150 ${isPLocked ? 'text-[var(--plock-color)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
        <span 
            className={`text-[10px] font-bold text-[var(--text-screen)] -mt-0.5 transition-all duration-150 ${editable && !disabled ? 'hover:bg-[var(--accent-color)] hover:text-[var(--text-dark)] cursor-pointer rounded px-1' : ''}`}
            onDoubleClick={handleDisplayDoubleClick}
            title={editable && !disabled ? "Double-click to type value" : ""}
        >
            {formattedValue()}{!displayTransform && unit}
        </span>
      </div>
    </div>
  );
};

export default React.memo(Knob);
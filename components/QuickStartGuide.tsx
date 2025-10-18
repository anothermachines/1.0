import React, { useState, useLayoutEffect } from 'react';

interface GuideStep {
  targetSelector: string;
  title: string;
  content: string;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const steps: GuideStep[] = [
  {
    targetSelector: '[data-tour-id="sequencer-grid"]',
    title: '1. The Sequencer',
    content: "This is the heart of your groove. Click steps to create rhythms and select tracks on the left to bring them to life.",
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour-id="instrument-editor"]',
    title: '2. Sonic Laboratory',
    content: "Craft your unique sounds here. Every knob sculpts the selected instrument, from deep kicks to searing leads. This is your sound design playground.",
    position: 'right',
  },
  {
    targetSelector: '[data-tour-id="mixer-pianoroll"]',
    title: '3. Mix & Melody',
    content: "Balance your tracks in the mixer or switch to the piano roll to compose melodies. Toggle with the piano icon in the sequencer toolbar.",
    position: 'top',
  },
  {
    targetSelector: '[data-tour-id="effects-rack"]',
    title: '4. Master Effects',
    content: "Add space, grit, and cohesion. The master effects process your entire mix, providing the final glue for a professional sound.",
    position: 'left',
  },
];

interface QuickStartGuideProps {
  onFinish: () => void;
}

const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const updateRect = () => {
      const step = steps[currentStep];
      const element = document.querySelector(step.targetSelector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        console.warn(`Quick Start Guide: Target element "${step.targetSelector}" not found.`);
        setTargetRect(null); 
      }
    };
    
    // Using a timeout allows the UI to settle before measuring
    const timeoutId = setTimeout(updateRect, 100);
    
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const getTooltipPosition = () => {
    if (!targetRect) return { display: 'none' };
    const step = steps[currentStep];
    const tooltipWidth = 300;
    const tooltipHeight = 160; 
    const offset = 20;

    let top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + offset;
        break;
      case 'top':
        top = targetRect.top - offset - tooltipHeight;
        break;
      case 'right':
        left = targetRect.right + offset;
        break;
      case 'left':
        left = targetRect.left - offset - tooltipWidth;
        break;
    }
    
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

    return { top, left };
  };

  const getArrowStyle = (): React.CSSProperties => {
      if (!targetRect) return {};
      const step = steps[currentStep];
      const { top, left, width, height } = targetRect;
      const tooltipPos = getTooltipPosition() as {top: number, left: number};

      const style: React.CSSProperties = {
          position: 'absolute',
          width: '14px',
          height: '14px',
          background: 'var(--bg-panel-dark)',
          border: '1px solid var(--border-color)',
          transform: 'rotate(45deg)',
          zIndex: -1,
      };

      switch (step.position) {
          case 'bottom':
              style.top = -8;
              style.left = Math.max(6, Math.min(280, left + width / 2 - tooltipPos.left - 7));
              style.borderBottomColor = 'transparent';
              style.borderRightColor = 'transparent';
              break;
          case 'top':
              style.bottom = -8;
              style.left = Math.max(6, Math.min(280, left + width / 2 - tooltipPos.left - 7));
              style.borderTopColor = 'transparent';
              style.borderLeftColor = 'transparent';
              break;
          case 'right':
              style.left = -8;
              style.top = Math.max(6, Math.min(140, top + height / 2 - tooltipPos.top - 7));
              style.borderBottomColor = 'transparent';
              style.borderLeftColor = 'transparent';
              break;
          case 'left':
              style.right = -8;
              style.top = Math.max(6, Math.min(140, top + height / 2 - tooltipPos.top - 7));
              style.borderTopColor = 'transparent';
              style.borderRightColor = 'transparent';
              break;
      }
      return style;
  };
  
  const highlightStyle: React.CSSProperties = targetRect ? {
    position: 'fixed',
    top: targetRect.top - 8,
    left: targetRect.left - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
    borderRadius: '12px',
    boxShadow: `0 0 20px 4px var(--accent-color), 0 0 0 9999px rgba(0, 0, 0, 0.75)`,
    border: '2px solid var(--accent-color)',
    zIndex: 101,
    pointerEvents: 'none',
    transition: 'all 0.35s ease-in-out',
  } : { display: 'none' };

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in">
        <div style={highlightStyle} />
        {targetRect && (
             <div 
                className="fixed bg-[var(--bg-panel-dark)] rounded-lg border border-[var(--border-color)] p-4 w-[300px] text-sm shadow-2xl animate-fade-in font-sans"
                style={{ ...getTooltipPosition(), zIndex: 102, transition: 'all 0.35s ease-in-out' }}
             >
                <div style={getArrowStyle()}/>
                <h3 className="text-lg font-bold text-[var(--accent-color)] mb-2">{steps[currentStep].title}</h3>
                <p className="text-neutral-300 leading-relaxed mb-4 text-xs">{steps[currentStep].content}</p>
                <div className="flex justify-between items-center">
                    <div>
                        <button onClick={onFinish} className="px-3 py-1 rounded bg-transparent hover:bg-neutral-600 text-xs font-bold text-neutral-400 hover:text-white">Skip</button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-neutral-400 text-xs">{currentStep + 1} / {steps.length}</span>
                        {currentStep > 0 && <button onClick={handlePrev} className="px-3 py-1 rounded bg-neutral-600 hover:bg-neutral-500 text-xs font-bold text-white">Prev</button>}
                        <button onClick={handleNext} className="px-4 py-1 rounded bg-[var(--accent-color)] text-[var(--text-dark)] text-xs font-bold">{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</button>
                    </div>
                </div>
             </div>
        )}
    </div>
  );
};

export default QuickStartGuide;
import React, { useState } from 'react';

interface WelcomeScreenProps {
  onStart: (dontShowAgain: boolean) => void;
}

const AppLogoAnimated: React.FC = () => (
    <div className="flex items-center justify-center relative mb-6" style={{ animation: 'float 6s ease-in-out infinite' }}>
        <style>
            {`
                #logo-path-outer { stroke-dasharray: 200; stroke-dashoffset: 200; animation: logo-draw 2s ease-out 0.5s forwards; }
                #logo-path-inner { stroke-dasharray: 100; stroke-dashoffset: 100; animation: logo-draw 1.5s ease-out 1s forwards; }
                #logo-lines { stroke-dasharray: 50; stroke-dashoffset: 50; animation: logo-draw 1.5s ease-out 1.5s forwards; }
                #logo-fill { animation: fade-in 1s ease 2.5s forwards; opacity: 0; }
            `}
        </style>
        <svg width="120" height="105" viewBox="0 0 52 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="welcomeLogoGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g style={{ filter: 'url(#welcomeLogoGlow)' }}>
                <path id="logo-fill" d="M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z" fill="var(--bg-panel-dark)" />
                <path id="logo-path-outer" d="M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z" stroke="var(--accent-color)" strokeWidth="2.5" strokeLinejoin="round" />
                <path id="logo-path-inner" d="M26 13L13 20V32L26 39L39 32V20L26 13Z" stroke="var(--accent-color)" strokeWidth="1.5" strokeOpacity="0.5" />
                <g id="logo-lines" stroke="var(--accent-color)" strokeWidth="1" strokeOpacity="0.4">
                    <path d="M1 13.5L26 24.5" />
                    <path d="M51 13.5L26 24.5" />
                    <path d="M26 48V24.5" />
                </g>
            </g>
        </svg>
    </div>
);


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = () => {
    onStart(dontShowAgain);
  };

  const handleSkip = () => {
    // This is the key: mark the guide as finished before starting.
    localStorage.setItem('fm8r-quickstart-finished', 'true');
    onStart(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="w-full max-w-md rounded-lg border border-neutral-800 flex flex-col items-center shadow-2xl animate-slide-up p-8 text-center relative overflow-hidden"
        style={{
            backgroundColor: '#000000',
            animation: 'slide-up 0.3s ease-out forwards',
            boxShadow: '0 0 25px 5px rgba(var(--accent-rgb), 0.15)' 
        }}
      >
        <AppLogoAnimated />
        <h1 className="text-4xl font-bold uppercase tracking-tighter text-white" style={{ animation: 'text-glow-in 2s ease-out 2s forwards', opacity: 0 }}>FM8/R</h1>
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-400 font-mono mb-6" style={{ animation: 'text-glow-in 2s ease-out 2.2s forwards', opacity: 0 }}>Another Groovebox</p>
        
        <p className="text-neutral-300 font-sans mb-8 max-w-sm animate-fade-in" style={{ animationDelay: '2.5s' }}>
          Click "Start Engine" to initialize the audio context. This is required by your browser to enable sound.
        </p>

        <button 
          onClick={handleStart}
          className="w-full max-w-xs py-4 text-lg font-bold rounded-md bg-gradient-to-br from-[var(--accent-color-active)] to-[var(--accent-color)] text-[var(--text-dark)] transition-all duration-200 transform border"
          style={{ animation: 'start-button-throb 2.5s infinite 3s, fade-in 0.5s ease 3s forwards', opacity: 0 }}
        >
          START ENGINE
        </button>

        <button
          onClick={handleSkip}
          className="mt-4 text-sm text-neutral-400 hover:text-white hover:underline transition-colors animate-fade-in"
          style={{ animationDelay: '3.2s', opacity: 0 }}
        >
          or, Jump Right In
        </button>
        
        <div className="mt-6 flex items-center animate-fade-in" style={{ animationDelay: '3.5s', opacity: 0 }}>
          <input 
            type="checkbox" 
            id="dontShowAgain"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
          />
          <label htmlFor="dontShowAgain" className="ml-2 text-sm text-neutral-400 font-sans cursor-pointer">
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
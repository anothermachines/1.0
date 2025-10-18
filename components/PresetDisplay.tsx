import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';
import Knob from './Knob';

interface PresetDisplayProps {
  onProjectNameClick: () => void;
}

const getPulseColor = (volume: number): string => {
    // Green up to -2dB (approx 0.8 linear), then transition to red up to max
    if (volume <= 0.8) {
        return 'hsl(120, 90%, 55%)'; // Green
    }
    // Map volume from [0.8 to 1.5] to hue [120 (green) to 0 (red)]
    const normalizedVolume = Math.min(1, (volume - 0.8) / (1.5 - 0.8));
    const hue = 120 - (normalizedVolume * 120);
    return `hsl(${hue}, 90%, 55%)`;
};


const PresetDisplay: React.FC<PresetDisplayProps> = ({ 
    onProjectNameClick,
}) => {
  const { projectName, bpm, masterVolume, setBpm, setMasterVolume, isSpectator, triggerViewerModeInteraction } = useStore(state => ({
    projectName: state.preset.name,
    bpm: state.preset.bpm,
    masterVolume: state.preset.globalFxParams.masterVolume,
    setBpm: state.setBpm,
    setMasterVolume: state.setMasterVolume,
    isSpectator: state.isSpectator,
    triggerViewerModeInteraction: state.triggerViewerModeInteraction,
  }), shallow);


  return (
    <div className="flex items-center space-x-3 bg-gradient-to-b from-[var(--bg-panel-dark)] to-[var(--bg-chassis)] rounded-md p-2 border border-[var(--border-color-darker)] shadow-inner">
      <button 
        onClick={onProjectNameClick} 
        className="flex-grow bg-[var(--bg-panel-dark)] h-14 rounded-sm border border-[var(--border-color-darker)] p-2 text-left hover:bg-[var(--bg-panel)] transition-colors"
        title="Open Project Library"
      >
        <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase">PROJECT</div>
        <div className="text-sm font-mono text-cyan-300 truncate leading-tight">{projectName}</div>
      </button>
      <div className="flex-shrink-0 flex items-center space-x-3">
         <Knob
            label="BPM"
            value={bpm}
            min={60}
            max={220}
            step={1}
            onChange={setBpm}
            size={46}
            mapInfo={{ path: 'preset.bpm', label: 'BPM' }}
            disabled={isSpectator}
            onDisabledClick={triggerViewerModeInteraction}
        />
        <Knob
            label="MASTER"
            value={masterVolume}
            min={0}
            max={1.5}
            step={0.01}
            onChange={setMasterVolume}
            size={46}
            displayTransform={(v) => {
                const db = 20 * Math.log10(v);
                return isFinite(db) ? `${db.toFixed(1)}` : '-inf';
            }}
            unit="dB"
            animationClass="animate-master-pulse"
            style={{ '--pulse-color': getPulseColor(masterVolume) } as React.CSSProperties}
            mapInfo={{ path: 'globalFx.masterVolume', label: 'Master Volume' }}
            disabled={isSpectator}
            onDisabledClick={triggerViewerModeInteraction}
        />
      </div>
    </div>
  );
};

export default PresetDisplay;
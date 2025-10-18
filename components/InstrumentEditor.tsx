import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import { Track, PLocks, LFODestination, LFOParams, FilterParams, Envelope, FXSends, ArcaneParams, RuinParams, ArtificeParams, ShiftParams, ResonParams, AlloyParams, MidiOutParams } from '../types';
import Knob from './Knob';
import InstrumentPresetManager from './InstrumentPresetManager';
import { TIME_DIVISIONS } from '../constants';
import { getParamValue, isParamLocked, getTrackValue, getSendValue, isTrackValueLocked, isSendLocked, getMidiOutParamValue, isMidiOutParamLocked } from '../utils';
import Selector from './Selector';
import TrackSelector from './TrackSelector';
import { shallow } from 'zustand/shallow';

const Section: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className = 'grid-cols-2 md:grid-cols-4' }) => (
  <div className="px-2 pb-3">
    <div className="bg-[var(--bg-panel-dark)] rounded-md border border-[var(--border-color)]/50 p-2">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3 text-center">{title}</h3>
        <div className={`grid gap-x-2 gap-y-6 ${className}`}>
            {children}
        </div>
    </div>
  </div>
);

const isAutomated = (track: Track, path: string): boolean => {
    return !!(track.automation && track.automation[path] && track.automation[path].length > 0);
};

const EditorHeader: React.FC<{
    trackName: string;
    trackId: number;
}> = ({ trackName, trackId }) => {
    const { 
        automationRecording, startAutomationRecording, stopAutomationRecording, 
        clearAutomation, renameTrack, isViewerMode 
    } = useStore(state => ({
        automationRecording: state.automationRecording,
        startAutomationRecording: state.startAutomationRecording,
        stopAutomationRecording: state.stopAutomationRecording,
        clearAutomation: state.clearAutomation,
        renameTrack: state.renameTrack,
        isViewerMode: state.isViewerMode,
    }), shallow);
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(trackName);

    useEffect(() => {
        setEditName(trackName);
    }, [trackName]);

    const handleRename = () => {
        const trimmedName = editName.trim();
        if (trimmedName && trimmedName !== trackName) {
            renameTrack(trackId, trimmedName);
        }
        setIsEditingName(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleRename();
        else if (e.key === 'Escape') {
            setEditName(trackName);
            setIsEditingName(false);
        }
    };

    const isRecording = automationRecording?.trackId === trackId;
    const recordingMode = automationRecording?.mode;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRecClick = () => {
        if (isRecording) {
            stopAutomationRecording();
        } else {
            setIsMenuOpen(prev => !prev);
        }
    };

    const handleModeSelect = (mode: 'overwrite' | 'overdub') => {
        startAutomationRecording(trackId, mode);
        setIsMenuOpen(false);
    };
    
    const handleClear = () => {
        clearAutomation(trackId);
        setIsMenuOpen(false);
    }

    return (
        <div className="bg-[var(--bg-panel-dark)] p-2 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-bold text-[var(--text-light)] uppercase tracking-widest flex items-center">
                {isEditingName ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={handleRenameKeyDown}
                        autoFocus
                        className="bg-transparent w-32 text-sm font-bold uppercase tracking-widest outline-none ring-1 ring-[var(--accent-color)] rounded-sm p-1 -m-1"
                    />
                ) : (
                    <span onDoubleClick={() => !isViewerMode && setIsEditingName(true)}>{trackName}</span>
                )}
                <span className="ml-2">Editor</span>
            </h2>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={handleRecClick}
                    className={`px-3 py-1 text-xs font-bold rounded-sm border transition-all text-white w-32 ${
                        isRecording 
                        ? 'bg-red-600 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse' 
                        : 'bg-neutral-600 hover:bg-neutral-500 border-neutral-500'
                    }`}
                >
                    {isRecording ? `REC: ${recordingMode?.toUpperCase()}` : 'REC AUTOM'}
                </button>
                {isMenuOpen && !isRecording && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-md shadow-lg z-10 animate-fade-in p-1">
                        <button onClick={() => handleModeSelect('overdub')} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--border-color-light)] rounded">Overdub (Additive)</button>
                        <button onClick={() => handleModeSelect('overwrite')} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--border-color-light)] rounded">Overwrite (Replace)</button>
                        <div className="h-px bg-[var(--border-color)] my-1" />
                        <button onClick={handleClear} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--border-color-light)] rounded text-red-400">Clear All Automation</button>
                    </div>
                )}
            </div>
        </div>
    );
};


const LFO_WAVEFORM_OPTIONS = [{value: 'sine', label: 'SIN'}, {value: 'triangle', label: 'TRI'}, {value: 'sawtooth', label: 'SAW'}, {value: 'square', label: 'SQR'}];
const FILTER_TYPE_OPTIONS = [{value: 'lowpass', label: 'LP'}, {value: 'highpass', label: 'HP'}, {value: 'bandpass', label: 'BP'}, {value: 'notch', label: 'NOTCH'}];

const COMMON_DESTINATIONS: {value: LFODestination, label: string}[] = [
    {value: 'none', label: 'NONE'},
    {value: 'volume', label: 'VOLUME'},
    {value: 'pan', label: 'PAN'},
    {value: 'filter.cutoff', label: 'CUTOFF'},
    {value: 'filter.resonance', label: 'RESO'},
];

const OutputSection: React.FC<{
  track: Track;
  pLocks: PLocks | null;
  onVolumeChange: (trackId: number, volume: number) => void;
  onPanChange: (trackId: number, pan: number) => void;
  onFxSendChange: (trackId: number, fx: keyof FXSends, value: number) => void;
}> = ({ track, pLocks, onVolumeChange, onPanChange, onFxSendChange }) => {
    const isMidiTrack = track.type === 'midi';
    return (
        <Section title="OUTPUT" className="grid-cols-3 md:grid-cols-6">
            <Knob 
                label="VOL" 
                value={getTrackValue(track, pLocks, 'volume')} 
                min={0} max={1.5} step={0.01}
                onChange={v => onVolumeChange(track.id, v)} 
                isPLocked={isTrackValueLocked(pLocks, 'volume')} 
                isAutomated={isAutomated(track, 'volume')} 
                disabled={isMidiTrack}
                displayTransform={v => {
                    const db = 20 * Math.log10(v);
                    return isFinite(db) ? `${db.toFixed(1)}dB` : '-inf dB';
                }}
                mapInfo={{ path: `tracks.${track.id}.volume`, label: `${track.name} Vol` }}
            />
            <Knob 
                label="PAN" 
                value={getTrackValue(track, pLocks, 'pan')} 
                min={-1} max={1} step={0.01}
                onChange={v => onPanChange(track.id, v)} 
                isPLocked={isTrackValueLocked(pLocks, 'pan')} 
                isAutomated={isAutomated(track, 'pan')}
                disabled={isMidiTrack}
                displayTransform={v => {
                    const p = Math.round(v * 100);
                    return p === 0 ? 'C' : p < 0 ? `${Math.abs(p)}L` : `${p}R`;
                }}
                mapInfo={{ path: `tracks.${track.id}.pan`, label: `${track.name} Pan` }}
            />
            <Knob 
                label="REVERB" 
                value={getSendValue(track, pLocks, 'reverb')} 
                min={0} max={1} step={0.01}
                onChange={v => onFxSendChange(track.id, 'reverb', v)} 
                isPLocked={isSendLocked(pLocks, 'reverb')} 
                isAutomated={isAutomated(track, 'fxSends.reverb')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.reverb`, label: `${track.name} Reverb` }}
            />
            <Knob 
                label="DELAY" 
                value={getSendValue(track, pLocks, 'delay')} 
                min={0} max={1} step={0.01}
                onChange={v => onFxSendChange(track.id, 'delay', v)} 
                isPLocked={isSendLocked(pLocks, 'delay')} 
                isAutomated={isAutomated(track, 'fxSends.delay')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.delay`, label: `${track.name} Delay` }}
            />
            <Knob 
                label="DRIVE" 
                value={getSendValue(track, pLocks, 'drive')} 
                min={0} max={1} step={0.01}
                onChange={v => onFxSendChange(track.id, 'drive', v)} 
                isPLocked={isSendLocked(pLocks, 'drive')} 
                isAutomated={isAutomated(track, 'fxSends.drive')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.drive`, label: `${track.name} Drive` }}
            />
            <Knob 
                label="S.CHAIN" 
                value={getSendValue(track, pLocks, 'sidechain')} 
                min={0} max={1} step={0.01}
                onChange={v => onFxSendChange(track.id, 'sidechain', v)} 
                isPLocked={isSendLocked(pLocks, 'sidechain')} 
                isAutomated={isAutomated(track, 'fxSends.sidechain')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.sidechain`, label: `${track.name} Sidechain` }}
            />
        </Section>
    );
};

const EnvelopeSection: React.FC<{
    title: string;
    basePath: 'ampEnv' | 'filterEnv';
    track: Track;
    pLocks: PLocks | null;
    onParamChange: (path: string, value: any) => void;
    extraControls?: React.ReactNode;
}> = ({ title, basePath, track, pLocks, onParamChange, extraControls }) => {
    return (
        <Section title={title} className={extraControls ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}>
            <Knob label="ATK" value={getParamValue(track, pLocks, `${basePath}.attack`)} min={0.001} max={4} step={0.001} onChange={v => onParamChange(`${basePath}.attack`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.attack`)} isAutomated={isAutomated(track, `params.${basePath}.attack`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.attack`, label: `${track.name} ${basePath} Atk` }}/>
            <Knob label="DEC" value={getParamValue(track, pLocks, `${basePath}.decay`)} min={0.01} max={4} step={0.01} onChange={v => onParamChange(`${basePath}.decay`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.decay`)} isAutomated={isAutomated(track, `params.${basePath}.decay`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.decay`, label: `${track.name} ${basePath} Dec` }}/>
            <Knob label="SUS" value={getParamValue(track, pLocks, `${basePath}.sustain`)} min={0} max={1} step={0.01} onChange={v => onParamChange(`${basePath}.sustain`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.sustain`)} isAutomated={isAutomated(track, `params.${basePath}.sustain`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.sustain`, label: `${track.name} ${basePath} Sus` }}/>
            <Knob label="REL" value={getParamValue(track, pLocks, `${basePath}.release`)} min={0.01} max={4} step={0.01} onChange={v => onParamChange(`${basePath}.release`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.release`)} isAutomated={isAutomated(track, `params.${basePath}.release`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.release`, label: `${track.name} ${basePath} Rel` }}/>
            {extraControls}
        </Section>
    );
};

const FilterSection: React.FC<{
  basePath: 'filter';
  track: Track;
  pLocks: PLocks | null;
  onParamChange: (path: string, value: any) => void;
}> = ({ basePath, track, pLocks, onParamChange }) => (
    <Section title="FILTER" className="grid-cols-3">
        <Selector label="TYPE" value={getParamValue(track, pLocks, `${basePath}.type`)} options={FILTER_TYPE_OPTIONS} onChange={v => onParamChange(`${basePath}.type`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.type`)} />
        <Knob label="CUTOFF" value={getParamValue(track, pLocks, `${basePath}.cutoff`)} min={20} max={20000} onChange={v => onParamChange(`${basePath}.cutoff`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.cutoff`)} isAutomated={isAutomated(track, `params.${basePath}.cutoff`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.cutoff`, label: `${track.name} Cutoff` }}/>
        <Knob label="RESO" value={getParamValue(track, pLocks, `${basePath}.resonance`)} min={0.1} max={30} step={0.1} onChange={v => onParamChange(`${basePath}.resonance`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.resonance`)} isAutomated={isAutomated(track, `params.${basePath}.resonance`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.resonance`, label: `${track.name} Reso` }}/>
    </Section>
);

const LFOSection: React.FC<{
  title: string;
  basePath: 'lfo1' | 'lfo2';
  track: Track;
  pLocks: PLocks | null;
  onParamChange: (path: string, value: any) => void;
  destinations: {value: LFODestination, label: string}[];
}> = ({ title, basePath, track, pLocks, onParamChange, destinations }) => {
    const isSync = getParamValue(track, pLocks, `${basePath}.rateSync`);
    return (
        <Section title={title} className="grid-cols-2 md:grid-cols-4">
            <Selector label="WAVE" value={getParamValue(track, pLocks, `${basePath}.waveform`)} options={LFO_WAVEFORM_OPTIONS} onChange={v => onParamChange(`${basePath}.waveform`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.waveform`)} />
            <Knob label="DEPTH" value={getParamValue(track, pLocks, `${basePath}.depth`)} min={0} max={1000} onChange={v => onParamChange(`${basePath}.depth`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.depth`)} isAutomated={isAutomated(track, `params.${basePath}.depth`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.depth`, label: `${track.name} ${basePath} Depth` }}/>
            {isSync ? (
                <Selector label="RATE DIV" value={String(getParamValue(track, pLocks, `${basePath}.rateDivision`))} options={TIME_DIVISIONS.map(d => ({value: String(d.value), label: d.name}))} onChange={v => onParamChange(`${basePath}.rateDivision`, Number(v))} isPLocked={isParamLocked(track, pLocks, `${basePath}.rateDivision`)} />
            ) : (
                <Knob label="RATE" value={getParamValue(track, pLocks, `${basePath}.rate`)} min={0.01} max={50} step={0.01} onChange={v => onParamChange(`${basePath}.rate`, v)} unit="hz" isPLocked={isParamLocked(track, pLocks, `${basePath}.rate`)} isAutomated={isAutomated(track, `params.${basePath}.rate`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.rate`, label: `${track.name} ${basePath} Rate` }}/>
            )}
            <div className="flex flex-col items-center space-y-1">
                 <button onClick={() => onParamChange(`${basePath}.rateSync`, !isSync)} className={`w-full text-center text-[11px] font-mono font-bold text-[var(--text-screen)] bg-[var(--bg-control)] px-2 py-1 rounded-sm border ${isSync ? 'border-[var(--accent-color)]' : 'border-[var(--border-color)]/50'}`}>SYNC</button>
                 <button onClick={() => onParamChange(`${basePath}.retrigger`, !getParamValue(track, pLocks, `${basePath}.retrigger`))} className={`w-full text-center text-[11px] font-mono font-bold text-[var(--text-screen)] bg-[var(--bg-control)] px-2 py-1 rounded-sm border ${getParamValue(track, pLocks, `${basePath}.retrigger`) ? 'border-[var(--accent-color)]' : 'border-[var(--border-color)]/50'}`}>RETRIG</button>
            </div>
             <div className="col-span-full">
                <Selector label="DEST" value={getParamValue(track, pLocks, `${basePath}.destination`)} options={destinations} onChange={v => onParamChange(`${basePath}.destination`, v)} isPLocked={isParamLocked(track, pLocks, `${basePath}.destination`)} />
             </div>
        </Section>
    );
};

interface InstrumentEditorComponentsProps {
  track: Track;
  pLocks: PLocks | null;
  onParamChange: (path: string, value: any) => void;
}

const KickEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS, {value: 'kick.tune', label: 'TUNE'}, {value: 'kick.impact', label: 'IMPACT'}, {value: 'kick.tone', label: 'TONE'}, {value: 'kick.character', label: 'CHAR'} ];
    return <>
        <Section title="TONE" className="grid-cols-2 md:grid-cols-5">
            <Knob label="TUNE" value={getParamValue(track, pLocks, 'tune')} min={20} max={100} onChange={v => onParamChange('tune', v)} isPLocked={isParamLocked(track, pLocks, 'tune')} isAutomated={isAutomated(track, 'params.tune')} mapInfo={{ path: `tracks.${track.id}.params.tune`, label: `${track.name} Tune` }} />
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.1} max={2} step={0.01} onChange={v => onParamChange('decay', v)} isPLocked={isParamLocked(track, pLocks, 'decay')} isAutomated={isAutomated(track, 'params.decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }}/>
            <Knob label="IMPACT" value={getParamValue(track, pLocks, 'impact')} min={0} max={100} onChange={v => onParamChange('impact', v)} isPLocked={isParamLocked(track, pLocks, 'impact')} isAutomated={isAutomated(track, 'params.impact')} mapInfo={{ path: `tracks.${track.id}.params.impact`, label: `${track.name} Impact` }}/>
            <Knob label="TONE" value={getParamValue(track, pLocks, 'tone')} min={0} max={100} onChange={v => onParamChange('tone', v)} isPLocked={isParamLocked(track, pLocks, 'tone')} isAutomated={isAutomated(track, 'params.tone')} mapInfo={{ path: `tracks.${track.id}.params.tone`, label: `${track.name} Tone` }}/>
            <Knob label="CHAR" value={getParamValue(track, pLocks, 'character')} min={0} max={100} onChange={v => onParamChange('character', v)} isPLocked={isParamLocked(track, pLocks, 'character')} isAutomated={isAutomated(track, 'params.character')} mapInfo={{ path: `tracks.${track.id}.params.character`, label: `${track.name} Character` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const HatEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS, {value: 'hat.tone', label: 'TONE'}, {value: 'hat.character', label: 'CHAR'}, {value: 'hat.spread', label: 'SPREAD'} ];
    return <>
        <Section title="TONE" className="grid-cols-2 md:grid-cols-4">
            <Knob label="TONE" value={getParamValue(track, pLocks, 'tone')} min={2000} max={15000} onChange={v => onParamChange('tone', v)} isPLocked={isParamLocked(track, pLocks, 'tone')} isAutomated={isAutomated(track, 'params.tone')} mapInfo={{ path: `tracks.${track.id}.params.tone`, label: `${track.name} Tone` }}/>
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.01} max={1} step={0.01} onChange={v => onParamChange('decay', v)} isPLocked={isParamLocked(track, pLocks, 'decay')} isAutomated={isAutomated(track, 'params.decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }}/>
            <Knob label="CHAR" value={getParamValue(track, pLocks, 'character')} min={0} max={100} onChange={v => onParamChange('character', v)} isPLocked={isParamLocked(track, pLocks, 'character')} isAutomated={isAutomated(track, 'params.character')} mapInfo={{ path: `tracks.${track.id}.params.character`, label: `${track.name} Character` }}/>
            <Knob label="SPREAD" value={getParamValue(track, pLocks, 'spread')} min={1} max={4} step={0.01} onChange={v => onParamChange('spread', v)} isPLocked={isParamLocked(track, pLocks, 'spread')} isAutomated={isAutomated(track, 'params.spread')} mapInfo={{ path: `tracks.${track.id}.params.spread`, label: `${track.name} Spread` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

// --- NEW ENGINE EDITORS ---
const ArcaneEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const params = track.params as ArcaneParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'arcane.osc1_shape', label: 'OSC1 SHAPE'}, {value: 'arcane.osc2_shape', label: 'OSC2 SHAPE'},
        {value: 'arcane.osc2_pitch', label: 'OSC2 PITCH'}, {value: 'arcane.mod_amount', label: 'MOD AMT'},
        {value: 'arcane.fold', label: 'FOLD'}, {value: 'arcane.spread', label: 'SPREAD'},
    ];
    return <>
        <Section title="OSCILLATORS" className="grid-cols-2 md:grid-cols-4">
            <Knob label="SHAPE 1" value={getParamValue(track, pLocks, 'osc1_shape')} min={0} max={100} onChange={v => onParamChange('osc1_shape', v)} isPLocked={isParamLocked(track, pLocks, 'osc1_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc1_shape`, label: `${track.name} Osc1 Shape` }} />
            <Knob label="SHAPE 2" value={getParamValue(track, pLocks, 'osc2_shape')} min={0} max={100} onChange={v => onParamChange('osc2_shape', v)} isPLocked={isParamLocked(track, pLocks, 'osc2_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc2_shape`, label: `${track.name} Osc2 Shape` }} />
            <Knob label="PITCH 2" value={getParamValue(track, pLocks, 'osc2_pitch')} min={-36} max={36} step={1} onChange={v => onParamChange('osc2_pitch', v)} unit="st" isPLocked={isParamLocked(track, pLocks, 'osc2_pitch')} mapInfo={{ path: `tracks.${track.id}.params.osc2_pitch`, label: `${track.name} Osc2 Pitch` }} />
            <Knob label="FINE 2" value={getParamValue(track, pLocks, 'osc2_fine')} min={-100} max={100} step={1} onChange={v => onParamChange('osc2_fine', v)} unit="c" isPLocked={isParamLocked(track, pLocks, 'osc2_fine')} mapInfo={{ path: `tracks.${track.id}.params.osc2_fine`, label: `${track.name} Osc2 Fine` }} />
        </Section>
        <Section title="MODULATION" className="grid-cols-2 md:grid-cols-4">
            <Selector label="MODE" value={getParamValue(track, pLocks, 'mode')} options={[{value: 'pm', label: 'PM'}, {value: 'add', label: 'ADD'}, {value: 'ring', label: 'RING'}, {value: 'hard_sync', label: 'SYNC'}]} onChange={v => onParamChange('mode', v)} isPLocked={isParamLocked(track, pLocks, 'mode')} />
            <Knob label="MOD AMT" value={getParamValue(track, pLocks, 'mod_amount')} min={0} max={100} onChange={v => onParamChange('mod_amount', v)} isPLocked={isParamLocked(track, pLocks, 'mod_amount')} mapInfo={{ path: `tracks.${track.id}.params.mod_amount`, label: `${track.name} Mod Amount` }}/>
            <Knob label="FOLD" value={getParamValue(track, pLocks, 'fold')} min={0} max={100} onChange={v => onParamChange('fold', v)} isPLocked={isParamLocked(track, pLocks, 'fold')} mapInfo={{ path: `tracks.${track.id}.params.fold`, label: `${track.name} Fold` }}/>
            <Knob label="SPREAD" value={getParamValue(track, pLocks, 'spread')} min={0} max={100} onChange={v => onParamChange('spread', v)} isPLocked={isParamLocked(track, pLocks, 'spread')} mapInfo={{ path: `tracks.${track.id}.params.spread`, label: `${track.name} Spread` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const RuinEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'ruin.pitch', label: 'PITCH'}, {value: 'ruin.timbre', label: 'TIMBRE'},
        {value: 'ruin.drive', label: 'DRIVE'}, {value: 'ruin.fold', label: 'FOLD'}, {value: 'ruin.decay', label: 'DECAY'},
    ];
    return <>
        <Section title="ENGINE" className="grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={72} step={1} onChange={v => onParamChange('pitch', v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }}/>
            <Selector label="ALGORITHM" value={getParamValue(track, pLocks, 'algorithm')} options={[{value: 'feedback_pm', label: 'FB PM'}, {value: 'distort_fold', label: 'DIST'}, {value: 'overload', label: 'OVER'}]} onChange={v => onParamChange('algorithm', v)} isPLocked={isParamLocked(track, pLocks, 'algorithm')} />
            <Knob label="TIMBRE" value={getParamValue(track, pLocks, 'timbre')} min={0} max={100} onChange={v => onParamChange('timbre', v)} isPLocked={isParamLocked(track, pLocks, 'timbre')} mapInfo={{ path: `tracks.${track.id}.params.timbre`, label: `${track.name} Timbre` }}/>
            <Knob label="DRIVE" value={getParamValue(track, pLocks, 'drive')} min={0} max={100} onChange={v => onParamChange('drive', v)} isPLocked={isParamLocked(track, pLocks, 'drive')} mapInfo={{ path: `tracks.${track.id}.params.drive`, label: `${track.name} Drive` }}/>
            <Knob label="FOLD" value={getParamValue(track, pLocks, 'fold')} min={0} max={100} onChange={v => onParamChange('fold', v)} isPLocked={isParamLocked(track, pLocks, 'fold')} mapInfo={{ path: `tracks.${track.id}.params.fold`, label: `${track.name} Fold` }}/>
        </Section>
        <Section title="ENVELOPE" className="grid-cols-2">
             <Knob label="ATK" value={getParamValue(track, pLocks, 'attack')} min={0.001} max={2} step={0.001} onChange={v => onParamChange('attack', v)} isPLocked={isParamLocked(track, pLocks, 'attack')} mapInfo={{ path: `tracks.${track.id}.params.attack`, label: `${track.name} Attack` }}/>
             <Knob label="DEC" value={getParamValue(track, pLocks, 'decay')} min={0.01} max={4} step={0.01} onChange={v => onParamChange('decay', v)} isPLocked={isParamLocked(track, pLocks, 'decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }}/>
        </Section>
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const ArtificeEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'artifice.osc1_shape', label: 'OSC1 SHAPE'}, {value: 'artifice.osc2_shape', label: 'OSC2 SHAPE'},
        {value: 'artifice.osc2_pitch', label: 'OSC2 PITCH'}, {value: 'artifice.fm_amount', label: 'FM AMT'},
        {value: 'artifice.osc_mix', label: 'OSC MIX'}, {value: 'artifice.noise_level', label: 'NOISE'},
        {value: 'artifice.filter_cutoff', label: 'FILT CUTOFF'}, {value: 'artifice.filter_res', label: 'FILT RESO'},
        {value: 'artifice.filter_spread', label: 'FILT SPREAD'}, {value: 'artifice.filterEnvAmount', label: 'FILT ENV AMT'},
    ];
    return <>
        <Section title="OSCILLATORS" className="grid-cols-2 md:grid-cols-4">
            <Knob label="SHAPE 1" value={getParamValue(track, pLocks, 'osc1_shape')} min={0} max={100} onChange={v => onParamChange('osc1_shape', v)} isPLocked={isParamLocked(track, pLocks, 'osc1_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc1_shape`, label: `${track.name} Osc1 Shape` }} />
            <Knob label="SHAPE 2" value={getParamValue(track, pLocks, 'osc2_shape')} min={0} max={100} onChange={v => onParamChange('osc2_shape', v)} isPLocked={isParamLocked(track, pLocks, 'osc2_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc2_shape`, label: `${track.name} Osc2 Shape` }} />
            <Knob label="PITCH 2" value={getParamValue(track, pLocks, 'osc2_pitch')} min={-36} max={36} step={1} onChange={v => onParamChange('osc2_pitch', v)} unit="st" isPLocked={isParamLocked(track, pLocks, 'osc2_pitch')} mapInfo={{ path: `tracks.${track.id}.params.osc2_pitch`, label: `${track.name} Osc2 Pitch` }} />
            <Knob label="FINE 2" value={getParamValue(track, pLocks, 'osc2_fine')} min={-100} max={100} step={1} onChange={v => onParamChange('osc2_fine', v)} unit="c" isPLocked={isParamLocked(track, pLocks, 'osc2_fine')} mapInfo={{ path: `tracks.${track.id}.params.osc2_fine`, label: `${track.name} Osc2 Fine` }} />
        </Section>
        <Section title="MIXER" className="grid-cols-3">
             <Knob label="OSC MIX" value={getParamValue(track, pLocks, 'osc_mix')} min={-100} max={100} onChange={v => onParamChange('osc_mix', v)} isPLocked={isParamLocked(track, pLocks, 'osc_mix')} mapInfo={{ path: `tracks.${track.id}.params.osc_mix`, label: `${track.name} Osc Mix` }}/>
             <Knob label="FM AMT" value={getParamValue(track, pLocks, 'fm_amount')} min={0} max={100} onChange={v => onParamChange('fm_amount', v)} isPLocked={isParamLocked(track, pLocks, 'fm_amount')} mapInfo={{ path: `tracks.${track.id}.params.fm_amount`, label: `${track.name} FM Amount` }}/>
             <Knob label="NOISE" value={getParamValue(track, pLocks, 'noise_level')} min={0} max={100} onChange={v => onParamChange('noise_level', v)} isPLocked={isParamLocked(track, pLocks, 'noise_level')} mapInfo={{ path: `tracks.${track.id}.params.noise_level`, label: `${track.name} Noise` }}/>
        </Section>
        <Section title="DUAL FILTER" className="grid-cols-2 md:grid-cols-4">
            <Selector label="MODE" value={getParamValue(track, pLocks, 'filter_mode')} options={[{value: 'lp_hp_p', label: 'LP/HP PAR'}, {value: 'lp_hp_s', label: 'LP/HP SER'}, {value: 'bp_bp_p', label: 'BP/BP PAR'}]} onChange={v => onParamChange('filter_mode', v)} isPLocked={isParamLocked(track, pLocks, 'filter_mode')} />
            <Knob label="CUTOFF" value={getParamValue(track, pLocks, 'filter_cutoff')} min={20} max={20000} onChange={v => onParamChange('filter_cutoff', v)} isPLocked={isParamLocked(track, pLocks, 'filter_cutoff')} mapInfo={{ path: `tracks.${track.id}.params.filter_cutoff`, label: `${track.name} Filter Cutoff` }}/>
            <Knob label="RESO" value={getParamValue(track, pLocks, 'filter_res')} min={0.1} max={30} step={0.1} onChange={v => onParamChange('filter_res', v)} isPLocked={isParamLocked(track, pLocks, 'filter_res')} mapInfo={{ path: `tracks.${track.id}.params.filter_res`, label: `${track.name} Filter Reso` }}/>
            <Knob label="SPREAD" value={getParamValue(track, pLocks, 'filter_spread')} min={-48} max={48} step={1} onChange={v => onParamChange('filter_spread', v)} isPLocked={isParamLocked(track, pLocks, 'filter_spread')} mapInfo={{ path: `tracks.${track.id}.params.filter_spread`, label: `${track.name} Filter Spread` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <EnvelopeSection basePath="filterEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="FILTER ENVELOPE" extraControls={<Knob label="AMT" value={getParamValue(track, pLocks, 'filterEnvAmount')} min={-10000} max={10000} onChange={v => onParamChange('filterEnvAmount', v)} isPLocked={isParamLocked(track, pLocks, 'filterEnvAmount')} mapInfo={{ path: `tracks.${track.id}.params.filterEnvAmount`, label: `${track.name} Filter Env Amt` }}/>} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const ShiftEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'shift.pitch', label: 'PITCH'}, {value: 'shift.position', label: 'POSITION'},
        {value: 'shift.bend', label: 'BEND'}, {value: 'shift.twist', label: 'TWIST'},
    ];
    return <>
        <Section title="WAVETABLE" className="grid-cols-2 md:grid-cols-5">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={84} step={1} onChange={v => onParamChange('pitch', v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }}/>
            <Selector label="TABLE" value={getParamValue(track, pLocks, 'table')} options={[{value: 0, label: 'CLSC'}, {value: 1, label: 'SPCT'}, {value: 2, label: 'FRMT'}, {value: 3, label: 'MDRN'}]} onChange={v => onParamChange('table', v)} isPLocked={isParamLocked(track, pLocks, 'table')} />
            <Knob label="POSITION" value={getParamValue(track, pLocks, 'position')} min={0} max={100} onChange={v => onParamChange('position', v)} isPLocked={isParamLocked(track, pLocks, 'position')} mapInfo={{ path: `tracks.${track.id}.params.position`, label: `${track.name} Position` }}/>
            <Knob label="BEND" value={getParamValue(track, pLocks, 'bend')} min={0} max={100} onChange={v => onParamChange('bend', v)} isPLocked={isParamLocked(track, pLocks, 'bend')} mapInfo={{ path: `tracks.${track.id}.params.bend`, label: `${track.name} Bend` }}/>
            <Knob label="TWIST" value={getParamValue(track, pLocks, 'twist')} min={0} max={100} onChange={v => onParamChange('twist', v)} isPLocked={isParamLocked(track, pLocks, 'twist')} mapInfo={{ path: `tracks.${track.id}.params.twist`, label: `${track.name} Twist` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const ResonEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'reson.pitch', label: 'PITCH'}, {value: 'reson.structure', label: 'STRUCTURE'},
        {value: 'reson.brightness', label: 'BRIGHT'}, {value: 'reson.decay', label: 'DECAY'},
        {value: 'reson.material', label: 'MATERIAL'},
    ];
    return <>
        <Section title="RESONATOR" className="grid-cols-2 md:grid-cols-5">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={96} step={1} onChange={v => onParamChange('pitch', v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }}/>
            <Knob label="STRUCTURE" value={getParamValue(track, pLocks, 'structure')} min={0} max={100} onChange={v => onParamChange('structure', v)} isPLocked={isParamLocked(track, pLocks, 'structure')} mapInfo={{ path: `tracks.${track.id}.params.structure`, label: `${track.name} Structure` }}/>
            <Knob label="BRIGHT" value={getParamValue(track, pLocks, 'brightness')} min={100} max={18000} onChange={v => onParamChange('brightness', v)} isPLocked={isParamLocked(track, pLocks, 'brightness')} mapInfo={{ path: `tracks.${track.id}.params.brightness`, label: `${track.name} Brightness` }}/>
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.8} max={0.999} step={0.001} onChange={v => onParamChange('decay', v)} isPLocked={isParamLocked(track, pLocks, 'decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }}/>
            <Knob label="MATERIAL" value={getParamValue(track, pLocks, 'material')} min={0} max={100} onChange={v => onParamChange('material', v)} isPLocked={isParamLocked(track, pLocks, 'material')} mapInfo={{ path: `tracks.${track.id}.params.material`, label: `${track.name} Material` }}/>
        </Section>
        <Section title="EXCITER" className="grid-cols-2">
            <Selector label="TYPE" value={getParamValue(track, pLocks, 'exciter_type')} options={[{value: 'noise', label: 'NOISE'}, {value: 'impulse', label: 'IMPULSE'}]} onChange={v => onParamChange('exciter_type', v)} isPLocked={isParamLocked(track, pLocks, 'exciter_type')} />
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const AlloyEditor: React.FC<InstrumentEditorComponentsProps> = ({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'alloy.pitch', label: 'PITCH'}, {value: 'alloy.ratio', label: 'RATIO'}, {value: 'alloy.feedback', label: 'FEEDBACK'},
        {value: 'alloy.mod_level', label: 'MOD LVL'}, {value: 'alloy.mod_decay', label: 'MOD DECAY'},
    ];
    return <>
        <Section title="OPERATORS" className="grid-cols-2 md:grid-cols-4">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={96} step={1} onChange={v => onParamChange('pitch', v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }}/>
            <Knob label="RATIO" value={getParamValue(track, pLocks, 'ratio')} min={0.1} max={16} step={0.01} onChange={v => onParamChange('ratio', v)} isPLocked={isParamLocked(track, pLocks, 'ratio')} mapInfo={{ path: `tracks.${track.id}.params.ratio`, label: `${track.name} Ratio` }}/>
            <Knob label="FEEDBACK" value={getParamValue(track, pLocks, 'feedback')} min={0} max={100} onChange={v => onParamChange('feedback', v)} isPLocked={isParamLocked(track, pLocks, 'feedback')} mapInfo={{ path: `tracks.${track.id}.params.feedback`, label: `${track.name} Feedback` }}/>
            <Knob label="MOD LVL" value={getParamValue(track, pLocks, 'mod_level')} min={0} max={100} onChange={v => onParamChange('mod_level', v)} isPLocked={isParamLocked(track, pLocks, 'mod_level')} mapInfo={{ path: `tracks.${track.id}.params.mod_level`, label: `${track.name} Mod Level` }}/>
        </Section>
        <Section title="MOD ENVELOPE" className="grid-cols-2">
            <Knob label="ATK" value={getParamValue(track, pLocks, 'mod_attack')} min={0.001} max={2} step={0.001} onChange={v => onParamChange('mod_attack', v)} isPLocked={isParamLocked(track, pLocks, 'mod_attack')} mapInfo={{ path: `tracks.${track.id}.params.mod_attack`, label: `${track.name} Mod Atk` }}/>
            <Knob label="DEC" value={getParamValue(track, pLocks, 'mod_decay')} min={0.01} max={4} step={0.01} onChange={v => onParamChange('mod_decay', v)} isPLocked={isParamLocked(track, pLocks, 'mod_decay')} mapInfo={{ path: `tracks.${track.id}.params.mod_decay`, label: `${track.name} Mod Dec` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
};

const MidiEditor: React.FC<{
    track: Track;
    pLocks: PLocks | null;
    onMidiOutParamChange: (key: keyof MidiOutParams, value: any) => void;
}> = ({ track, pLocks, onMidiOutParamChange }) => {
    const { midiOutputs } = useStore(state => ({
        midiOutputs: state.midiOutputs,
    }), shallow);

    const outputOptions = [{ value: 'none', label: 'NONE' }, ...midiOutputs.map(o => ({ value: o.id, label: o.name || o.id }))];
    
    return (
        <Section title="MIDI OUTPUT" className="grid-cols-2">
            <Selector 
                label="DEVICE"
                value={getMidiOutParamValue(track, pLocks, 'deviceId') || 'none'}
                options={outputOptions}
                onChange={v => onMidiOutParamChange('deviceId', v === 'none' ? null : v)}
                isPLocked={isMidiOutParamLocked(pLocks, 'deviceId')}
            />
            <Knob 
                label="CHANNEL"
                value={getMidiOutParamValue(track, pLocks, 'channel')}
                min={1} max={16} step={1}
                onChange={v => onMidiOutParamChange('channel', v)}
                isPLocked={isMidiOutParamLocked(pLocks, 'channel')}
                mapInfo={{ path: `tracks.${track.id}.params.channel`, label: `${track.name} MIDI Chan` }}
            />
        </Section>
    );
};

const MidiInfoPanel: React.FC = () => (
    <div className="px-2 pt-4 h-full flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-[var(--bg-panel-dark)] border border-[var(--border-color)]/50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-cyan-400/50 mb-3">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2v0Z" />
                <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12v0Z"/>
                <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4v0Z" />
            </svg>
            <h4 className="font-bold text-cyan-400">MIDI CC AUTOMATION</h4>
            <p className="text-xs text-neutral-400 mt-2">
                Enable <span className="font-bold text-white">P-LOCK</span> mode and select a step in the sequencer to add or edit MIDI Control Change messages.
            </p>
        </div>
    </div>
);

const MidiCcEditor: React.FC = () => {
    const { track, pLocks, addMidiCcLock, updateMidiCcLock, removeMidiCcLock } = useStore(state => {
         const pLockTrack = state.selectedPLockStep ? state.preset?.tracks?.find(t => t.id === state.selectedPLockStep!.trackId) : null;
         const pLockStepState = pLockTrack ? pLockTrack.patterns[pLockTrack.activePatternIndex][state.selectedPLockStep!.stepIndex] : null;
        return {
            track: pLockTrack,
            pLocks: pLockStepState?.pLocks || null,
            addMidiCcLock: state.addMidiCcLock,
            updateMidiCcLock: state.updateMidiCcLock,
            removeMidiCcLock: state.removeMidiCcLock,
        }
    }, shallow);
    
    if (!track || track.type !== 'midi') return null;

    const ccLocks = pLocks?.ccLocks || [];
    
    return (
         <div className="px-2 pt-4 h-full flex flex-col">
            <div className="bg-[var(--bg-panel-dark)] rounded-md border border-[var(--border-color)]/50 p-2 flex-grow flex flex-col">
                <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-3 text-center">MIDI CC P-LOCKS</h3>
                <div className="flex-grow space-y-2 overflow-y-auto no-scrollbar pr-1">
                    {ccLocks.map((lock) => (
                        <div key={lock.id} className="flex items-center gap-2 bg-black/20 p-1 rounded">
                             <input
                                type="number"
                                value={lock.cc}
                                min="0" max="127"
                                onChange={(e) => updateMidiCcLock(lock.id, parseInt(e.target.value))}
                                className="w-16 bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-1 text-center"
                                title="CC Number"
                            />
                            <Knob
                                label={`CC ${lock.cc}`}
                                value={lock.value}
                                min={0} max={127} step={1}
                                onChange={(v) => updateMidiCcLock(lock.id, undefined, v)}
                                size={36}
                                className="flex-grow"
                            />
                            <button onClick={() => removeMidiCcLock(lock.id)} className="w-6 h-6 flex-shrink-0 bg-red-800/80 text-white rounded text-xs hover:bg-red-700">X</button>
                        </div>
                    ))}
                </div>
                <button onClick={addMidiCcLock} className="mt-2 w-full py-2 text-xs font-bold bg-cyan-800/80 hover:bg-cyan-700 rounded border border-cyan-700 text-white">
                    + ADD CC
                </button>
            </div>
        </div>
    );
}

const InstrumentEditor: React.FC = () => {
    const {
        track, pLocks, onParamChange, onVolumeChange,
        onPanChange, onFxSendChange, instrumentPresets, onSaveInstrumentPreset,
        onLoadInstrumentPreset, onDeleteInstrumentPreset, onRandomizeInstrument,
        onImportInstrumentPresets, onExportInstrumentPresets, onMidiOutParamChange, isSpectator, triggerViewerModeInteraction,
        isPLockModeActive, selectedPLockStep, isViewerMode,
    } = useStore(state => {
        const selectedTrack = state.preset?.tracks?.find(t => t.id === state.selectedTrackId);
        const pLockTrack = state.selectedPLockStep ? state.preset?.tracks?.find(t => t.id === state.selectedPLockStep!.trackId) : null;
        const pLockStepState = pLockTrack ? pLockTrack.patterns[pLockTrack.activePatternIndex][state.selectedPLockStep!.stepIndex] : null;
        
        return {
            track: selectedTrack || null,
            pLocks: pLockStepState?.pLocks || null,
            onParamChange: state.setParam,
            onVolumeChange: state.setTrackVolume,
            onPanChange: state.setTrackPan,
            onFxSendChange: state.setFxSend,
            instrumentPresets: state.instrumentPresets,
            onSaveInstrumentPreset: state.saveInstrumentPreset,
            onLoadInstrumentPreset: state.loadInstrumentPreset,
            onDeleteInstrumentPreset: state.deleteInstrumentPreset,
            onRandomizeInstrument: state.randomizeInstrument,
            onImportInstrumentPresets: state.importInstrumentPresets,
            onExportInstrumentPresets: state.exportInstrumentPresets,
            onMidiOutParamChange: state.setMidiOutParam,
            isSpectator: state.isSpectator,
            isViewerMode: state.isViewerMode,
            triggerViewerModeInteraction: state.triggerViewerModeInteraction,
            isPLockModeActive: state.isPLockModeActive,
            selectedPLockStep: state.selectedPLockStep,
        };
    }, shallow);

    if (!track) {
        return (
            <div className="h-full flex flex-col bg-[var(--bg-chassis)]" data-tour-id="instrument-editor">
                <div className="bg-[var(--bg-panel-dark)] p-2 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
                    <h2 className="text-sm font-bold text-[var(--text-light)] uppercase tracking-widest">NO TRACK</h2>
                </div>
                <div className="flex-grow flex items-center justify-center text-neutral-500">
                    Select a track to begin editing.
                </div>
            </div>
        );
    }
    
    // Wrap all knobs to disable them in spectator mode or viewer mode for locked tracks
    const renderKnobs = (children: React.ReactNode) => {
        const isDisabled = isSpectator || (isViewerMode && track.id >= 3);
        return React.Children.map(children, (child) => {
            if (React.isValidElement(child) && (child.type === Knob || child.type === Selector)) {
                return React.cloneElement(child, { 
                    ...child.props, 
                    disabled: isDisabled,
                    onDisabledClick: triggerViewerModeInteraction,
                } as any);
            }
            if (React.isValidElement(child) && child.props.children) {
                return React.cloneElement(child, {
                    ...child.props,
                    children: renderKnobs(child.props.children)
                });
            }
            return child;
        });
    };
    
    const renderEditor = () => {
        const editorProps = { track, pLocks, onParamChange };
        let specificEditor;
        switch (track.type) {
            case 'kick': specificEditor = <KickEditor {...editorProps} />; break;
            case 'hat': specificEditor = <HatEditor {...editorProps} />; break;
            case 'arcane': specificEditor = <ArcaneEditor {...editorProps} />; break;
            case 'ruin': specificEditor = <RuinEditor {...editorProps} />; break;
            case 'artifice': specificEditor = <ArtificeEditor {...editorProps} />; break;
            case 'shift': specificEditor = <ShiftEditor {...editorProps} />; break;
            case 'reson': specificEditor = <ResonEditor {...editorProps} />; break;
            case 'alloy': specificEditor = <AlloyEditor {...editorProps} />; break;
            case 'midi': specificEditor = <MidiEditor track={track} pLocks={pLocks} onMidiOutParamChange={onMidiOutParamChange} />; break;
            default:
                return <div>Editor not available for track type: {track.type}</div>;
        }
        return (
            <>
                {renderKnobs(specificEditor)}
                {renderKnobs(
                    <OutputSection 
                        track={track}
                        pLocks={pLocks}
                        onVolumeChange={onVolumeChange}
                        onPanChange={onPanChange}
                        onFxSendChange={onFxSendChange}
                    />
                )}
            </>
        )
    };
    
    const isMidiPSteplocked = isPLockModeActive && selectedPLockStep && selectedPLockStep.trackId === track.id;

    return (
        <div className="h-full flex flex-col bg-[var(--bg-chassis)]" data-tour-id="instrument-editor">
            <EditorHeader trackName={track.name} trackId={track.id} />
            <TrackSelector layout="horizontal" />
            <InstrumentPresetManager 
              trackType={track.type}
              presets={instrumentPresets}
              onSave={onSaveInstrumentPreset}
              onLoad={onLoadInstrumentPreset}
              onDelete={onDeleteInstrumentPreset}
              onRandomize={() => onRandomizeInstrument(track.id)}
              loadedPresetName={track.loadedInstrumentPresetName}
              onImportInstrumentPresets={onImportInstrumentPresets}
              onExportInstrumentPresets={onExportInstrumentPresets}
            />
            <div className="flex-grow overflow-y-auto no-scrollbar pt-2 min-h-0 flex flex-col">
                {renderEditor()}
                {track.type === 'midi' && (
                    isMidiPSteplocked ? <MidiCcEditor /> : <MidiInfoPanel />
                )}
            </div>
        </div>
    );
};

export default React.memo(InstrumentEditor);
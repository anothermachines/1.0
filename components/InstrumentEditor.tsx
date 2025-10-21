import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { Track, PLocks, LFODestination, LFOParams, FilterParams, Envelope, FXSends, ArcaneParams, RuinParams, ArtificeParams, ShiftParams, ResonParams, AlloyParams, MidiOutParams } from '../types';
import Knob from './Knob';
import InstrumentPresetManager from './InstrumentPresetManager';
import { TIME_DIVISIONS } from '../constants';
// FIX: Import 'midiToNoteName' to resolve 'Cannot find name' errors.
import { getParamValue, isParamLocked, getTrackValue, getSendValue, isTrackValueLocked, isSendLocked, getMidiOutParamValue, isMidiOutParamLocked, getInitialParamsForType, midiToNoteName } from '../utils';
import Selector from './Selector';
import TrackSelector from './TrackSelector';
import { shallow } from 'zustand/shallow';

const Section: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className = 'grid-cols-2 md:grid-cols-4' }) => (
  <div className="px-2 pb-3">
    <div className="bg-[var(--bg-panel-dark)] rounded-md border border-[var(--border-color)] p-2">
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
        addNotification, renameTrack, isViewerMode 
    } = useStore(state => ({
        addNotification: state.addNotification,
        renameTrack: state.renameTrack,
        isViewerMode: state.isViewerMode,
    }), shallow);
    
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

    const handleRecClick = () => {
        addNotification({ type: 'info', message: 'Automation recording coming soon!' });
    };
    
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
            <div className="relative">
                <button
                    onClick={handleRecClick}
                    className={`px-3 py-1 text-xs font-bold rounded-sm border transition-all text-white w-32 bg-neutral-600 hover:bg-neutral-500 border-neutral-500`}
                >
                    REC AUTOM
                </button>
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
}> = React.memo(({ track, pLocks, onVolumeChange, onPanChange, onFxSendChange }) => {
    const isMidiTrack = track.type === 'midi';

    const handleVolumeChange = useCallback((v: number) => onVolumeChange(track.id, v), [track.id, onVolumeChange]);
    const handlePanChange = useCallback((v: number) => onPanChange(track.id, v), [track.id, onPanChange]);
    const handleReverbChange = useCallback((v: number) => onFxSendChange(track.id, 'reverb', v), [track.id, onFxSendChange]);
    const handleDelayChange = useCallback((v: number) => onFxSendChange(track.id, 'delay', v), [track.id, onFxSendChange]);
    const handleDriveChange = useCallback((v: number) => onFxSendChange(track.id, 'drive', v), [track.id, onFxSendChange]);
    const handleSidechainChange = useCallback((v: number) => onFxSendChange(track.id, 'sidechain', v), [track.id, onFxSendChange]);

    return (
        <Section title="OUTPUT" className="grid-cols-3 md:grid-cols-6">
            <Knob 
                label="VOL" 
                value={getTrackValue(track, pLocks, 'volume')} 
                min={0} max={1.5} step={0.01}
                onChange={handleVolumeChange} 
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
                onChange={handlePanChange} 
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
                onChange={handleReverbChange} 
                isPLocked={isSendLocked(pLocks, 'reverb')} 
                isAutomated={isAutomated(track, 'fxSends.reverb')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.reverb`, label: `${track.name} Reverb` }}
            />
            <Knob 
                label="DELAY" 
                value={getSendValue(track, pLocks, 'delay')} 
                min={0} max={1} step={0.01}
                onChange={handleDelayChange} 
                isPLocked={isSendLocked(pLocks, 'delay')} 
                isAutomated={isAutomated(track, 'fxSends.delay')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.delay`, label: `${track.name} Delay` }}
            />
            <Knob 
                label="DRIVE" 
                value={getSendValue(track, pLocks, 'drive')} 
                min={0} max={1} step={0.01}
                onChange={handleDriveChange} 
                isPLocked={isSendLocked(pLocks, 'drive')} 
                isAutomated={isAutomated(track, 'fxSends.drive')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.drive`, label: `${track.name} Drive` }}
            />
            <Knob 
                label="S.CHAIN" 
                value={getSendValue(track, pLocks, 'sidechain')} 
                min={0} max={1} step={0.01}
                onChange={handleSidechainChange} 
                isPLocked={isSendLocked(pLocks, 'sidechain')} 
                isAutomated={isAutomated(track, 'fxSends.sidechain')} 
                disabled={isMidiTrack}
                mapInfo={{ path: `tracks.${track.id}.fxSends.sidechain`, label: `${track.name} Sidechain` }}
            />
        </Section>
    );
});

const EnvelopeSection: React.FC<{
    title: string;
    basePath: 'ampEnv' | 'filterEnv';
    track: Track;
    pLocks: PLocks | null;
    onParamChange: (path: string, value: any) => void;
    extraControls?: React.ReactNode;
}> = React.memo(({ title, basePath, track, pLocks, onParamChange, extraControls }) => {
    const handleAttackChange = useCallback((v: number) => onParamChange(`${basePath}.attack`, v), [basePath, onParamChange]);
    const handleDecayChange = useCallback((v: number) => onParamChange(`${basePath}.decay`, v), [basePath, onParamChange]);
    const handleSustainChange = useCallback((v: number) => onParamChange(`${basePath}.sustain`, v), [basePath, onParamChange]);
    const handleReleaseChange = useCallback((v: number) => onParamChange(`${basePath}.release`, v), [basePath, onParamChange]);

    return (
        <Section title={title} className={extraControls ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}>
            <Knob label="ATK" value={getParamValue(track, pLocks, `${basePath}.attack`)} min={0.001} max={4} step={0.001} onChange={handleAttackChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.attack`)} isAutomated={isAutomated(track, `params.${basePath}.attack`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.attack`, label: `${track.name} ${basePath} Atk` }}/>
            <Knob label="DEC" value={getParamValue(track, pLocks, `${basePath}.decay`)} min={0.01} max={4} step={0.01} onChange={handleDecayChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.decay`)} isAutomated={isAutomated(track, `params.${basePath}.decay`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.decay`, label: `${track.name} ${basePath} Dec` }}/>
            <Knob label="SUS" value={getParamValue(track, pLocks, `${basePath}.sustain`)} min={0} max={1} step={0.01} onChange={handleSustainChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.sustain`)} isAutomated={isAutomated(track, `params.${basePath}.sustain`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.sustain`, label: `${track.name} ${basePath} Sus` }}/>
            <Knob label="REL" value={getParamValue(track, pLocks, `${basePath}.release`)} min={0.01} max={4} step={0.01} onChange={handleReleaseChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.release`)} isAutomated={isAutomated(track, `params.${basePath}.release`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.release`, label: `${track.name} ${basePath} Rel` }}/>
            {extraControls}
        </Section>
    );
});

const FilterSection: React.FC<{
  basePath: 'filter';
  track: Track;
  pLocks: PLocks | null;
  onParamChange: (path: string, value: any) => void;
}> = React.memo(({ basePath, track, pLocks, onParamChange }) => {
    const handleTypeChange = useCallback((v: any) => onParamChange(`${basePath}.type`, v), [basePath, onParamChange]);
    const handleCutoffChange = useCallback((v: number) => onParamChange(`${basePath}.cutoff`, v), [basePath, onParamChange]);
    const handleResoChange = useCallback((v: number) => onParamChange(`${basePath}.resonance`, v), [basePath, onParamChange]);

    return (
        <Section title="FILTER" className="grid-cols-3">
            <Selector label="TYPE" value={getParamValue(track, pLocks, `${basePath}.type`)} options={FILTER_TYPE_OPTIONS} onChange={handleTypeChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.type`)} />
            <Knob label="CUTOFF" value={getParamValue(track, pLocks, `${basePath}.cutoff`)} min={20} max={20000} onChange={handleCutoffChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.cutoff`)} isAutomated={isAutomated(track, `params.${basePath}.cutoff`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.cutoff`, label: `${track.name} Cutoff` }}/>
            <Knob label="RESO" value={getParamValue(track, pLocks, `${basePath}.resonance`)} min={0.1} max={30} step={0.1} onChange={handleResoChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.resonance`)} isAutomated={isAutomated(track, `params.${basePath}.resonance`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.resonance`, label: `${track.name} Reso` }}/>
        </Section>
    );
});

const LFOSection: React.FC<{
  title: string;
  basePath: 'lfo1' | 'lfo2';
  track: Track;
  pLocks: PLocks | null;
  onParamChange: (path: string, value: any) => void;
  destinations: {value: LFODestination, label: string}[];
}> = React.memo(({ title, basePath, track, pLocks, onParamChange, destinations }) => {
    const isSync = getParamValue(track, pLocks, `${basePath}.rateSync`);

    const handleWaveChange = useCallback((v: any) => onParamChange(`${basePath}.waveform`, v), [basePath, onParamChange]);
    const handleDepthChange = useCallback((v: number) => onParamChange(`${basePath}.depth`, v), [basePath, onParamChange]);
    const handleRateDivChange = useCallback((v: any) => onParamChange(`${basePath}.rateDivision`, Number(v)), [basePath, onParamChange]);
    const handleRateChange = useCallback((v: number) => onParamChange(`${basePath}.rate`, v), [basePath, onParamChange]);
    const handleRateSyncChange = useCallback(() => onParamChange(`${basePath}.rateSync`, !isSync), [basePath, onParamChange, isSync]);
    const handleRetriggerChange = useCallback(() => onParamChange(`${basePath}.retrigger`, !getParamValue(track, pLocks, `${basePath}.retrigger`)), [basePath, onParamChange, track, pLocks]);
    const handleDestChange = useCallback((v: any) => onParamChange(`${basePath}.destination`, v), [basePath, onParamChange]);

    return (
        <Section title={title} className="grid-cols-2 md:grid-cols-4">
            <Selector label="WAVE" value={getParamValue(track, pLocks, `${basePath}.waveform`)} options={LFO_WAVEFORM_OPTIONS} onChange={handleWaveChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.waveform`)} />
            <Knob label="DEPTH" value={getParamValue(track, pLocks, `${basePath}.depth`)} min={0} max={1000} onChange={handleDepthChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.depth`)} isAutomated={isAutomated(track, `params.${basePath}.depth`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.depth`, label: `${track.name} ${basePath} Depth` }}/>
            {isSync ? (
                <Selector label="RATE DIV" value={String(getParamValue(track, pLocks, `${basePath}.rateDivision`))} options={TIME_DIVISIONS.map(d => ({value: String(d.value), label: d.name}))} onChange={handleRateDivChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.rateDivision`)} />
            ) : (
                <Knob label="RATE" value={getParamValue(track, pLocks, `${basePath}.rate`)} min={0.01} max={50} step={0.01} onChange={handleRateChange} unit="hz" isPLocked={isParamLocked(track, pLocks, `${basePath}.rate`)} isAutomated={isAutomated(track, `params.${basePath}.rate`)} mapInfo={{ path: `tracks.${track.id}.params.${basePath}.rate`, label: `${track.name} ${basePath} Rate` }}/>
            )}
            <div className="flex flex-col items-center space-y-1">
                 <button onClick={handleRateSyncChange} className={`w-full text-center text-[11px] font-mono font-bold text-[var(--text-screen)] bg-[var(--bg-control)] px-2 py-1 rounded-sm border ${isSync ? 'border-[var(--accent-color)]' : 'border-[var(--border-color)]/50'}`}>SYNC</button>
                 <button onClick={handleRetriggerChange} className={`w-full text-center text-[11px] font-mono font-bold text-[var(--text-screen)] bg-[var(--bg-control)] px-2 py-1 rounded-sm border ${getParamValue(track, pLocks, `${basePath}.retrigger`) ? 'border-[var(--accent-color)]' : 'border-[var(--border-color)]/50'}`}>RETRIG</button>
            </div>
             <div className="col-span-full">
                <Selector label="DEST" value={getParamValue(track, pLocks, `${basePath}.destination`)} options={destinations} onChange={handleDestChange} isPLocked={isParamLocked(track, pLocks, `${basePath}.destination`)} />
             </div>
        </Section>
    );
});

interface InstrumentEditorComponentsProps {
  track: Track;
  pLocks: PLocks | null;
  onParamChange: (path: string, value: any) => void;
}

const KickEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS, {value: 'kick.tune', label: 'TUNE'}, {value: 'kick.impact', label: 'IMPACT'}, {value: 'kick.tone', label: 'TONE'}, {value: 'kick.character', label: 'CHAR'} ];
    
    const handleTuneChange = useCallback((v: number) => onParamChange('tune', v), [onParamChange]);
    const handleDecayChange = useCallback((v: number) => onParamChange('decay', v), [onParamChange]);
    const handleImpactChange = useCallback((v: number) => onParamChange('impact', v), [onParamChange]);
    const handleToneChange = useCallback((v: number) => onParamChange('tone', v), [onParamChange]);
    const handleCharChange = useCallback((v: number) => onParamChange('character', v), [onParamChange]);

    return <>
        <Section title="TONE" className="grid-cols-2 md:grid-cols-5">
            <Knob label="TUNE" value={getParamValue(track, pLocks, 'tune')} min={20} max={100} onChange={handleTuneChange} isPLocked={isParamLocked(track, pLocks, 'tune')} isAutomated={isAutomated(track, 'params.tune')} mapInfo={{ path: `tracks.${track.id}.params.tune`, label: `${track.name} Tune` }} />
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.1} max={2} step={0.01} onChange={handleDecayChange} isPLocked={isParamLocked(track, pLocks, 'decay')} isAutomated={isAutomated(track, 'params.decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }}/>
            <Knob label="IMPACT" value={getParamValue(track, pLocks, 'impact')} min={0} max={100} onChange={handleImpactChange} isPLocked={isParamLocked(track, pLocks, 'impact')} isAutomated={isAutomated(track, 'params.impact')} mapInfo={{ path: `tracks.${track.id}.params.impact`, label: `${track.name} Impact` }}/>
            <Knob label="TONE" value={getParamValue(track, pLocks, 'tone')} min={0} max={100} onChange={handleToneChange} isPLocked={isParamLocked(track, pLocks, 'tone')} isAutomated={isAutomated(track, 'params.tone')} mapInfo={{ path: `tracks.${track.id}.params.tone`, label: `${track.name} Tone` }}/>
            <Knob label="CHAR" value={getParamValue(track, pLocks, 'character')} min={0} max={100} onChange={handleCharChange} isPLocked={isParamLocked(track, pLocks, 'character')} isAutomated={isAutomated(track, 'params.character')} mapInfo={{ path: `tracks.${track.id}.params.character`, label: `${track.name} Character` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const HatEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS, {value: 'hat.tone', label: 'TONE'}, {value: 'hat.character', label: 'CHAR'}, {value: 'hat.spread', label: 'SPREAD'} ];
    
    const handleToneChange = useCallback((v: number) => onParamChange('tone', v), [onParamChange]);
    const handleDecayChange = useCallback((v: number) => onParamChange('decay', v), [onParamChange]);
    const handleCharChange = useCallback((v: number) => onParamChange('character', v), [onParamChange]);
    const handleSpreadChange = useCallback((v: number) => onParamChange('spread', v), [onParamChange]);
    
    return <>
        <Section title="TONE" className="grid-cols-2 md:grid-cols-4">
            <Knob label="TONE" value={getParamValue(track, pLocks, 'tone')} min={2000} max={15000} onChange={handleToneChange} isPLocked={isParamLocked(track, pLocks, 'tone')} isAutomated={isAutomated(track, 'params.tone')} mapInfo={{ path: `tracks.${track.id}.params.tone`, label: `${track.name} Tone` }}/>
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.01} max={1} step={0.01} onChange={handleDecayChange} isPLocked={isParamLocked(track, pLocks, 'decay')} isAutomated={isAutomated(track, 'params.decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }}/>
            <Knob label="CHAR" value={getParamValue(track, pLocks, 'character')} min={0} max={100} onChange={handleCharChange} isPLocked={isParamLocked(track, pLocks, 'character')} isAutomated={isAutomated(track, 'params.character')} mapInfo={{ path: `tracks.${track.id}.params.character`, label: `${track.name} Character` }}/>
            <Knob label="SPREAD" value={getParamValue(track, pLocks, 'spread')} min={1} max={4} step={0.01} onChange={handleSpreadChange} isPLocked={isParamLocked(track, pLocks, 'spread')} isAutomated={isAutomated(track, 'params.spread')} mapInfo={{ path: `tracks.${track.id}.params.spread`, label: `${track.name} Spread` }}/>
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

// --- NEW ENGINE EDITORS ---
const ArcaneEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const params = track.params as ArcaneParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'arcane.osc1_shape', label: 'OSC1 SHAPE'}, {value: 'arcane.osc2_shape', label: 'OSC2 SHAPE'},
        {value: 'arcane.osc2_pitch', label: 'OSC2 PITCH'}, {value: 'arcane.mod_amount', label: 'MOD AMT'},
        {value: 'arcane.fold', label: 'FOLD'}, {value: 'arcane.spread', label: 'SPREAD'},
    ];

    const createHandler = (path: string) => useCallback((v: any) => onParamChange(path, v), [path, onParamChange]);
    
    return <>
        <Section title="OSCILLATORS" className="grid-cols-2 md:grid-cols-4">
            <Knob label="SHAPE 1" value={getParamValue(track, pLocks, 'osc1_shape')} min={0} max={100} onChange={createHandler('osc1_shape')} isPLocked={isParamLocked(track, pLocks, 'osc1_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc1_shape`, label: `${track.name} Osc1 Shape` }} />
            <Knob label="SHAPE 2" value={getParamValue(track, pLocks, 'osc2_shape')} min={0} max={100} onChange={createHandler('osc2_shape')} isPLocked={isParamLocked(track, pLocks, 'osc2_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc2_shape`, label: `${track.name} Osc2 Shape` }} />
            <Knob label="PITCH 2" value={getParamValue(track, pLocks, 'osc2_pitch')} min={-36} max={36} step={1} onChange={createHandler('osc2_pitch')} unit="st" isPLocked={isParamLocked(track, pLocks, 'osc2_pitch')} mapInfo={{ path: `tracks.${track.id}.params.osc2_pitch`, label: `${track.name} Osc2 Pitch` }} />
            <Knob label="FINE 2" value={getParamValue(track, pLocks, 'osc2_fine')} min={-100} max={100} step={1} onChange={createHandler('osc2_fine')} unit="c" isPLocked={isParamLocked(track, pLocks, 'osc2_fine')} mapInfo={{ path: `tracks.${track.id}.params.osc2_fine`, label: `${track.name} Osc2 Fine` }} />
        </Section>
        <Section title="MODULATION & FOLDING" className="grid-cols-2 md:grid-cols-4">
             <Selector label="MODE" value={params.mode} options={[{value: 'pm', label: 'PM'}, {value: 'add', label: 'ADD'}, {value: 'ring', label: 'RING'}, {value: 'hard_sync', label: 'SYNC'}]} onChange={createHandler('mode')} isPLocked={isParamLocked(track, pLocks, 'mode')} />
            <Knob label="MOD AMT" value={getParamValue(track, pLocks, 'mod_amount')} min={0} max={100} onChange={createHandler('mod_amount')} isPLocked={isParamLocked(track, pLocks, 'mod_amount')} mapInfo={{ path: `tracks.${track.id}.params.mod_amount`, label: `${track.name} Mod Amount` }} />
            <Knob label="FOLD" value={getParamValue(track, pLocks, 'fold')} min={0} max={100} onChange={createHandler('fold')} isPLocked={isParamLocked(track, pLocks, 'fold')} mapInfo={{ path: `tracks.${track.id}.params.fold`, label: `${track.name} Fold` }} />
            <Knob label="SPREAD" value={getParamValue(track, pLocks, 'spread')} min={0} max={100} onChange={createHandler('spread')} unit="c" isPLocked={isParamLocked(track, pLocks, 'spread')} mapInfo={{ path: `tracks.${track.id}.params.spread`, label: `${track.name} Spread` }} />
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const RuinEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const params = track.params as RuinParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'ruin.pitch', label: 'PITCH'}, {value: 'ruin.timbre', label: 'TIMBRE'},
        {value: 'ruin.drive', label: 'DRIVE'}, {value: 'ruin.fold', label: 'FOLD'},
        {value: 'ruin.decay', label: 'DECAY'},
    ];
    const createHandler = (path: string) => useCallback((v: any) => onParamChange(path, v), [path, onParamChange]);
    
    return <>
        <Section title="CORE" className="grid-cols-2 md:grid-cols-3">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={72} step={1} onChange={createHandler('pitch')} displayTransform={v => midiToNoteName(v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }} />
            <Knob label="ATK" value={getParamValue(track, pLocks, 'attack')} min={0.001} max={1} step={0.001} onChange={createHandler('attack')} isPLocked={isParamLocked(track, pLocks, 'attack')} mapInfo={{ path: `tracks.${track.id}.params.attack`, label: `${track.name} Attack` }} />
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.01} max={4} step={0.01} onChange={createHandler('decay')} isPLocked={isParamLocked(track, pLocks, 'decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }} />
        </Section>
        <Section title="DESTRUCTION" className="grid-cols-2 md:grid-cols-4">
             <Selector label="ALGORITHM" value={params.algorithm} options={[{value: 'feedback_pm', label: 'FB PM'}, {value: 'distort_fold', label: 'D>FOLD'}, {value: 'overload', label: 'OVR'}]} onChange={createHandler('algorithm')} isPLocked={isParamLocked(track, pLocks, 'algorithm')} />
            <Knob label="TIMBRE" value={getParamValue(track, pLocks, 'timbre')} min={0} max={100} onChange={createHandler('timbre')} isPLocked={isParamLocked(track, pLocks, 'timbre')} mapInfo={{ path: `tracks.${track.id}.params.timbre`, label: `${track.name} Timbre` }} />
            <Knob label="DRIVE" value={getParamValue(track, pLocks, 'drive')} min={0} max={100} onChange={createHandler('drive')} isPLocked={isParamLocked(track, pLocks, 'drive')} mapInfo={{ path: `tracks.${track.id}.params.drive`, label: `${track.name} Drive` }} />
            <Knob label="FOLD" value={getParamValue(track, pLocks, 'fold')} min={0} max={100} onChange={createHandler('fold')} isPLocked={isParamLocked(track, pLocks, 'fold')} mapInfo={{ path: `tracks.${track.id}.params.fold`, label: `${track.name} Fold` }} />
        </Section>
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const ArtificeEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const params = track.params as ArtificeParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'artifice.osc1_shape', label: 'OSC1 SHAPE'}, {value: 'artifice.osc2_shape', label: 'OSC2 SHAPE'},
        {value: 'artifice.osc2_pitch', label: 'OSC2 PITCH'}, {value: 'artifice.fm_amount', label: 'FM AMT'},
        {value: 'artifice.osc_mix', label: 'OSC MIX'}, {value: 'artifice.noise_level', label: 'NOISE LVL'},
        {value: 'artifice.filter_cutoff', label: 'FILT CUT'}, {value: 'artifice.filter_res', label: 'FILT RES'},
        {value: 'artifice.filter_spread', label: 'FILT SPREAD'}, {value: 'artifice.filterEnvAmount', label: 'FILT ENV AMT'},
    ];
    const createHandler = (path: string) => useCallback((v: any) => onParamChange(path, v), [path, onParamChange]);
    
    return <>
        <Section title="OSCILLATORS" className="grid-cols-2 md:grid-cols-5">
            <Knob label="SHAPE 1" value={getParamValue(track, pLocks, 'osc1_shape')} min={0} max={100} onChange={createHandler('osc1_shape')} isPLocked={isParamLocked(track, pLocks, 'osc1_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc1_shape`, label: `${track.name} Osc1 Shape` }} />
            <Knob label="SHAPE 2" value={getParamValue(track, pLocks, 'osc2_shape')} min={0} max={100} onChange={createHandler('osc2_shape')} isPLocked={isParamLocked(track, pLocks, 'osc2_shape')} mapInfo={{ path: `tracks.${track.id}.params.osc2_shape`, label: `${track.name} Osc2 Shape` }} />
            <Knob label="PITCH 2" value={getParamValue(track, pLocks, 'osc2_pitch')} min={-36} max={36} step={1} onChange={createHandler('osc2_pitch')} unit="st" isPLocked={isParamLocked(track, pLocks, 'osc2_pitch')} mapInfo={{ path: `tracks.${track.id}.params.osc2_pitch`, label: `${track.name} Osc2 Pitch` }} />
            <Knob label="FINE 2" value={getParamValue(track, pLocks, 'osc2_fine')} min={-100} max={100} step={1} onChange={createHandler('osc2_fine')} unit="c" isPLocked={isParamLocked(track, pLocks, 'osc2_fine')} mapInfo={{ path: `tracks.${track.id}.params.osc2_fine`, label: `${track.name} Osc2 Fine` }} />
            <Knob label="FM AMT" value={getParamValue(track, pLocks, 'fm_amount')} min={0} max={100} onChange={createHandler('fm_amount')} isPLocked={isParamLocked(track, pLocks, 'fm_amount')} mapInfo={{ path: `tracks.${track.id}.params.fm_amount`, label: `${track.name} FM Amount` }} />
        </Section>
        <Section title="MIXER" className="grid-cols-2">
            <Knob label="OSC MIX" value={getParamValue(track, pLocks, 'osc_mix')} min={-100} max={100} onChange={createHandler('osc_mix')} displayTransform={v=> v < 0 ? `O1 ${Math.abs(v)}%` : v > 0 ? `O2 ${v}%` : '50/50'} isPLocked={isParamLocked(track, pLocks, 'osc_mix')} mapInfo={{ path: `tracks.${track.id}.params.osc_mix`, label: `${track.name} Osc Mix` }} />
            <Knob label="NOISE" value={getParamValue(track, pLocks, 'noise_level')} min={0} max={100} onChange={createHandler('noise_level')} isPLocked={isParamLocked(track, pLocks, 'noise_level')} mapInfo={{ path: `tracks.${track.id}.params.noise_level`, label: `${track.name} Noise Level` }} />
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <EnvelopeSection basePath="filterEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="FILTER ENVELOPE"
            extraControls={<Knob label="ENV AMT" value={getParamValue(track, pLocks, 'filterEnvAmount')} min={-10000} max={10000} onChange={createHandler('filterEnvAmount')} isPLocked={isParamLocked(track, pLocks, 'filterEnvAmount')} mapInfo={{ path: `tracks.${track.id}.params.filterEnvAmount`, label: `${track.name} Filter Env Amt` }} />}
        />
        <Section title="DUAL FILTER" className="grid-cols-2 md:grid-cols-4">
            <Selector label="MODE" value={params.filter_mode} options={[{value: 'lp_hp_p', label: 'LP/HP P'}, {value: 'lp_hp_s', label: 'LP>HP S'}, {value: 'bp_bp_p', label: 'DUAL BP'}]} onChange={createHandler('filter_mode')} isPLocked={isParamLocked(track, pLocks, 'filter_mode')} />
            <Knob label="CUTOFF" value={getParamValue(track, pLocks, 'filter_cutoff')} min={20} max={20000} onChange={createHandler('filter_cutoff')} isPLocked={isParamLocked(track, pLocks, 'filter_cutoff')} mapInfo={{ path: `tracks.${track.id}.params.filter_cutoff`, label: `${track.name} Filter Cutoff` }} />
            <Knob label="RESO" value={getParamValue(track, pLocks, 'filter_res')} min={0.1} max={30} step={0.1} onChange={createHandler('filter_res')} isPLocked={isParamLocked(track, pLocks, 'filter_res')} mapInfo={{ path: `tracks.${track.id}.params.filter_res`, label: `${track.name} Filter Reso` }} />
            <Knob label="SPREAD" value={getParamValue(track, pLocks, 'filter_spread')} min={-48} max={48} step={1} onChange={createHandler('filter_spread')} unit="st" isPLocked={isParamLocked(track, pLocks, 'filter_spread')} mapInfo={{ path: `tracks.${track.id}.params.filter_spread`, label: `${track.name} Filter Spread` }} />
        </Section>
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const ShiftEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const params = track.params as ShiftParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'shift.pitch', label: 'PITCH'}, {value: 'shift.position', label: 'POSITION'},
        {value: 'shift.bend', label: 'BEND'}, {value: 'shift.twist', label: 'TWIST'},
    ];
    const createHandler = (path: string) => useCallback((v: any) => onParamChange(path, v), [path, onParamChange]);
    
    return <>
        <Section title="WAVETABLE" className="grid-cols-2 md:grid-cols-5">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={108} step={1} onChange={createHandler('pitch')} displayTransform={v => midiToNoteName(v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }} />
            <Selector label="TABLE" value={params.table} options={[{value: 0, label: 'SAW-SQR'}, {value: 1, label: 'SQR-TRI'}, {value: 2, label: 'FORMANT'}, {value: 3, label: 'DIGITAL'}]} onChange={createHandler('table')} isPLocked={isParamLocked(track, pLocks, 'table')} />
            <Knob label="POS" value={getParamValue(track, pLocks, 'position')} min={0} max={100} onChange={createHandler('position')} isPLocked={isParamLocked(track, pLocks, 'position')} mapInfo={{ path: `tracks.${track.id}.params.position`, label: `${track.name} Position` }} />
            <Knob label="BEND" value={getParamValue(track, pLocks, 'bend')} min={0} max={100} onChange={createHandler('bend')} isPLocked={isParamLocked(track, pLocks, 'bend')} mapInfo={{ path: `tracks.${track.id}.params.bend`, label: `${track.name} Bend` }} />
            <Knob label="TWIST" value={getParamValue(track, pLocks, 'twist')} min={0} max={100} onChange={createHandler('twist')} isPLocked={isParamLocked(track, pLocks, 'twist')} mapInfo={{ path: `tracks.${track.id}.params.twist`, label: `${track.name} Twist` }} />
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const ResonEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const params = track.params as ResonParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'reson.pitch', label: 'PITCH'}, {value: 'reson.structure', label: 'STRUCTURE'},
        {value: 'reson.brightness', label: 'BRIGHT'}, {value: 'reson.decay', label: 'DECAY'},
        {value: 'reson.material', label: 'MATERIAL'},
    ];
    const createHandler = (path: string) => useCallback((v: any) => onParamChange(path, v), [path, onParamChange]);
    
    return <>
        <Section title="RESONATOR" className="grid-cols-2 md:grid-cols-5">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={108} step={1} onChange={createHandler('pitch')} displayTransform={v => midiToNoteName(v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }} />
            <Knob label="STRUCTURE" value={getParamValue(track, pLocks, 'structure')} min={0} max={100} onChange={createHandler('structure')} isPLocked={isParamLocked(track, pLocks, 'structure')} mapInfo={{ path: `tracks.${track.id}.params.structure`, label: `${track.name} Structure` }} />
            <Knob label="BRIGHT" value={getParamValue(track, pLocks, 'brightness')} min={1000} max={20000} onChange={createHandler('brightness')} isPLocked={isParamLocked(track, pLocks, 'brightness')} mapInfo={{ path: `tracks.${track.id}.params.brightness`, label: `${track.name} Brightness` }} />
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'decay')} min={0.8} max={0.999} step={0.001} onChange={createHandler('decay')} isPLocked={isParamLocked(track, pLocks, 'decay')} mapInfo={{ path: `tracks.${track.id}.params.decay`, label: `${track.name} Decay` }} />
            <Knob label="MATERIAL" value={getParamValue(track, pLocks, 'material')} min={0} max={100} onChange={createHandler('material')} isPLocked={isParamLocked(track, pLocks, 'material')} mapInfo={{ path: `tracks.${track.id}.params.material`, label: `${track.name} Material` }} />
        </Section>
        <Section title="EXCITER" className="grid-cols-1">
            <Selector label="TYPE" value={params.exciter_type} options={[{value: 'noise', label: 'F. NOISE'}, {value: 'impulse', label: 'IMPULSE'}]} onChange={createHandler('exciter_type')} isPLocked={isParamLocked(track, pLocks, 'exciter_type')} />
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const AlloyEditor: React.FC<InstrumentEditorComponentsProps> = React.memo(({ track, pLocks, onParamChange }) => {
    const params = track.params as AlloyParams;
    const DESTINATIONS: {value: LFODestination, label: string}[] = [ ...COMMON_DESTINATIONS,
        {value: 'alloy.pitch', label: 'PITCH'}, {value: 'alloy.ratio', label: 'RATIO'},
        {value: 'alloy.feedback', label: 'FEEDBACK'}, {value: 'alloy.mod_level', label: 'MOD LEVEL'},
        {value: 'alloy.mod_decay', label: 'MOD DECAY'},
    ];
    const createHandler = (path: string) => useCallback((v: any) => onParamChange(path, v), [path, onParamChange]);
    
    return <>
        <Section title="OPERATORS" className="grid-cols-2 md:grid-cols-3">
            <Knob label="PITCH" value={getParamValue(track, pLocks, 'pitch')} min={12} max={108} step={1} onChange={createHandler('pitch')} displayTransform={v => midiToNoteName(v)} isPLocked={isParamLocked(track, pLocks, 'pitch')} mapInfo={{ path: `tracks.${track.id}.params.pitch`, label: `${track.name} Pitch` }} />
            <Knob label="RATIO" value={getParamValue(track, pLocks, 'ratio')} min={0.1} max={8} step={0.001} onChange={createHandler('ratio')} isPLocked={isParamLocked(track, pLocks, 'ratio')} mapInfo={{ path: `tracks.${track.id}.params.ratio`, label: `${track.name} Ratio` }} />
            <Knob label="FEEDBACK" value={getParamValue(track, pLocks, 'feedback')} min={0} max={100} onChange={createHandler('feedback')} isPLocked={isParamLocked(track, pLocks, 'feedback')} mapInfo={{ path: `tracks.${track.id}.params.feedback`, label: `${track.name} Feedback` }} />
        </Section>
        <Section title="MODULATOR ENVELOPE" className="grid-cols-3">
            <Knob label="LEVEL" value={getParamValue(track, pLocks, 'mod_level')} min={0} max={100} onChange={createHandler('mod_level')} isPLocked={isParamLocked(track, pLocks, 'mod_level')} mapInfo={{ path: `tracks.${track.id}.params.mod_level`, label: `${track.name} Mod Level` }} />
            <Knob label="ATK" value={getParamValue(track, pLocks, 'mod_attack')} min={0.001} max={2} step={0.001} onChange={createHandler('mod_attack')} isPLocked={isParamLocked(track, pLocks, 'mod_attack')} mapInfo={{ path: `tracks.${track.id}.params.mod_attack`, label: `${track.name} Mod Attack` }} />
            <Knob label="DECAY" value={getParamValue(track, pLocks, 'mod_decay')} min={0.01} max={4} step={0.01} onChange={createHandler('mod_decay')} isPLocked={isParamLocked(track, pLocks, 'mod_decay')} mapInfo={{ path: `tracks.${track.id}.params.mod_decay`, label: `${track.name} Mod Decay` }} />
        </Section>
        <EnvelopeSection basePath="ampEnv" track={track} pLocks={pLocks} onParamChange={onParamChange} title="AMP ENVELOPE" />
        <FilterSection basePath="filter" track={track} pLocks={pLocks} onParamChange={onParamChange} />
        <LFOSection title="LFO 1" basePath="lfo1" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
        <LFOSection title="LFO 2" basePath="lfo2" track={track} pLocks={pLocks} onParamChange={onParamChange} destinations={DESTINATIONS} />
    </>;
});

const MidiOutEditor: React.FC<{
    track: Track;
    pLocks: PLocks | null;
    onParamChange: (key: keyof MidiOutParams, value: any) => void;
    onAddCcLock: () => void;
    onUpdateCcLock: (id: string, cc?: number, value?: number) => void;
    onRemoveCcLock: (id: string) => void;
}> = React.memo(({ track, pLocks, onParamChange, onAddCcLock, onUpdateCcLock, onRemoveCcLock }) => {
    const midiOutputs = useStore(state => state.midiOutputs);
    const outputOptions = [{ value: null, label: 'NONE' }, ...midiOutputs.map(o => ({ value: o.id, label: o.name || `Output ${o.id.substring(0,6)}` }))];
    const channelOptions = Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `CH ${i + 1}` }));
    
    const ccLocks = pLocks?.ccLocks || [];

    return (
        <div className="space-y-4">
            <Section title="MIDI OUTPUT">
                <Selector label="DEVICE" value={getMidiOutParamValue(track, pLocks, 'deviceId')} options={outputOptions} onChange={v => onParamChange('deviceId', v)} isPLocked={isMidiOutParamLocked(pLocks, 'deviceId')} />
                <Selector label="CHANNEL" value={getMidiOutParamValue(track, pLocks, 'channel')} options={channelOptions} onChange={v => onParamChange('channel', v)} isPLocked={isMidiOutParamLocked(pLocks, 'channel')} />
            </Section>
             <Section title="CC P-LOCKS">
                <div className="col-span-full space-y-2">
                    {ccLocks.map(lock => (
                        <div key={lock.id} className="flex items-center space-x-2">
                            <Knob label="CC" value={lock.cc} min={0} max={127} step={1} onChange={v => onUpdateCcLock(lock.id, v)} size={40} />
                            <Knob label="VALUE" value={lock.value} min={0} max={127} step={1} onChange={v => onUpdateCcLock(lock.id, undefined, v)} size={40} />
                            <button onClick={() => onRemoveCcLock(lock.id)} className="h-8 px-2 text-xs font-bold rounded-sm bg-red-800 hover:bg-red-700 border border-red-900 transition-colors text-white">DEL</button>
                        </div>
                    ))}
                    <button onClick={onAddCcLock} className="w-full h-8 text-xs font-bold rounded-sm bg-blue-800 hover:bg-blue-700 border border-blue-900 transition-colors text-white">ADD CC LOCK</button>
                </div>
            </Section>
        </div>
    );
});


const InstrumentEditor: React.FC = () => {
  // Performance: Split state selection into smaller, more focused hooks
  const { selectedTrackId, selectedPLockStep, isViewerMode } = useStore(state => ({
    selectedTrackId: state.selectedTrackId,
    selectedPLockStep: state.selectedPLockStep,
    isViewerMode: state.isViewerMode,
  }), shallow);
  
  const track = useStore(state => state.preset.tracks.find(t => t.id === selectedTrackId));

  const {
    setParam, setTrackVolume, setTrackPan, setFxSend, setMidiOutParam,
    saveInstrumentPreset, loadInstrumentPreset, deleteInstrumentPreset,
    randomizeInstrument, importInstrumentPresets, exportInstrumentPresets, triggerViewerModeInteraction,
    addMidiCcLock, updateMidiCcLock, removeMidiCcLock,
  } = useStore(state => ({
    setParam: state.setParam,
    setTrackVolume: state.setTrackVolume,
    setTrackPan: state.setTrackPan,
    setFxSend: state.setFxSend,
    setMidiOutParam: state.setMidiOutParam,
    saveInstrumentPreset: state.saveInstrumentPreset,
    loadInstrumentPreset: state.loadInstrumentPreset,
    deleteInstrumentPreset: state.deleteInstrumentPreset,
    randomizeInstrument: state.randomizeInstrument,
    importInstrumentPresets: state.importInstrumentPresets,
    exportInstrumentPresets: state.exportInstrumentPresets,
    triggerViewerModeInteraction: state.triggerViewerModeInteraction,
    addMidiCcLock: state.addMidiCcLock,
    updateMidiCcLock: state.updateMidiCcLock,
    removeMidiCcLock: state.removeMidiCcLock,
  }), shallow);

  const instrumentPresets = useStore(state => state.instrumentPresets);
  
  const pLocks = selectedPLockStep ? track?.patterns[track.activePatternIndex][selectedPLockStep.stepIndex]?.pLocks ?? null : null;

  const handleRandomize = useCallback(() => randomizeInstrument(selectedTrackId), [randomizeInstrument, selectedTrackId]);

  if (!track) {
    return (
      <div className="bg-[var(--bg-panel)] rounded-md border border-[var(--border-color)] h-full flex flex-col justify-between" data-tour-id="instrument-editor">
        <TrackSelector layout="vertical" />
      </div>
    );
  }

  const editorProps: InstrumentEditorComponentsProps = {
    track,
    pLocks,
    onParamChange: setParam,
  };
  
  const isDisabled = isViewerMode && track.id >= 3;

  const renderEngineEditor = () => {
    switch (track.type) {
      case 'kick': return <KickEditor {...editorProps} />;
      case 'hat': return <HatEditor {...editorProps} />;
      case 'arcane': return <ArcaneEditor {...editorProps} />;
      case 'ruin': return <RuinEditor {...editorProps} />;
      case 'artifice': return <ArtificeEditor {...editorProps} />;
      case 'shift': return <ShiftEditor {...editorProps} />;
      case 'reson': return <ResonEditor {...editorProps} />;
      case 'alloy': return <AlloyEditor {...editorProps} />;
      case 'midi': return <MidiOutEditor track={track} pLocks={pLocks} onParamChange={setMidiOutParam} onAddCcLock={addMidiCcLock} onUpdateCcLock={updateMidiCcLock} onRemoveCcLock={removeMidiCcLock} />;
      default: return <div className="p-4 text-center text-neutral-500">No editor for this track type.</div>;
    }
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-md border border-[var(--border-color)] h-full flex flex-col min-h-0" data-tour-id="instrument-editor">
      <EditorHeader trackName={track.name} trackId={track.id} />
      <TrackSelector layout="horizontal" />
      {track.type !== 'midi' && (
        <InstrumentPresetManager
          trackType={track.type}
          presets={instrumentPresets}
          onSave={saveInstrumentPreset}
          onLoad={loadInstrumentPreset}
          onDelete={deleteInstrumentPreset}
          onRandomize={handleRandomize}
          loadedPresetName={track.loadedInstrumentPresetName}
          onImportInstrumentPresets={importInstrumentPresets}
          onExportInstrumentPresets={exportInstrumentPresets}
        />
      )}
      <div className={`flex-grow min-h-0 overflow-y-auto no-scrollbar pt-2 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`} onClick={isDisabled ? triggerViewerModeInteraction : undefined}>
        {renderEngineEditor()}
        <OutputSection 
          track={track} 
          pLocks={pLocks} 
          onVolumeChange={setTrackVolume} 
          onPanChange={setTrackPan} 
          onFxSendChange={setFxSend} 
        />
      </div>
    </div>
  );
};

export default React.memo(InstrumentEditor);
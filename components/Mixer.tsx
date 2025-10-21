import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Track, FXSends } from '../types';
import { useStore } from '../store/store';
import Knob from './Knob';
import VUMeter from './VUMeter';
import { useMidiMapping } from '../contexts/MidiContext';
import { shallow } from 'zustand/shallow';

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300/80">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

const TrackName: React.FC<{ trackId: number; name: string }> = ({ trackId, name }) => {
    const { renameTrack, isViewerMode } = useStore(state => ({
        renameTrack: state.renameTrack,
        isViewerMode: state.isViewerMode,
    }), shallow);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

    useEffect(() => {
        setEditName(name);
    }, [name]);

    const handleRename = () => {
        const trimmedName = editName.trim();
        if (trimmedName && trimmedName !== name) {
            renameTrack(trackId, trimmedName);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleRename();
        else if (e.key === 'Escape') {
            setEditName(name);
            setIsEditing(false);
        }
    };

    return (
        <div className="text-center bg-black/80 rounded-sm py-0.5 w-full mb-1 flex-shrink-0" onDoubleClick={() => !isViewerMode && setIsEditing(true)}>
            {isEditing ? (
                <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-transparent w-full font-bold text-[11px] text-white uppercase truncate px-1 text-center outline-none ring-1 ring-[var(--accent-color)]"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <h3 className="font-bold text-[11px] text-white uppercase truncate px-1">{name}</h3>
            )}
        </div>
    );
};


const Mixer: React.FC = () => {
    // This selector is stable and only re-renders if tracks are added/removed.
    const trackIds = useStore(state => state.preset.tracks.map(t => t.id), shallow);
    const selectTrack = useStore(state => state.selectTrack);
    const { isLearning } = useMidiMapping();

    return (
        <div className="h-full w-full p-2 bg-[var(--bg-chassis)] rounded pt-2 overflow-x-auto sm:overflow-y-hidden no-scrollbar">
            <div className="inline-flex gap-2 h-full">
                {trackIds.map(trackId => (
                    <MixerChannel
                        key={trackId}
                        trackId={trackId}
                        onSelect={() => !isLearning && selectTrack(trackId)}
                    />
                ))}
            </div>
        </div>
    );
};

interface MixerChannelProps {
    trackId: number;
    onSelect: () => void;
}

const MixerChannel: React.FC<MixerChannelProps> = React.memo(({ trackId, onSelect }) => {
    // This selector is now TRULY granular. It only selects primitive values or booleans,
    // so `shallow` can compare them correctly. This prevents re-renders when other tracks change.
    const {
        name, volume, pan, 
        reverbSend, delaySend, driveSend, sidechainSend,
        isVolumeAutomated, isPanAutomated, isReverbAutomated, isDelayAutomated, isDriveAutomated, isSidechainAutomated,
        isSelected, isMuted, isSoloed, soloedTrackId, isViewerMode, isSpectator
    } = useStore(state => {
        const track = state.preset.tracks.find(t => t.id === trackId);
        if (!track) return {} as any;
        const auto = track.automation || {};
        return {
            name: track.name,
            volume: track.volume,
            pan: track.pan,
            reverbSend: track.fxSends.reverb,
            delaySend: track.fxSends.delay,
            driveSend: track.fxSends.drive,
            sidechainSend: track.fxSends.sidechain,
            isVolumeAutomated: !!(auto['volume'] && auto['volume'].length > 0),
            isPanAutomated: !!(auto['pan'] && auto['pan'].length > 0),
            isReverbAutomated: !!(auto['fxSends.reverb'] && auto['fxSends.reverb'].length > 0),
            isDelayAutomated: !!(auto['fxSends.delay'] && auto['fxSends.delay'].length > 0),
            isDriveAutomated: !!(auto['fxSends.drive'] && auto['fxSends.drive'].length > 0),
            isSidechainAutomated: !!(auto['fxSends.sidechain'] && auto['fxSends.sidechain'].length > 0),
            isSelected: state.selectedTrackId === trackId,
            isMuted: state.mutedTracks.includes(trackId),
            isSoloed: state.soloedTrackId === trackId,
            soloedTrackId: state.soloedTrackId,
            isViewerMode: state.isViewerMode,
            isSpectator: state.isSpectator,
        };
    }, shallow);

    // Actions are stable and selected separately to prevent re-renders.
    const {
        triggerViewerModeInteraction, setTrackVolume, setTrackPan, toggleMute, 
        toggleSolo, setFxSend
    } = useStore(state => ({
        triggerViewerModeInteraction: state.triggerViewerModeInteraction,
        setTrackVolume: state.setTrackVolume,
        setTrackPan: state.setTrackPan,
        toggleMute: state.toggleMute,
        toggleSolo: state.toggleSolo,
        setFxSend: state.setFxSend,
    }), shallow);
    
    const { isLearning, learningTarget, mapTarget } = useMidiMapping();

    const handleVolumeChange = useCallback((v: number) => setTrackVolume(trackId, v), [trackId, setTrackVolume]);
    const handlePanChange = useCallback((v: number) => setTrackPan(trackId, v / 100), [trackId, setTrackPan]);
    const handleFxSendChange = useCallback((fx: keyof FXSends, v: number) => setFxSend(trackId, fx, v), [trackId, setFxSend]);
    
    if (!name) return null; // If track doesn't exist yet (during a state transition)

    const isAudible = soloedTrackId === null ? !isMuted : isSoloed;
    const isDisabled = isSpectator || (isViewerMode && trackId >= 3);
    
    const mutePath = `tracks.${trackId}.mute`;
    const isMuteTarget = isLearning && learningTarget?.path === mutePath;
    const soloPath = `tracks.${trackId}.solo`;
    const isSoloTarget = isLearning && learningTarget?.path === soloPath;

    return (
        <div 
            onClick={onSelect}
            className={`relative w-24 sm:w-28 flex-shrink-0 flex flex-col p-1 bg-[var(--bg-panel-dark)] rounded-md transition-all duration-300 cursor-pointer overflow-y-auto sm:overflow-y-visible no-scrollbar ${isAudible ? 'opacity-100' : 'opacity-40'} ${isSelected ? 'selected-track-glow' : 'border border-[var(--border-color)]'} ${isDisabled ? 'relative' : ''}`}
        >
            <TrackName trackId={trackId} name={name} />
            
            {/* Desktop / Tablet layout */}
            <div className="hidden sm:flex flex-col items-center w-full">
                <div className='flex gap-x-1 w-full items-start justify-center'>
                    <div className="relative rounded-full flex-grow flex justify-center">
                        <Knob 
                            label="VOL"
                            value={volume}
                            min={0} max={1.5} step={0.01}
                            onChange={handleVolumeChange}
                            size={40}
                            displayTransform={(v) => {
                                const db = 20 * Math.log10(v);
                                return isFinite(db) ? db.toFixed(1) : '-inf';
                            }}
                            unit="dB"
                            isAutomated={isVolumeAutomated}
                            mapInfo={{ path: `tracks.${trackId}.volume`, label: `T${trackId+1} Vol` }}
                            disabled={isDisabled}
                            onDisabledClick={triggerViewerModeInteraction}
                        />
                    </div>
                    <div className="h-[72px] pt-1">
                        <VUMeter trackId={trackId} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-1 w-full">
                    <Knob label="S.CHAIN" value={sidechainSend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('sidechain', v)} size={30} isAutomated={isSidechainAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.sidechain`, label: `T${trackId+1} Sidechain` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <Knob label="DRIVE" value={driveSend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('drive', v)} size={30} isAutomated={isDriveAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.drive`, label: `T${trackId+1} Drive` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <Knob label="DLY" value={delaySend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('delay', v)} size={30} isAutomated={isDelayAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.delay`, label: `T${trackId+1} Delay` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <Knob label="VERB" value={reverbSend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('reverb', v)} size={30} isAutomated={isReverbAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.reverb`, label: `T${trackId+1} Reverb` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                </div>

                <div className="w-full flex items-start justify-between gap-1 mt-1.5">
                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: mutePath, label: `Mute T${trackId+1}`, type: 'button' }) : toggleMute(trackId); }} disabled={soloedTrackId !== null || isDisabled} className={`mt-1 flex-1 h-6 rounded font-bold text-[10px] border transition-all duration-200 relative ${isMuted ? 'bg-[var(--color-mute)] border-red-600 text-white' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'} ${soloedTrackId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isMuteTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                        M
                    </button>
                    <Knob label="PAN" value={pan * 100} min={-100} max={100} step={1} onChange={handlePanChange} size={30} displayTransform={(v) => { const roundedV = Math.round(v); return roundedV === 0 ? 'C' : (roundedV < 0 ? `${Math.abs(roundedV)}L` : `${roundedV}R`); }} isAutomated={isPanAutomated} mapInfo={{ path: `tracks.${trackId}.pan`, label: `T${trackId+1} Pan`, range: { min: -1, max: 1 } }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: soloPath, label: `Solo T${trackId+1}`, type: 'button' }) : toggleSolo(trackId); }} disabled={isDisabled} className={`mt-1 flex-1 h-6 rounded font-bold text-[10px] border transition-all duration-200 relative ${isSoloed ? 'bg-[var(--color-solo)] border-yellow-600 text-[var(--text-dark)]' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'}`}>
                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isSoloTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                        S
                    </button>
                </div>
            </div>
            
            {/* Mobile layout */}
            <div className="flex sm:hidden flex-col items-center w-full h-full">
                <Knob label="PAN" value={pan * 100} min={-100} max={100} step={1} onChange={handlePanChange} size={40} displayTransform={(v) => { const roundedV = Math.round(v); return roundedV === 0 ? 'C' : (roundedV < 0 ? `${Math.abs(roundedV)}L` : `${roundedV}R`); }} isAutomated={isPanAutomated} mapInfo={{ path: `tracks.${trackId}.pan`, label: `T${trackId+1} Pan`, range: { min: -1, max: 1 } }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                <div className="flex flex-col gap-y-3 my-3 border-y border-neutral-700/50 py-3 w-full items-center flex-shrink-0">
                    <Knob label="S.CHAIN" value={sidechainSend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('sidechain', v)} size={30} isAutomated={isSidechainAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.sidechain`, label: `T${trackId+1} Sidechain` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <Knob label="DRIVE" value={driveSend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('drive', v)} size={30} isAutomated={isDriveAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.drive`, label: `T${trackId+1} Drive` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <Knob label="DLY" value={delaySend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('delay', v)} size={30} isAutomated={isDelayAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.delay`, label: `T${trackId+1} Delay` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    <Knob label="VERB" value={reverbSend} min={0} max={1} step={0.01} onChange={v => handleFxSendChange('reverb', v)} size={30} isAutomated={isReverbAutomated} mapInfo={{ path: `tracks.${trackId}.fxSends.reverb`, label: `T${trackId+1} Reverb` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                </div>
                <div className='flex gap-x-1 w-full items-center justify-center mt-auto'>
                    <div className="relative rounded-full flex-grow flex justify-center">
                        <Knob label="VOL" value={volume} min={0} max={1.5} step={0.01} onChange={handleVolumeChange} size={50} displayTransform={(v) => { const db = 20 * Math.log10(v); return isFinite(db) ? db.toFixed(1) : '-inf'; }} unit="dB" isAutomated={isVolumeAutomated} mapInfo={{ path: `tracks.${trackId}.volume`, label: `T${trackId+1} Vol` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                    </div>
                    <div className="h-[82px] pt-1">
                        <VUMeter trackId={trackId} />
                    </div>
                </div>
                <div className="w-full flex items-center justify-between gap-1 mt-2 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: mutePath, label: `Mute T${trackId+1}`, type: 'button' }) : toggleMute(trackId); }} disabled={soloedTrackId !== null || isDisabled} className={`flex-1 h-6 rounded font-bold text-xs border transition-all duration-200 relative ${isMuted ? 'bg-[var(--color-mute)] border-red-600 text-white' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'} ${soloedTrackId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isMuteTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                        MUTE
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: soloPath, label: `Solo T${trackId+1}`, type: 'button' }) : toggleSolo(trackId); }} disabled={isDisabled} className={`flex-1 h-6 rounded font-bold text-xs border transition-all duration-200 relative ${isSoloed ? 'bg-[var(--color-solo)] border-yellow-600 text-[var(--text-dark)]' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'}`}>
                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isSoloTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                        SOLO
                    </button>
                </div>
            </div>
             {isDisabled && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md z-10 cursor-not-allowed backdrop-blur-sm">
                    <LockIcon />
                </div>
            )}
        </div>
    );
});


export default React.memo(Mixer);
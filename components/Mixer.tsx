import React, { useState, useEffect, useCallback } from 'react';
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

const TrackName: React.FC<{ track: Track }> = ({ track }) => {
    const { renameTrack, isViewerMode } = useStore(state => ({
        renameTrack: state.renameTrack,
        isViewerMode: state.isViewerMode,
    }), shallow);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(track.name);

    useEffect(() => {
        setEditName(track.name);
    }, [track.name]);

    const handleRename = () => {
        const trimmedName = editName.trim();
        if (trimmedName && trimmedName !== track.name) {
            renameTrack(track.id, trimmedName);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleRename();
        else if (e.key === 'Escape') {
            setEditName(track.name);
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
                <h3 className="font-bold text-[11px] text-white uppercase truncate px-1">{track.name}</h3>
            )}
        </div>
    );
};


const Mixer: React.FC = () => {
    const { 
        tracks, mutedTracks, soloedTrackId, selectedTrackId, isViewerMode, isSpectator, triggerViewerModeInteraction,
        setTrackVolume, setTrackPan, toggleMute, toggleSolo, setFxSend, selectTrack 
    } = useStore(state => ({
        tracks: state.preset?.tracks || [],
        mutedTracks: state.mutedTracks,
        soloedTrackId: state.soloedTrackId,
        selectedTrackId: state.selectedTrackId,
        isViewerMode: state.isViewerMode,
        isSpectator: state.isSpectator,
        triggerViewerModeInteraction: state.triggerViewerModeInteraction,
        setTrackVolume: state.setTrackVolume,
        setTrackPan: state.setTrackPan,
        toggleMute: state.toggleMute,
        toggleSolo: state.toggleSolo,
        setFxSend: state.setFxSend,
        selectTrack: state.selectTrack,
    }), shallow);

    const { isLearning, learningTarget, mapTarget } = useMidiMapping();

    const handleVolumeChange = useCallback((trackId: number, v: number) => setTrackVolume(trackId, v), [setTrackVolume]);
    const handlePanChange = useCallback((trackId: number, v: number) => setTrackPan(trackId, v / 100), [setTrackPan]);
    const handleFxSendChange = useCallback((trackId: number, fx: keyof FXSends, v: number) => setFxSend(trackId, fx, v), [setFxSend]);
    
    return (
        <div className="h-full w-full p-2 bg-[var(--bg-chassis)] rounded pt-2 overflow-x-auto sm:overflow-y-hidden no-scrollbar">
            <div className="inline-flex gap-2 h-full">
                {tracks.map(track => {
                    const isMuted = mutedTracks.includes(track.id);
                    const isSoloed = soloedTrackId === track.id;
                    const isAudible = soloedTrackId === null ? !isMuted : isSoloed;
                    const isDisabled = isSpectator || (isViewerMode && track.id >= 3);
                    
                    const mutePath = `tracks.${track.id}.mute`;
                    const isMuteTarget = isLearning && learningTarget?.path === mutePath;
                    const soloPath = `tracks.${track.id}.solo`;
                    const isSoloTarget = isLearning && learningTarget?.path === soloPath;

                    return (
                        <div key={track.id} 
                            onClick={() => !isLearning && selectTrack(track.id)}
                            className={`w-24 sm:w-28 flex-shrink-0 flex flex-col p-1 bg-[var(--bg-panel-dark)] rounded-md transition-all duration-300 cursor-pointer overflow-y-auto sm:overflow-y-visible no-scrollbar ${isAudible ? 'opacity-100' : 'opacity-40'} ${track.id === selectedTrackId ? 'selected-track-glow' : 'border border-[var(--border-color)]'} ${isDisabled ? 'relative' : ''}`}>
                            
                            <TrackName track={track} />
                            
                            {/* Desktop / Tablet layout */}
                            <div className="hidden sm:flex flex-col items-center w-full">
                                <div className='flex gap-x-1 w-full items-start justify-center'>
                                    <div className="relative rounded-full flex-grow flex justify-center">
                                        <Knob 
                                            label="VOL"
                                            value={track.volume}
                                            min={0} max={1.5} step={0.01}
                                            onChange={(v) => handleVolumeChange(track.id, v)}
                                            size={40}
                                            displayTransform={(v) => {
                                                const db = 20 * Math.log10(v);
                                                return isFinite(db) ? db.toFixed(1) : '-inf';
                                            }}
                                            unit="dB"
                                            isAutomated={track.automation['volume'] && track.automation['volume'].length > 0}
                                            mapInfo={{ path: `tracks.${track.id}.volume`, label: `T${track.id+1} Vol` }}
                                            disabled={isDisabled}
                                            onDisabledClick={triggerViewerModeInteraction}
                                        />
                                    </div>
                                    <div className="h-[72px] pt-1">
                                        <VUMeter trackId={track.id} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-1 w-full">
                                    <Knob label="S.CHAIN" value={track.fxSends.sidechain} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'sidechain', v)} size={30} isAutomated={track.automation['fxSends.sidechain'] && track.automation['fxSends.sidechain'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.sidechain`, label: `T${track.id+1} Sidechain` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <Knob label="DRIVE" value={track.fxSends.drive} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'drive', v)} size={30} isAutomated={track.automation['fxSends.drive'] && track.automation['fxSends.drive'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.drive`, label: `T${track.id+1} Drive` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <Knob label="DLY" value={track.fxSends.delay} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'delay', v)} size={30} isAutomated={track.automation['fxSends.delay'] && track.automation['fxSends.delay'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.delay`, label: `T${track.id+1} Delay` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <Knob label="VERB" value={track.fxSends.reverb} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'reverb', v)} size={30} isAutomated={track.automation['fxSends.reverb'] && track.automation['fxSends.reverb'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.reverb`, label: `T${track.id+1} Reverb` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                </div>

                                <div className="w-full flex items-start justify-between gap-1 mt-1.5">
                                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: mutePath, label: `Mute T${track.id+1}`, type: 'button' }) : toggleMute(track.id); }} disabled={soloedTrackId !== null || isDisabled} className={`mt-1 flex-1 h-6 rounded font-bold text-[10px] border transition-all duration-200 relative ${isMuted ? 'bg-[var(--color-mute)] border-red-600 text-white' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'} ${soloedTrackId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isMuteTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                                        M
                                    </button>
                                    <Knob label="PAN" value={track.pan * 100} min={-100} max={100} step={1} onChange={(v) => handlePanChange(track.id, v)} size={30} displayTransform={(v) => { const roundedV = Math.round(v); return roundedV === 0 ? 'C' : (roundedV < 0 ? `${Math.abs(roundedV)}L` : `${roundedV}R`); }} isAutomated={track.automation['pan'] && track.automation['pan'].length > 0} mapInfo={{ path: `tracks.${track.id}.pan`, label: `T${track.id+1} Pan`, range: { min: -1, max: 1 } }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: soloPath, label: `Solo T${track.id+1}`, type: 'button' }) : toggleSolo(track.id); }} disabled={isDisabled} className={`mt-1 flex-1 h-6 rounded font-bold text-[10px] border transition-all duration-200 relative ${isSoloed ? 'bg-[var(--color-solo)] border-yellow-600 text-[var(--text-dark)]' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'}`}>
                                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isSoloTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                                        S
                                    </button>
                                </div>
                            </div>
                            
                            {/* Mobile layout */}
                            <div className="flex sm:hidden flex-col items-center w-full h-full">
                                <Knob label="PAN" value={track.pan * 100} min={-100} max={100} step={1} onChange={(v) => handlePanChange(track.id, v)} size={40} displayTransform={(v) => { const roundedV = Math.round(v); return roundedV === 0 ? 'C' : (roundedV < 0 ? `${Math.abs(roundedV)}L` : `${roundedV}R`); }} isAutomated={track.automation['pan'] && track.automation['pan'].length > 0} mapInfo={{ path: `tracks.${track.id}.pan`, label: `T${track.id+1} Pan`, range: { min: -1, max: 1 } }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                <div className="flex flex-col gap-y-3 my-3 border-y border-neutral-700/50 py-3 w-full items-center flex-shrink-0">
                                    <Knob label="S.CHAIN" value={track.fxSends.sidechain} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'sidechain', v)} size={30} isAutomated={track.automation['fxSends.sidechain'] && track.automation['fxSends.sidechain'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.sidechain`, label: `T${track.id+1} Sidechain` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <Knob label="DRIVE" value={track.fxSends.drive} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'drive', v)} size={30} isAutomated={track.automation['fxSends.drive'] && track.automation['fxSends.drive'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.drive`, label: `T${track.id+1} Drive` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <Knob label="DLY" value={track.fxSends.delay} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'delay', v)} size={30} isAutomated={track.automation['fxSends.delay'] && track.automation['fxSends.delay'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.delay`, label: `T${track.id+1} Delay` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    <Knob label="VERB" value={track.fxSends.reverb} min={0} max={1} step={0.01} onChange={v => handleFxSendChange(track.id, 'reverb', v)} size={30} isAutomated={track.automation['fxSends.reverb'] && track.automation['fxSends.reverb'].length > 0} mapInfo={{ path: `tracks.${track.id}.fxSends.reverb`, label: `T${track.id+1} Reverb` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                </div>
                                <div className='flex gap-x-1 w-full items-center justify-center mt-auto'>
                                    <div className="relative rounded-full flex-grow flex justify-center">
                                        <Knob label="VOL" value={track.volume} min={0} max={1.5} step={0.01} onChange={(v) => handleVolumeChange(track.id, v)} size={50} displayTransform={(v) => { const db = 20 * Math.log10(v); return isFinite(db) ? db.toFixed(1) : '-inf'; }} unit="dB" isAutomated={track.automation['volume'] && track.automation['volume'].length > 0} mapInfo={{ path: `tracks.${track.id}.volume`, label: `T${track.id+1} Vol` }} disabled={isDisabled} onDisabledClick={triggerViewerModeInteraction}/>
                                    </div>
                                    <div className="h-[82px] pt-1">
                                        <VUMeter trackId={track.id} />
                                    </div>
                                </div>
                                <div className="w-full flex items-center justify-between gap-1 mt-2 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: mutePath, label: `Mute T${track.id+1}`, type: 'button' }) : toggleMute(track.id); }} disabled={soloedTrackId !== null || isDisabled} className={`flex-1 h-6 rounded font-bold text-xs border transition-all duration-200 relative ${isMuted ? 'bg-[var(--color-mute)] border-red-600 text-white' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'} ${soloedTrackId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isMuteTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                                        MUTE
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: soloPath, label: `Solo T${track.id+1}`, type: 'button' }) : toggleSolo(track.id); }} disabled={isDisabled} className={`flex-1 h-6 rounded font-bold text-xs border transition-all duration-200 relative ${isSoloed ? 'bg-[var(--color-solo)] border-yellow-600 text-[var(--text-dark)]' : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] text-[var(--text-light)]'}`}>
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
                })}
            </div>
        </div>
    );
};

export default React.memo(Mixer);
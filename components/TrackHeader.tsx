import React, { useState, useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { Track } from '../types';
import { useStore } from '../store/store';
import { useMidiMapping } from '../contexts/MidiContext';

interface TrackHeaderProps {
    track: Track;
    isSelected: boolean;
    isAudible: boolean;
    className?: string;
}

const TrackHeader: React.FC<TrackHeaderProps> = ({ track, isSelected, isAudible, className = '' }) => {
    const { selectTrack, toggleMute, toggleSolo, soloedTrackId, renameTrack, isViewerMode } = useStore(state => ({
        selectTrack: state.selectTrack,
        toggleMute: state.toggleMute,
        toggleSolo: state.toggleSolo,
        soloedTrackId: state.soloedTrackId,
        renameTrack: state.renameTrack,
        isViewerMode: state.isViewerMode,
    }), shallow);

    const { isLearning, learningTarget, mapTarget } = useMidiMapping();
    const isMuted = useStore(state => state.mutedTracks.includes(track.id));
    const isSoloed = soloedTrackId === track.id;

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
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setEditName(track.name);
            setIsEditing(false);
        }
    };

    const mutePath = `tracks.${track.id}.mute`;
    const isMuteTarget = isLearning && learningTarget?.path === mutePath;
    const soloPath = `tracks.${track.id}.solo`;
    const isSoloTarget = isLearning && learningTarget?.path === soloPath;
    const selectPath = `tracks.${track.id}.select`;
    const isSelectTarget = isLearning && learningTarget?.path === selectPath;

    const handleHeaderClick = () => {
        if (isLearning) {
            mapTarget({ path: selectPath, label: `Select Track ${track.id + 1}`, type: 'button' });
        } else {
            selectTrack(track.id);
        }
    };

    return (
        <div 
            onClick={handleHeaderClick}
            className={`w-full flex items-center justify-between p-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 border-b border-neutral-800 relative cursor-pointer ${isSelected ? 'selected-track-glow' : ''} ${className}`}
            style={{ opacity: isAudible ? 1 : 0.4 }}
        >
            {isLearning && (
                <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isSelectTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />
            )}
            <div className="flex-grow text-left truncate focus:outline-none bg-transparent" onDoubleClick={() => !isViewerMode && setIsEditing(true)}>
                {isEditing ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="bg-transparent w-full text-xs font-bold uppercase tracking-wider outline-none ring-1 ring-[var(--accent-color)] rounded-sm p-1 -m-1"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    track.name
                )}
            </div>
            <div className="flex space-x-0.5 flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: mutePath, label: `Mute T${track.id + 1}`, type: 'button' }) : toggleMute(track.id); }}
                    disabled={soloedTrackId !== null}
                    className={`relative w-6 h-6 rounded-sm text-[9px] font-bold border transition-colors ${isMuted ? 'bg-red-500 border-red-400 text-white' : 'bg-neutral-600/50 border-neutral-500/50 text-neutral-300'} ${soloedTrackId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isMuteTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                    M
                </button>
                <button onClick={(e) => { e.stopPropagation(); isLearning ? mapTarget({ path: soloPath, label: `Solo T${track.id + 1}`, type: 'button' }) : toggleSolo(track.id); }} className={`relative w-6 h-6 rounded-sm text-[9px] font-bold border transition-colors ${isSoloed ? 'bg-[var(--color-solo)] border-yellow-300 text-black' : 'bg-neutral-600/50 border-neutral-500/50 text-neutral-300'}`}>
                    {isLearning && <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isSoloTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />}
                    S
                </button>
            </div>
        </div>
    );
};

export default React.memo(TrackHeader);
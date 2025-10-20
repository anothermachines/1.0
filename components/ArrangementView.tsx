import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Preset, ArrangementClip, StepState } from '../types';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';
import TrackHeader from './TrackHeader';

const TRACK_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#14b8a6', // teal-500
    '#3b82f6', // blue-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
];

const LoopControl: React.FC<{
    pixelsPerBeat: number;
    totalDurationInBeats: number;
    loop: { start: number; end: number } | null;
    setLoop: (start: number, end: number) => void;
}> = ({ pixelsPerBeat, totalDurationInBeats, loop, setLoop }) => {
    const dragState = useRef<{ type: 'move' | 'resizeStart' | 'resizeEnd'; initialX: number; initialStart: number; initialEnd: number; } | null>(null);
    const snapIncrement = 1; // Snap to beats

    const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resizeStart' | 'resizeEnd') => {
        if (!loop) return;
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragState.current = { type, initialX: e.clientX, initialStart: loop.start, initialEnd: loop.end };
        
        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!dragState.current) return;
            const dx = moveEvent.clientX - dragState.current.initialX;
            const dBeats = dx / pixelsPerBeat;
            const { initialStart, initialEnd } = dragState.current;

            if (dragState.current.type === 'move') {
                const duration = initialEnd - initialStart;
                let newStart = Math.max(0, Math.round((initialStart + dBeats) / snapIncrement) * snapIncrement);
                if (newStart + duration > totalDurationInBeats) {
                    newStart = totalDurationInBeats - duration;
                }
                let newEnd = newStart + duration;
                if (newStart !== loop.start) {
                    setLoop(newStart, newEnd);
                }
            } else if (dragState.current.type === 'resizeStart') {
                let newStart = Math.max(0, Math.round((initialStart + dBeats) / snapIncrement) * snapIncrement);
                newStart = Math.min(newStart, loop.end - snapIncrement);
                if (newStart !== loop.start) {
                    setLoop(newStart, loop.end);
                }
            } else { // resizeEnd
                let newEnd = Math.max(loop.start + snapIncrement, Math.round((initialEnd + dBeats) / snapIncrement) * snapIncrement);
                newEnd = Math.min(totalDurationInBeats, newEnd);
                if (newEnd !== loop.end) {
                    setLoop(loop.start, newEnd);
                }
            }
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
            dragState.current = null;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    if (!loop) return null;

    const left = loop.start * pixelsPerBeat;
    const width = (loop.end - loop.start) * pixelsPerBeat;

    return (
        <div 
            className="absolute top-0 h-full cursor-grab active:cursor-grabbing bg-cyan-500/20"
            style={{ left, width }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
        >
             <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400"/>
            <div 
                className="absolute top-0 left-0 bottom-0 w-3 cursor-ew-resize group z-10 -translate-x-1/2"
                onPointerDown={(e) => handlePointerDown(e, 'resizeStart')}
            >
                <div className="absolute left-1/2 top-0 h-full w-1 rounded-full transition-colors -translate-x-1/2 bg-cyan-300 group-hover:bg-white" />
            </div>
            <div 
                className="absolute top-0 right-0 bottom-0 w-3 cursor-ew-resize group z-10 translate-x-1/2"
                onPointerDown={(e) => handlePointerDown(e, 'resizeEnd')}
            >
                <div className="absolute left-1/2 top-0 h-full w-1 rounded-full transition-colors -translate-x-1/2 bg-cyan-300 group-hover:bg-white" />
            </div>
        </div>
    );
};

const LoopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
);

const Playhead: React.FC<{ pixelsPerBeat: number }> = ({ pixelsPerBeat }) => {
    const currentPlayheadTime = useStore(state => state.currentPlayheadTime);
    const secondsPerBeat = 60 / useStore.getState().preset.bpm;
    const playheadTimeInBeats = currentPlayheadTime / secondsPerBeat;

    return (
        <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-yellow-400 pointer-events-none z-20" style={{ transform: `translateX(${playheadTimeInBeats * pixelsPerBeat}px)`, willChange: 'transform' }} />
    );
};

const ArrangementClipComponent: React.FC<{
    clip: ArrangementClip;
    preset: Preset;
    isSelected: boolean;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>, clip: ArrangementClip, dragType: 'move' | 'resize') => void;
    pixelsPerBeat: number;
}> = React.memo(({ clip, preset, isSelected, onPointerDown, pixelsPerBeat }) => {
    const track = preset.tracks.find(t => t.id === clip.trackId);
    if (!track) return null;

    const trackColor = TRACK_COLORS[clip.trackId % TRACK_COLORS.length];
    const trackIndex = preset.tracks.findIndex(t => t.id === clip.trackId);
    if (trackIndex === -1) return null;

    const pattern = useMemo(() => {
        if (!track || clip.patternIndex === undefined) return null;
        return track.patterns[clip.patternIndex];
    }, [track, clip.patternIndex]);

    const patternLengthInBeats = track.patternLength / 4;
    const totalStepsInClip = Math.ceil(clip.duration * 4); 

    return (
        <div
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, clip, 'move'); }}
            className={`absolute h-[56px] rounded border cursor-grab active:cursor-grabbing overflow-hidden group`}
            style={{
                top: `${trackIndex * 64 + 4}px`,
                left: `${clip.startTime * pixelsPerBeat}px`,
                width: `${clip.duration * pixelsPerBeat}px`,
                backgroundColor: trackColor,
                borderColor: 'rgba(0,0,0,0.4)',
                boxShadow: isSelected 
                    ? `inset 0 0 0 2px rgba(0,0,0,0.7), inset 0 0 10px 2px black` 
                    : 'inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.5)',
                zIndex: isSelected ? 10 : 1,
            }}
        >
            <div className='relative top-0.5 left-1.5 text-[10px] text-white font-bold pointer-events-none' style={{textShadow: '0 1px 2px rgba(0,0,0,0.7)'}}>
                P{clip.patternIndex !== undefined ? clip.patternIndex + 1 : '?'}
            </div>
            
            <div className="absolute inset-0 pointer-events-none">
                {pattern && Array.from({ length: totalStepsInClip }).map((_, i) => {
                    const stepIndexInPattern = i % track.patternLength;
                    const step = pattern[stepIndexInPattern];

                    if (!step || !step.active) {
                        return null;
                    }

                    const stepWidth = pixelsPerBeat / 4;

                    if (stepWidth < 2) {
                        return null;
                    }

                    return (
                        <div
                            key={i}
                            className="absolute bottom-0"
                            style={{
                                left: `${i * stepWidth}px`,
                                width: `${Math.max(1, stepWidth - 1)}px`, // 1px gap between steps
                                height: `${15 + step.velocity * 85}%`, // Velocity affects height (from 15% to 100%)
                                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                borderRadius: '1px 1px 0 0',
                            }}
                        />
                    );
                })}
            </div>

            <div 
                onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, clip, 'resize'); }}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-50 group-hover:opacity-100 transition-opacity"
            />
        </div>
    );
});


const ArrangementView: React.FC = () => {
    const { 
        preset, arrangementLoop, selectedTrackId, mutedTracks, soloedTrackId,
        moveClip, deleteClip, duplicateClip, addPatternClip,
        resizeClip, setArrangementLoop, initializeArrangementLoop,
        setPlayheadPosition, isPlaying, currentPlayheadTime
    } = useStore(state => ({
        preset: state.preset,
        arrangementLoop: state.arrangementLoop,
        selectedTrackId: state.selectedTrackId,
        mutedTracks: state.mutedTracks,
        soloedTrackId: state.soloedTrackId,
        moveClip: state.moveClip,
        deleteClip: state.deleteClip,
        duplicateClip: state.duplicateClip,
        addPatternClip: state.addPatternClip,
        resizeClip: state.resizeClip,
        setArrangementLoop: state.setArrangementLoop,
        initializeArrangementLoop: state.initializeArrangementLoop,
        setPlayheadPosition: state.setPlayheadPosition,
        isPlaying: state.isPlaying,
        currentPlayheadTime: state.currentPlayheadTime,
    }), shallow);
    
    const [zoom, setZoom] = useState(25); // pixels per second
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [addPatternMode, setAddPatternMode] = useState(false);
    const [patternToAdd, setPatternToAdd] = useState(0); // 0-7 for pattern index
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ scrollLeft: 0, clientWidth: 0 });
    const dragState = useRef<{ clipId: string; type: 'move' | 'resize'; startX: number; originalStartTime: number; originalDuration: number; isDuplicating: boolean; } | null>(null);
    const totalDurationInBeats = 4 * 200; // 200 bars
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);
    const autoScrollTimeoutRef = useRef<number>();

    const secondsPerBeat = 60 / preset.bpm;
    const pixelsPerBeat = secondsPerBeat * zoom;

    useEffect(() => {
        initializeArrangementLoop(16); // 4 bars * 4 beats/bar
    }, [initializeArrangementLoop]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
                deleteClip(selectedClipId);
                setSelectedClipId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipId, deleteClip]);

    useEffect(() => {
        if (isPlaying && isAutoScrolling && containerRef.current) {
            const container = containerRef.current;
            const playheadPos = (currentPlayheadTime / secondsPerBeat) * pixelsPerBeat;
            const { scrollLeft, clientWidth } = container;
            const followZoneStart = scrollLeft + clientWidth * 0.4;
            const followZoneEnd = scrollLeft + clientWidth * 0.6;

            if (playheadPos < followZoneStart || playheadPos > followZoneEnd) {
                const targetScrollLeft = playheadPos - clientWidth / 2;
                container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            }
        }
    }, [currentPlayheadTime, isPlaying, isAutoScrolling, pixelsPerBeat, secondsPerBeat]);

    const handleWheel = (e: React.WheelEvent) => {
        setIsAutoScrolling(false);
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = window.setTimeout(() => setIsAutoScrolling(true), 1500);

        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(z => Math.max(5, Math.min(200, z - e.deltaY * 0.1)));
        } else if (containerRef.current) {
            containerRef.current.scrollLeft += e.deltaY;
            containerRef.current.scrollLeft += e.deltaX;
        }
    };
    
    const handleScroll = () => {
        if (containerRef.current && timelineRef.current && headerContainerRef.current) {
            timelineRef.current.scrollLeft = containerRef.current.scrollLeft;
            headerContainerRef.current.scrollTop = containerRef.current.scrollTop;
            setViewport({
                scrollLeft: containerRef.current.scrollLeft,
                clientWidth: containerRef.current.clientWidth,
            });
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, clip?: ArrangementClip, dragType: 'move' | 'resize' = 'move') => {
        if (e.button !== 0) return;
        
        if (addPatternMode && !clip) {
            const rect = containerRef.current!.getBoundingClientRect();
            const x = e.clientX - rect.left + containerRef.current!.scrollLeft;
            const y = e.clientY - rect.top + containerRef.current!.scrollTop;
            const trackIndex = Math.floor(y / 64);
            const trackId = preset.tracks[trackIndex]?.id;
            
            if (trackId !== undefined) {
                const startTimeInBeatsUnsnapped = x / pixelsPerBeat;
                const startTimeInBeats = Math.round(startTimeInBeatsUnsnapped);
                addPatternClip(trackId, startTimeInBeats, patternToAdd);
            }
            return;
        }

        if (clip) {
            setSelectedClipId(clip.id);
            dragState.current = {
                clipId: clip.id,
                type: dragType,
                startX: e.clientX,
                originalStartTime: clip.startTime,
                originalDuration: clip.duration,
                isDuplicating: e.altKey && dragType === 'move',
            };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } else {
            setSelectedClipId(null);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragState.current) return;
        setIsAutoScrolling(false);
        const dx = e.clientX - dragState.current.startX;
        const dBeats = dx / pixelsPerBeat;
        const snapIncrement = 1;
        
        if (dragState.current.type === 'move') {
            if (dragState.current.isDuplicating) return;
            const newUnsnappedStartTimeInBeats = Math.max(0, dragState.current.originalStartTime + dBeats);
            const newStartTimeInBeats = Math.round(newUnsnappedStartTimeInBeats / snapIncrement) * snapIncrement;
            moveClip(dragState.current.clipId, newStartTimeInBeats);
        } else {
            const newUnsnappedDurationInBeats = Math.max(snapIncrement, dragState.current.originalDuration + dBeats);
            const newDurationInBeats = Math.round(newUnsnappedDurationInBeats / snapIncrement) * snapIncrement;
            resizeClip(dragState.current.clipId, newDurationInBeats);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragState.current) return;
        setIsAutoScrolling(true);

        if (dragState.current.isDuplicating) {
            const originalClip = (preset.arrangementClips || []).find(c => c.id === dragState.current!.clipId);
            if (originalClip) {
                const dx = e.clientX - dragState.current.startX;
                const dBeats = dx / pixelsPerBeat;
                const newUnsnappedStartTimeInBeats = Math.max(0, dragState.current.originalStartTime + dBeats);
                const newStartTimeInBeats = Math.round(newUnsnappedStartTimeInBeats);
                duplicateClip(originalClip, newStartTimeInBeats);
            }
        }
        
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        dragState.current = null;
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !containerRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const scrollLeft = containerRef.current.scrollLeft;
        
        const positionInPixels = x + scrollLeft;
        const positionInBeats = positionInPixels / pixelsPerBeat;
        
        const snappedToBeats = Math.floor(positionInBeats);
        
        setPlayheadPosition(snappedToBeats * secondsPerBeat);
    };

    const visibleClips = useMemo(() => {
        const buffer = 200;
        const visibleStartBeats = (viewport.scrollLeft - buffer) / pixelsPerBeat;
        const visibleEndBeats = (viewport.scrollLeft + viewport.clientWidth + buffer) / pixelsPerBeat;
        return (preset.arrangementClips || []).filter(clip => 
            clip.startTime + clip.duration > visibleStartBeats && clip.startTime < visibleEndBeats
        );
    }, [preset.arrangementClips, viewport, pixelsPerBeat]);

    return (
        <div className="h-full flex flex-col bg-[var(--bg-chassis)] text-xs">
            <div className="flex-shrink-0 flex items-center justify-between p-1 border-b border-neutral-700">
                <div className='flex items-center gap-2'>
                     <button
                        onClick={() => setAddPatternMode(prev => !prev)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-sm border transition-all text-white ${
                            addPatternMode 
                            ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' 
                            : 'bg-neutral-600 hover:bg-neutral-500 border-neutral-500'
                        }`}
                    >
                        ADD PATTERN
                    </button>
                    {addPatternMode && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 animate-fade-in">
                            PATTERN:
                            <select value={patternToAdd} onChange={e => setPatternToAdd(parseInt(e.target.value))} className="bg-neutral-700 rounded p-1 text-xs focus:ring-0 focus:border-cyan-500 border-neutral-600">
                                {Array.from({ length: 8 }).map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    ZOOM
                    <input type="range" min="10" max="200" step="1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-24" />
                </div>
            </div>

            <div className="flex-grow flex min-h-0">
                <div className="w-32 flex-shrink-0 bg-[var(--bg-panel-dark)] flex flex-col border-r border-neutral-700">
                    <div className="h-8 flex-shrink-0 border-b border-neutral-700" />
                    <div ref={headerContainerRef} className="overflow-y-hidden no-scrollbar">
                         <div style={{ height: `${preset.tracks.length * 64}px` }}>
                            {preset.tracks.map(track => {
                                const isSelected = track.id === selectedTrackId;
                                const isMuted = mutedTracks.includes(track.id);
                                const isSoloed = soloedTrackId === track.id;
                                const isAudible = soloedTrackId === null ? !isMuted : isSoloed;
                                return (
                                    <TrackHeader 
                                        key={track.id} 
                                        track={track} 
                                        isSelected={isSelected} 
                                        isAudible={isAudible} 
                                        className="h-[64px]"
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex-grow flex flex-col min-w-0">
                    <div ref={timelineRef} onClick={handleTimelineClick} className="flex-shrink-0 h-8 bg-[var(--bg-panel-dark)] overflow-hidden relative cursor-pointer">
                        <div className="absolute h-full" style={{ width: `${totalDurationInBeats * pixelsPerBeat}px` }}>
                            {Array.from({ length: Math.ceil(totalDurationInBeats) }).map((_, i) => {
                                const isBar = i % 4 === 0;
                                const time = i * secondsPerBeat;
                                const minutes = Math.floor(time / 60);
                                const seconds = Math.floor(time % 60);
                                return (
                                    <div key={i} className={`absolute top-0 h-full border-l ${isBar ? 'border-neutral-400' : 'border-neutral-600'}`} style={{ left: `${i * pixelsPerBeat}px` }}>
                                        {isBar && <span className="absolute -mt-0.5 ml-1 text-neutral-400 text-[10px]">{i / 4 + 1}</span>}
                                        {isBar && zoom > 40 && <span className="absolute top-3 ml-1 text-neutral-500 text-[9px]">{`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}</span>}
                                    </div>
                                )
                            })}
                            <LoopControl pixelsPerBeat={pixelsPerBeat} totalDurationInBeats={totalDurationInBeats} loop={arrangementLoop} setLoop={setArrangementLoop} />
                        </div>
                    </div>

                    <div 
                        ref={containerRef} 
                        className={`flex-grow overflow-auto no-scrollbar ${addPatternMode ? 'cursor-crosshair' : ''}`} 
                        onWheel={handleWheel} 
                        onScroll={handleScroll}
                        onPointerDown={(e) => handlePointerDown(e)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <div className="relative" style={{ width: `${totalDurationInBeats * pixelsPerBeat}px`, height: `${preset.tracks.length * 64}px` }}>
                            {preset.tracks.map((track, i) => (
                                <div key={`h-line-${track.id}`} className="absolute w-full border-b border-neutral-800" style={{ top: `${(i + 1) * 64 - 1}px`, height: '1px' }} />
                            ))}
                            {Array.from({ length: Math.ceil(totalDurationInBeats) }).map((_, i) => (
                                <div key={`v-line-${i}`} className={`absolute top-0 bottom-0 border-l ${i % 4 === 0 ? 'border-neutral-700' : 'border-neutral-800'}`} style={{ left: `${i * pixelsPerBeat}px` }} />
                            ))}

                            {visibleClips.map(clip => (
                                <ArrangementClipComponent
                                    key={clip.id}
                                    clip={clip}
                                    preset={preset}
                                    isSelected={clip.id === selectedClipId}
                                    onPointerDown={handlePointerDown}
                                    pixelsPerBeat={pixelsPerBeat}
                                />
                            ))}
                            
                            <Playhead pixelsPerBeat={pixelsPerBeat} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArrangementView;
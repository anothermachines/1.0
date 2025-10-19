import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { useStore } from '../store/store';
import { usePlaybackStore } from '../store/playbackStore';
import { Track, StepState } from '../types';
import { midiToNoteName, noteNameToMidi } from '../utils';
import { shallow } from 'zustand/shallow';

const OCTAVE_COUNT = 4; // C1 to B4
const MIN_MIDI_NOTE = 24; // C1
const TOTAL_NOTES = OCTAVE_COUNT * 12;
const BASE_KEY_HEIGHT = 16; // px

const SCALES = {
    'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'Major': [0, 2, 4, 5, 7, 9, 11],
    'Minor': [0, 2, 3, 5, 7, 8, 10],
};
type ScaleName = keyof typeof SCALES;

const CHORDS = {
    'Triad': [0, 2, 4],
    '7th': [0, 2, 4, 6],
    'Maj7': [0, 2, 4, 6],
    'Sus2': [0, 1, 4],
    'Sus4': [0, 3, 4],
};
type ChordName = keyof typeof CHORDS;

const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const PianoKey = React.memo(({ midiNote, scaleNotes, keyHeight, isPlaying, isFolded, onAudition }: { midiNote: number, scaleNotes: Set<number>, keyHeight: number, isPlaying: boolean, isFolded: boolean, onAudition: () => void }) => {
    if (isFolded && !scaleNotes.has(midiNote % 12)) return null;

    const noteIndex = midiNote % 12;
    const isBlackKey = [1, 3, 6, 8, 10].includes(noteIndex);
    const noteName = midiToNoteName(midiNote);
    const showName = noteIndex === 0;

    const keyBg = isBlackKey
        ? 'linear-gradient(to right, var(--pianoroll-black-key) 0%, var(--pianoroll-black-key-gradient) 100%)'
        : 'linear-gradient(to right, var(--pianoroll-white-key) 0%, var(--pianoroll-white-key-gradient) 100%)';

    const [isActive, setIsActive] = useState(false);
    const handlePointerDown = () => {
        onAudition();
        setIsActive(true);
        setTimeout(() => setIsActive(false), 150);
    }

    return (
        <div
            onPointerDown={handlePointerDown}
            className={`w-full h-full flex items-center justify-end pr-2 text-[9px] font-mono border-b transition-all duration-100 cursor-pointer`}
            style={{ 
                background: (isPlaying || isActive) ? 'var(--accent-color)' : keyBg,
                color: (isPlaying || isActive) ? 'var(--text-dark)' : (isBlackKey ? 'var(--pianoroll-black-key-text)' : 'var(--pianoroll-white-key-text)'),
                borderColor: (isPlaying || isActive) ? 'var(--accent-color-active)' : (isBlackKey ? 'var(--pianoroll-black-key-border)' : 'var(--pianoroll-white-key-border)'),
                fontWeight: (isPlaying || isActive) ? 'bold' : 'normal',
                boxShadow: isBlackKey ? 'inset 2px 0 4px var(--shadow-deep)' : 'inset 1px 0 2px var(--shadow-deep)',
            }}
        >
            {showName && noteName}
        </div>
    );
});

export const PianoRoll: React.FC = () => {
    const { selectedTrackId, sequencerPage } = useStore(state => ({
        selectedTrackId: state.selectedTrackId,
        sequencerPage: state.sequencerPage,
    }), shallow);
    const track = useStore(state => state.preset?.tracks?.find(t => t.id === selectedTrackId));
    const { onStepChange, auditionNote, setSequencerPage } = useStore(state => ({
        onStepChange: state.setStepProperty,
        auditionNote: state.auditionNote,
        setSequencerPage: state.setSequencerPage,
    }), shallow);
    const currentStep = usePlaybackStore(state => state.currentStep);
    const isPlaying = usePlaybackStore(state => state.isPlaying);
    
    if (!track) {
        return (
            <div className="h-full flex flex-col bg-[var(--bg-panel-dark)] rounded-md border border-[var(--border-color)] text-xs min-h-0">
                <div className="flex-grow flex items-center justify-center text-neutral-500">
                    Select a melodic track to display Piano Roll.
                </div>
            </div>
        );
    }

    const [lastVelocity, setLastVelocity] = useState(0.8);
    const [verticalZoom, setVerticalZoom] = useState(1);
    const [stepWidth, setStepWidth] = useState(36);
    const gridRef = useRef<HTMLDivElement>(null);
    const velocityContainerRef = useRef<HTMLDivElement>(null);
    const keysRef = useRef<HTMLDivElement>(null);
    const [velocityLaneHeight, setVelocityLaneHeight] = useState(112); // 28 in tailwind units (h-28)
    
    const [viewport, setViewport] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const scrollUpdateRef = useRef(0);
    const zoomUpdateRef = useRef(0);
    
    const drawState = useRef<{ isDrawing: boolean; mode: 'add' | 'remove' | 'resize'; modifiedNotes: Set<string>; startStepIndex?: number; } | null>(null);

    const [isChordMode, setIsChordMode] = useState(false);
    const [rootNote, setRootNote] = useState(0); 
    const [scale, setScale] = useState<ScaleName>('Minor');
    const [chordType, setChordType] = useState<ChordName>('Triad');
    const [playingNoteMidis, setPlayingNoteMidis] = useState<Set<number>>(new Set());
    const [isFolded, setIsFolded] = useState(false);

    const keyHeight = BASE_KEY_HEIGHT * verticalZoom;
    
    const activePattern = track.patterns[track.activePatternIndex];

    const scaleNotes = useMemo(() => new Set(SCALES[scale].map(n => (n + rootNote) % 12)), [scale, rootNote]);
    
    const prevVerticalZoom = useRef(verticalZoom);
    const isInitialMount = useRef(true);

    useLayoutEffect(() => {
        const updateStepWidth = () => {
            if (gridRef.current) {
                setStepWidth(gridRef.current.clientWidth / 16);
            }
        };
        updateStepWidth();
        const resizeObserver = new ResizeObserver(updateStepWidth);
        if (gridRef.current) {
            resizeObserver.observe(gridRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);

    useLayoutEffect(() => {
        if (!gridRef.current || !keysRef.current) return;
        const grid = gridRef.current;
        const { scrollTop, scrollLeft, clientWidth, clientHeight } = grid;
        if (viewport.width !== clientWidth || viewport.height !== clientHeight || isInitialMount.current) {
             setViewport({ top: scrollTop, left: scrollLeft, width: clientWidth, height: clientHeight });
        }
    }, [verticalZoom, track.patternLength]);

    useLayoutEffect(() => {
        if (!gridRef.current || !keysRef.current) {
            return;
        }

        if (isInitialMount.current) {
            isInitialMount.current = false;
            const c3Midi = 48; // Center on C3
            const noteIndexFromTop = (MIN_MIDI_NOTE + TOTAL_NOTES - 1) - c3Midi;
            const initialScrollTop = (noteIndexFromTop * keyHeight) - (gridRef.current.clientHeight / 2) + (keyHeight / 2);
            gridRef.current.scrollTop = initialScrollTop;
            keysRef.current.scrollTop = initialScrollTop;
        } else if (prevVerticalZoom.current !== verticalZoom) {
            const oldKeyHeight = BASE_KEY_HEIGHT * prevVerticalZoom.current;
            if (oldKeyHeight > 0) {
                const { scrollTop, clientHeight } = gridRef.current;
                const scrollCenterPx = scrollTop + clientHeight / 2;
                const scrollRatio = scrollCenterPx / (TOTAL_NOTES * oldKeyHeight);
                const newTotalHeight = TOTAL_NOTES * keyHeight;
                const newScrollTop = (scrollRatio * newTotalHeight) - (clientHeight / 2);
                
                gridRef.current.scrollTop = newScrollTop;
                keysRef.current.scrollTop = newScrollTop;
            }
        }

        prevVerticalZoom.current = verticalZoom;
    }, [verticalZoom, keyHeight]);
    
    useEffect(() => {
        const refs = [scrollUpdateRef, zoomUpdateRef];
        return () => {
            refs.forEach(ref => cancelAnimationFrame(ref.current));
        }
    }, []);

    useEffect(() => {
        if (!isPlaying) { setPlayingNoteMidis(new Set()); return; }
        const step = activePattern[currentStep % track.patternLength];
        if (step && step.active && step.notes.length > 0) {
            const midis = new Set(step.notes.map(noteNameToMidi));
            setPlayingNoteMidis(midis);
            const timer = setTimeout(() => setPlayingNoteMidis(new Set()), 120);
            return () => clearTimeout(timer);
        } else {
            setPlayingNoteMidis(new Set());
        }
    }, [currentStep, isPlaying, activePattern, track.patternLength]);

    const handleKeyAudition = useCallback((midiNote: number) => {
        const noteName = midiToNoteName(midiNote);
        auditionNote(noteName);
    }, [auditionNote]);

    const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (keysRef.current) keysRef.current.scrollTop = target.scrollTop;
    
        cancelAnimationFrame(scrollUpdateRef.current);
        scrollUpdateRef.current = requestAnimationFrame(() => {
            setViewport({
                top: target.scrollTop,
                left: target.scrollLeft,
                width: target.clientWidth,
                height: target.clientHeight
            });
        });
    };
    
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (e.shiftKey || e.ctrlKey) {
            e.preventDefault();
            gridRef.current?.scrollBy({ left: e.deltaY, behavior: 'instant' });
        }
    }, []);

    const getCoordsFromEvent = (e: React.PointerEvent<HTMLElement>): [number, number] | null => {
        const rect = gridRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + gridRef.current!.scrollTop;
        const stepIndexOnPage = Math.floor(x / stepWidth);
        const stepIndex = stepIndexOnPage + sequencerPage * 16;
        const noteIndex = Math.floor(y / keyHeight);
        const midiNote = (MIN_MIDI_NOTE + TOTAL_NOTES - 1) - noteIndex;
        
        if (stepIndex < 0 || stepIndex >= track.patternLength || midiNote < MIN_MIDI_NOTE || midiNote >= MIN_MIDI_NOTE + TOTAL_NOTES) return null;
        return [stepIndex, midiNote];
    }
    
    const getChordNotes = (rootMidi: number): string[] => {
        const scaleIntervals = SCALES[scale];
        const rootNoteInScale = rootMidi % 12;

        const rootNoteIndexInScale = scaleIntervals.findIndex(interval => (rootNote + interval) % 12 === rootNoteInScale);
        if (rootNoteIndexInScale === -1) return [midiToNoteName(rootMidi)];

        const chordIntervals = CHORDS[chordType];
        
        const notesInChord = chordIntervals.map(chordIntervalIndex => {
            const scaleDegree = rootNoteIndexInScale + chordIntervalIndex;
            const octaveOffset = Math.floor(scaleDegree / scaleIntervals.length);
            const scaleIndex = scaleDegree % scaleIntervals.length;
            const noteOffset = scaleIntervals[scaleIndex];
            
            const rootOctave = Math.floor(rootMidi / 12);
            const finalMidi = rootOctave * 12 + ((rootNote + noteOffset) % 12) + (octaveOffset * 12);

            return midiToNoteName(finalMidi);
        });

        return notesInChord;
    }
    
    const processNoteInteraction = (stepIndex: number, midiNote: number) => {
        if (!drawState.current) return;
        
        // FIX: Prevent adding notes that are out of scale when in fold mode.
        if (isFolded && !scaleNotes.has(midiNote % 12)) {
            return;
        }

        const { mode, modifiedNotes } = drawState.current;
        const noteId = `${stepIndex}-${midiNote}`;
        if (modifiedNotes.has(noteId)) return;
        
        const noteName = midiToNoteName(midiNote);
        const step = activePattern[stepIndex];
        let newNotes: string[];

        if (mode === 'add') {
            newNotes = [...step.notes, noteName];
            onStepChange(selectedTrackId, stepIndex, 'velocity', lastVelocity);
            onStepChange(selectedTrackId, stepIndex, 'duration', 1);
        } else {
            newNotes = step.notes.filter(n => n !== noteName);
        }
        onStepChange(selectedTrackId, stepIndex, 'notes', newNotes);
        onStepChange(selectedTrackId, stepIndex, 'active', newNotes.length > 0);
        
        // If the step is now inactive, reset its note-specific properties to default
        if (newNotes.length === 0) {
            onStepChange(selectedTrackId, stepIndex, 'velocity', 1.0);
            onStepChange(selectedTrackId, stepIndex, 'duration', 1);
        }

        modifiedNotes.add(noteId);
    };


    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const coords = getCoordsFromEvent(e);
        if (!coords) return;
        const [stepIndex, midiNote] = coords;
        
        if (e.target instanceof HTMLElement && e.target.dataset.resize === 'true') {
            const noteStepIndex = parseInt(e.target.dataset.stepIndex!, 10);
            drawState.current = { isDrawing: true, mode: 'resize', modifiedNotes: new Set(), startStepIndex: noteStepIndex };
        } else {
            const step = activePattern[stepIndex];
            const noteName = midiToNoteName(midiNote);
            const noteIsPresent = step.notes.includes(noteName);
            const mode = noteIsPresent ? 'remove' : 'add';

            drawState.current = { isDrawing: true, mode, modifiedNotes: new Set(), startStepIndex: stepIndex };

            if (isChordMode) {
                 if (!scaleNotes.has(midiNote % 12)) return;
                const chordNoteNames = getChordNotes(midiNote);
                onStepChange(selectedTrackId, stepIndex, 'notes', chordNoteNames);
                onStepChange(selectedTrackId, stepIndex, 'velocity', lastVelocity);
                onStepChange(selectedTrackId, stepIndex, 'duration', 1);
                onStepChange(selectedTrackId, stepIndex, 'active', true);
            } else {
                processNoteInteraction(stepIndex, midiNote);
            }
        }
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drawState.current?.isDrawing) return;
        const coords = getCoordsFromEvent(e);
        if (!coords) return;
        const [stepIndex, midiNote] = coords;
        const { mode, startStepIndex } = drawState.current;

        if (mode === 'add' || mode === 'remove') {
             processNoteInteraction(stepIndex, midiNote);
        } else if (mode === 'resize') {
            const newDuration = Math.max(1, stepIndex - startStepIndex! + 1);
            if (activePattern[startStepIndex!].duration !== newDuration) {
                onStepChange(selectedTrackId, startStepIndex!, 'duration', newDuration);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if(drawState.current) {
            drawState.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const handleVelocityPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const updateVelocity = (evt: PointerEvent) => {
            const x = evt.clientX - rect.left;
            const stepIndexOnPage = Math.floor(x / stepWidth);
            if (stepIndexOnPage < 0 || stepIndexOnPage >= 16) return;
            const stepIndex = stepIndexOnPage + sequencerPage * 16;
            if (stepIndex >= track.patternLength) return;

            const y = evt.clientY - rect.top;
            const newVelocity = Math.max(0.01, Math.min(1.0, 1 - (y / rect.height)));
            onStepChange(selectedTrackId, stepIndex, 'velocity', newVelocity);
             if (activePattern[stepIndex].active) setLastVelocity(newVelocity);
        };
        const onPointerUp = () => { window.removeEventListener('pointermove', updateVelocity); window.removeEventListener('pointerup', onPointerUp); };
        e.currentTarget.setPointerCapture(e.pointerId);
        window.addEventListener('pointermove', updateVelocity);
        window.addEventListener('pointerup', onPointerUp, { once: true });
        updateVelocity(e.nativeEvent);
    };
    
    const handleVelocityResize = (e: React.PointerEvent<HTMLDivElement>) => {
        const startY = e.clientY;
        const startHeight = velocityLaneHeight;
        const moveHandler = (moveEvent: PointerEvent) => {
            const dy = startY - moveEvent.clientY;
            setVelocityLaneHeight(Math.max(40, Math.min(400, startHeight + dy)));
        };
        const upHandler = () => {
            document.removeEventListener('pointermove', moveHandler);
            document.removeEventListener('pointerup', upHandler);
        };
        document.addEventListener('pointermove', moveHandler);
        document.addEventListener('pointerup', upHandler);
    };

    const visibleNotes = useMemo(() => {
        const notes: { step: StepState; index: number; midi: number }[] = [];
        const processedSteps = new Set<number>();
        for (let i = 0; i < track.patternLength; i++) {
            if (processedSteps.has(i)) continue;

            const step = activePattern[i];
            if (step.active && step.notes.length > 0) {
                step.notes.forEach(note => {
                    const midi = noteNameToMidi(note);
                    if (!isFolded || scaleNotes.has(midi % 12)) {
                        notes.push({ step, index: i, midi });
                    }
                });
                for (let j = 1; j < step.duration; j++) {
                    processedSteps.add(i + j);
                }
            }
        }
        return notes;
    }, [activePattern, track.patternLength, isFolded, scaleNotes]);
    
    const getVelocityColor = (velocity: number) => {
        const clampedVel = Math.max(0, Math.min(1, velocity));
        const hue = 240 - (clampedVel * 240); // Blue (240) to Red (0)
        const lightness = 55 + clampedVel * 15; // 55% to 70%
        return `hsl(${hue}, 90%, ${lightness}%)`;
    };

    const startNoteIndex = Math.max(0, Math.floor(viewport.top / keyHeight) - 2);
    const endNoteIndex = Math.min(TOTAL_NOTES, Math.ceil((viewport.top + viewport.height) / keyHeight) + 2);

    const numPages = useMemo(() => Math.ceil(track.patternLength / 16), [track.patternLength]);
    const globalCurrentPage = Math.floor(currentStep / 16);

    return (
        <div className="flex flex-col h-full bg-[var(--bg-panel-dark)] rounded-md border border-[var(--border-color)] text-xs min-h-0">
            {/* Toolbar */}
            <div className="flex-shrink-0 flex flex-wrap items-center justify-between p-1 border-b border-[var(--border-color)] gap-2">
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsFolded(!isFolded)} className={`px-2 py-1 rounded text-[10px] ${isFolded ? 'bg-purple-500 text-white' : 'bg-neutral-600'}`}>FOLD</button>
                    <select value={rootNote} onChange={e => setRootNote(parseInt(e.target.value))} className="bg-neutral-700 rounded p-1 text-[10px]">
                        {ROOT_NOTES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                    </select>
                    <select value={scale} onChange={e => setScale(e.target.value as ScaleName)} className="bg-neutral-700 rounded p-1 text-[10px]">
                        {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsChordMode(!isChordMode)} className={`px-2 py-1 rounded text-[10px] ${isChordMode ? 'bg-cyan-500 text-white' : 'bg-neutral-600'}`}>CHORD</button>
                    <select disabled={!isChordMode} value={chordType} onChange={e => setChordType(e.target.value as ChordName)} className="bg-neutral-700 rounded p-1 text-[10px] disabled:opacity-50">
                        {Object.keys(CHORDS).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div className='flex items-center space-x-1'>
                     <span className="text-xs text-[var(--text-muted)] font-mono mr-2">PAGE</span>
                     {[...Array(numPages)].map((_, i) => (
                         <button key={i} onClick={() => setSequencerPage(i)}
                            className={`w-8 h-6 rounded text-xs font-bold border transition-colors ${
                                sequencerPage === i 
                                ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)]' 
                                : `bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)] ${globalCurrentPage === i ? 'bg-white/20' : ''}`
                            }`}>
                             {i + 1}
                         </button>
                     ))}
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                    V: <input type="range" min="0.5" max="3" step="0.25" value={verticalZoom} onChange={e => setVerticalZoom(parseFloat(e.target.value))} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col relative overflow-hidden">
                <div className="flex-grow flex min-h-0 min-w-0">
                    <div ref={keysRef} className="w-16 flex-shrink-0 bg-neutral-300 overflow-hidden no-scrollbar">
                        <div className="relative" style={{ height: `${TOTAL_NOTES * keyHeight}px` }}>
                             {Array.from({ length: endNoteIndex - startNoteIndex }).map((_, i) => {
                                const noteIndex = startNoteIndex + i;
                                const midiNote = (MIN_MIDI_NOTE + TOTAL_NOTES - 1) - noteIndex;
                                return (
                                    <div key={midiNote} className="absolute w-full" style={{ top: `${noteIndex * keyHeight}px`, height: `${keyHeight}px` }}>
                                        <PianoKey midiNote={midiNote} scaleNotes={scaleNotes} keyHeight={keyHeight} isPlaying={playingNoteMidis.has(midiNote)} isFolded={isFolded} onAudition={() => handleKeyAudition(midiNote)} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div ref={gridRef} onScroll={handleGridScroll} onWheel={handleWheel} className="flex-grow overflow-y-auto no-scrollbar min-w-0" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                        <div className="relative w-full" style={{ height: `${TOTAL_NOTES * keyHeight}px`, '--grid-step': `${stepWidth}px`, '--grid-key': `${keyHeight}px` }}>
                            <div className="absolute inset-0 pianoroll-grid-pattern opacity-60" />

                            {/* Scale Highlighting */}
                            <div className="absolute inset-0 pointer-events-none">
                                {Array.from({ length: endNoteIndex - startNoteIndex }).map((_, i) => {
                                    const noteIndex = startNoteIndex + i;
                                    const midiNote = (MIN_MIDI_NOTE + TOTAL_NOTES - 1) - noteIndex;
                                    if (isFolded || !scaleNotes.has(midiNote % 12)) return null;

                                    const isBlackKey = [1, 3, 6, 8, 10].includes(midiNote % 12);
                                    
                                    return (
                                        <div
                                            key={`highlight-${midiNote}`}
                                            className="absolute w-full"
                                            style={{
                                                top: `${noteIndex * keyHeight}px`,
                                                height: `${keyHeight}px`,
                                                backgroundColor: isBlackKey ? 'var(--pianoroll-scale-highlight-dark)' : 'var(--pianoroll-scale-highlight-light)',
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Notes */}
                            {visibleNotes.filter(({ index }) => {
                                const startStepForPage = sequencerPage * 16;
                                const endStepForPage = startStepForPage + 16;
                                return index >= startStepForPage && index < endStepForPage;
                            }).map(({ step, index, midi }) => {
                                const noteIndexFromTop = (MIN_MIDI_NOTE + TOTAL_NOTES - 1) - midi;
                                const noteWidth = step.duration * stepWidth - 2;
                                const noteHeight = keyHeight - 2;
                                return (
                                    <div
                                        key={`${index}-${midi}`}
                                        className="absolute rounded-sm overflow-hidden"
                                        style={{
                                            left: `${(index - sequencerPage * 16) * stepWidth + 1}px`,
                                            top: `${noteIndexFromTop * keyHeight + 1}px`,
                                            width: `${noteWidth > 0 ? noteWidth : 0}px`,
                                            height: `${noteHeight > 0 ? noteHeight : 0}px`,
                                            background: `linear-gradient(to bottom, ${getVelocityColor(step.velocity + 0.15)}, ${getVelocityColor(step.velocity - 0.15)})`,
                                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.5)',
                                            border: `1px solid ${getVelocityColor(step.velocity)}`,
                                        }}
                                    >
                                        <div 
                                            data-resize="true" 
                                            data-step-index={index} 
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize group"
                                        >
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 h-3/5 w-1 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Playhead */}
                            {globalCurrentPage === sequencerPage && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80 pointer-events-none z-20" style={{ transform: `translateX(${(currentStep % 16) * stepWidth}px)`, willChange: 'transform' }} />
                            )}
                        </div>
                    </div>
                </div>
                {/* Velocity Lane */}
                <div className="flex-shrink-0 border-t-2 border-neutral-600">
                    <div onPointerDown={handleVelocityResize} className="w-full h-1 bg-neutral-600 cursor-row-resize hover:bg-yellow-400"/>
                    <div className="flex" style={{ height: `${velocityLaneHeight}px` }}>
                        <div className="w-16 flex-shrink-0 bg-[var(--bg-panel-dark)] border-r border-neutral-700/50" />
                        <div ref={velocityContainerRef} onPointerDown={handleVelocityPointerDown} className="flex-grow w-full">
                            <div className="relative w-full h-full">
                                {activePattern.slice(sequencerPage * 16, (sequencerPage + 1) * 16).map((step, i) => {
                                    if (!step.active) return null;
                                    return (
                                    <div 
                                        key={i} 
                                        className="absolute bottom-0"
                                        style={{ 
                                            left: `${i * stepWidth + stepWidth * 0.3}px`, 
                                            width: `${stepWidth * 0.4}px`,
                                            height: `${step.velocity * 100}%`, 
                                            backgroundColor: getVelocityColor(step.velocity),
                                            borderTopLeftRadius: '2px',
                                            borderTopRightRadius: '2px'
                                        }} 
                                    />
                                )})}
                            </div>
                        </div>
                    </div>
                </div>
			</div>
        </div>
    );
};
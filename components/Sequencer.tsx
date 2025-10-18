import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Track, StepState, PLocks, TrigCondition, TrackType } from '../types';
import { useStore } from '../store/store';
import { usePlaybackStore } from '../store/playbackStore';
import Knob from './Knob';
import { noteNameToMidi, midiToNoteName, getParamValue, isParamLocked, hasParameterLocks, getTrackValue, isTrackValueLocked, getSendValue, isSendLocked } from '../utils';
import { useMidiMapping } from '../contexts/MidiContext';
import Selector from './Selector';
import { shallow } from 'zustand/shallow';
import TrackHeader from './TrackHeader';

const TRIG_CONDITIONS: { label: string; value: TrigCondition }[] = [
  { label: 'ALWAYS', value: { type: 'always' } },
  { label: 'FIRST', value: { type: 'first' } },
  { label: '!FIRST', value: { type: '!first' } },
  { label: 'PRE', value: { type: 'pre' } },
  { label: '!PRE', value: { type: '!pre' } },
  { label: '25%', value: { type: 'probability', p: 25 } },
  { label: '50%', value: { type: 'probability', p: 50 } },
  { label: '75%', value: { type: 'probability', p: 75 } },
  { label: '1:2', value: { type: 'a:b', a: 1, b: 2 } },
  { label: '2:2', value: { type: 'a:b', a: 2, b: 2 } },
  { label: '1:3', value: { type: 'a:b', a: 1, b: 3 } },
  { label: '2:3', value: { type: 'a:b', a: 2, b: 3 } },
  { label: '3:3', value: { type: 'a:b', a: 3, b: 3 } },
  { label: '1:4', value: { type: 'a:b', a: 1, b: 4 } },
  { label: '2:4', value: { type: 'a:b', a: 2, b: 4 } },
  { label: '3:4', value: { type: 'a:b', a: 3, b: 4 } },
  { label: '4:4', value: { type: 'a:b', a: 4, b: 4 } },
];

interface StepButtonProps {
    step: StepState;
    stepIndex: number;
    patternLength: number;
    isSelectedForPLock: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => void;
    mapInfo?: { path: string; label: string };
    isDarkGroup: boolean;
    defaultNote: string;
    isCurrent: boolean;
    disabled?: boolean;
}

const StepButton: React.FC<StepButtonProps> = React.memo(({
    step, stepIndex, patternLength, isSelectedForPLock, onClick, mapInfo, isDarkGroup, defaultNote, isCurrent, disabled = false
}) => {
    const { isLearning, learningTarget, mapTarget } = useMidiMapping();
    const isSelectedTarget = isLearning && learningTarget?.path === mapInfo?.path;

    const isActive = step?.active ?? false;
    const hasCondition = step?.condition && step?.condition.type !== 'always';
    
    const isNotePLocked = step?.notes && step.notes.length > 0 && (step.notes.length > 1 || step.notes[0] !== defaultNote);
    const hasPLocks = hasParameterLocks(step?.pLocks) || isNotePLocked || (step?.velocity !== 1.0 && step?.velocity !== 0);

    const isOutOfBounds = stepIndex >= patternLength;

    const handleMapClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
        if (isLearning && mapInfo) {
            e.stopPropagation();
            mapTarget({ ...mapInfo, type: 'button' });
        } else {
            onClick(e);
        }
    };

    const baseBg = isDarkGroup ? 'var(--sequencer-step-dark)' : 'var(--sequencer-step-light)';
    const baseShadow = 'inset 0 1px 1px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(255,255,255,0.1)';
    
    // Performance Optimization: Use opacity for velocity instead of animating box-shadow.
    // A baseline opacity of 0.4 ensures even quiet notes are visible.
    const velocityOpacity = isActive ? 0.4 + (step.velocity * 0.6) : 0;
    
    // Simplified, non-velocity-dependent outer glow for active steps.
    const outerGlow = isActive ? `0 0 8px 1px rgba(var(--accent-rgb), 0.5)` : 'none';

    return (
        <button
            onClick={handleMapClick}
            className={`relative w-full h-full rounded-md transition-all duration-150 select-none touch-manipulation ${isOutOfBounds ? 'opacity-30' : ''} ${isSelectedForPLock ? 'ring-2 ring-cyan-400 ring-inset' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
            aria-label={`Step ${stepIndex + 1}`}
            disabled={isOutOfBounds || disabled}
            title={hasPLocks ? "This step has parameter locks" : `Step ${stepIndex + 1}`}
            style={{ boxShadow: outerGlow }}
        >
            {isLearning && mapInfo && (
                <div className={`absolute inset-0 rounded-md z-10 transition-colors ${
                    isSelectedTarget
                    ? 'bg-cyan-500/60 animate-pulse-glow'
                    : 'hover:bg-cyan-500/20'
                }`} />
            )}
            
            {/* Base Pad (Inactive state & Grouping) */}
            <div
                className="absolute inset-0 rounded-md"
                style={{
                    background: baseBg,
                    boxShadow: baseShadow,
                }}
            />

            {/* Active state Pad */}
            <div
                className="absolute inset-0 rounded-md transition-opacity duration-100"
                style={{
                    background: 'var(--accent-color)',
                    boxShadow: baseShadow,
                    opacity: velocityOpacity,
                }}
            />

            {/* P-Lock / Condition Indicator */}
            {(hasPLocks || hasCondition) && !isOutOfBounds && (
                <div
                    className="absolute w-1.5 h-1.5 rounded-full bottom-1.5 right-1.5"
                    style={{
                        background: hasCondition ? '#fb923c' : '#22d3ee', // orange-400, cyan-400
                        boxShadow: `0 0 3px 1px ${hasCondition ? 'rgba(251, 146, 60, 0.7)' : 'rgba(34, 211, 238, 0.7)'}`,
                        zIndex: 1,
                    }}
                />
            )}

            {/* Current Step Playhead (Glow) - More performant version */}
            {isCurrent && !isOutOfBounds && (
                <div key={stepIndex} className="playhead-indicator" />
            )}
        </button>
    );
});

// Performance Optimization: Memoize the track row to prevent re-renders when other tracks change.
const TrackRow = React.memo(({ track, currentPage, isSelected, isAudible, isDisabled }: { track: Track; currentPage: number; isSelected: boolean; isAudible: boolean; isDisabled: boolean; }) => {
    const { handleStepClick, selectedPLockStep } = useStore(state => ({
        handleStepClick: state.handleStepClick,
        selectedPLockStep: state.selectedPLockStep,
    }), shallow);
    const currentStep = usePlaybackStore(state => state.currentStep);
    const stepsForTrack = track.patterns[track.activePatternIndex] || [];

    const handleStepClickCallback = useCallback((trackId: number, stepIndex: number) => {
        handleStepClick(trackId, stepIndex);
    }, [handleStepClick]);

    return (
        <div className={`flex items-stretch space-x-2 border-b border-neutral-700/50 last:border-b-0 ${isDisabled ? 'opacity-50' : ''}`}>
            <div className={`w-32 flex-shrink-0 flex items-center justify-between transition-all duration-150 ${isDisabled ? 'pointer-events-none' : ''}`}>
                <TrackHeader track={track} isSelected={isSelected} isAudible={isAudible} className="!h-full !border-b-0" />
            </div>
            <div className={`flex-grow grid grid-cols-16 gap-1 py-0.5 ${isDisabled ? 'pointer-events-none' : ''}`}>
                {stepsForTrack.slice(currentPage * 16, (currentPage + 1) * 16).map((step, i) => {
                    const stepIndexOnPage = i;
                    const groupIndex = Math.floor(stepIndexOnPage / 4);
                    const isDarkGroup = groupIndex % 2 !== 0;
                    const stepIndex = i + (currentPage * 16);
                    const isSelectedForPLock = selectedPLockStep?.trackId === track.id && selectedPLockStep?.stepIndex === stepIndex;
                    const isCurrent = currentStep === stepIndex;

                    let borderClass = 'border-l ';
                    if (stepIndex % 16 === 0) {
                        borderClass += 'border-neutral-500'; // Bar line
                    } else if (stepIndex % 4 === 0) {
                        borderClass += 'border-neutral-600'; // Beat line
                    } else {
                        borderClass += 'border-neutral-700/60'; // 16th line
                    }

                    return (
                        <div
                            className={`aspect-[3/2] ${borderClass}`}
                            key={`${track.id}-${stepIndex}`}
                        >
                            <StepButton
                                step={step}
                                stepIndex={stepIndex}
                                patternLength={track.patternLength}
                                isSelectedForPLock={isSelectedForPLock}
                                onClick={() => handleStepClickCallback(track.id, stepIndex)}
                                mapInfo={{ path: `sequencer.step.${track.id}.${stepIndex}`, label: `T${track.id + 1} Step ${stepIndex + 1}` }}
                                isDarkGroup={isDarkGroup}
                                defaultNote={track.defaultNote}
                                isCurrent={isCurrent}
                                disabled={isDisabled}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});


const SequencerComponent: React.FC = () => {
  const { 
    tracks, selectedTrackId, mutedTracks, soloedTrackId, 
    isPLockModeActive, selectedPLockStep, centerView, euclideanMode, copiedPattern, isViewerMode, isSpectator,
    sequencerPage,
    // Actions
    handleStepClick, togglePLockMode, selectPattern, setPatternLength,
    setStepProperty, randomizeTrackPattern, startEuclideanMode,
    clearTrackPattern,
    clearAutomation, toggleCenterView, updateEuclidean, applyEuclidean, cancelEuclidean,
    setParam, setTrackPan, setFxSend, copyPattern, pastePattern, triggerViewerModeInteraction,
    setSequencerPage,
  } = useStore(state => ({
    tracks: state.preset?.tracks || [],
    selectedTrackId: state.selectedTrackId,
    mutedTracks: state.mutedTracks,
    soloedTrackId: state.soloedTrackId,
    isPLockModeActive: state.isPLockModeActive,
    selectedPLockStep: state.selectedPLockStep,
    centerView: state.centerView,
    euclideanMode: state.euclideanMode,
    copiedPattern: state.copiedPattern,
    isViewerMode: state.isViewerMode,
    isSpectator: state.isSpectator,
    sequencerPage: state.sequencerPage,
    handleStepClick: state.handleStepClick,
    togglePLockMode: state.togglePLockMode,
    selectTrack: state.selectTrack,
    selectPattern: state.selectPattern,
    setPatternLength: state.setPatternLength,
    setStepProperty: state.setStepProperty,
    randomizeTrackPattern: state.randomizeTrackPattern,
    startEuclideanMode: state.startEuclideanMode,
    clearTrackPattern: state.clearTrackPattern,
    clearAutomation: state.clearAutomation,
    toggleCenterView: state.toggleCenterView,
    updateEuclidean: state.updateEuclidean,
    applyEuclidean: state.applyEuclidean,
    cancelEuclidean: state.cancelEuclidean,
    setParam: state.setParam,
    setTrackPan: state.setTrackPan,
    setFxSend: state.setFxSend,
    copyPattern: state.copyPattern,
    pastePattern: state.pastePattern,
    triggerViewerModeInteraction: state.triggerViewerModeInteraction,
    setSequencerPage: state.setSequencerPage,
  }), shallow);

  const currentStep = usePlaybackStore(state => state.currentStep);
  
  const [isPatternSelectorOpen, setIsPatternSelectorOpen] = useState(false);
  const patternSelectorRef = useRef<HTMLDivElement>(null);
  
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  
  const pLockTrack = selectedPLockStep ? tracks.find(t => t.id === selectedPLockStep.trackId) : null;
  const pLockStepState = pLockTrack ? pLockTrack.patterns[pLockTrack.activePatternIndex][selectedPLockStep.stepIndex] : null;
  
  const globalCurrentPage = Math.floor(currentStep / 16);

    const numPages = useMemo(() => {
        if (!selectedTrack) return 1;
        return Math.ceil(selectedTrack.patternLength / 16);
    }, [selectedTrack?.patternLength]);

    useEffect(() => {
        if (sequencerPage >= numPages) {
            setSequencerPage(Math.max(0, numPages - 1));
        }
    }, [numPages, sequencerPage, setSequencerPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patternSelectorRef.current && !patternSelectorRef.current.contains(event.target as Node)) {
        setIsPatternSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedTrack) return null;
  
  const activePattern = selectedTrack.patterns[selectedTrack.activePatternIndex];

  const isMelodic = !['kick', 'hat'].includes(selectedTrack.type);

  const handleClearNoteLock = useCallback(() => {
      if (selectedPLockStep) {
          setStepProperty(selectedPLockStep.trackId, selectedPLockStep.stepIndex, 'notes', []);
      }
  }, [selectedPLockStep, setStepProperty]);
  
  const handlePatternChange = (index: number) => {
      const { currentPlayheadTime } = usePlaybackStore.getState();
      selectPattern(selectedTrackId, index, currentPlayheadTime);
      setIsPatternSelectorOpen(false);
  };

  const currentCondition = pLockStepState?.condition ?? { type: 'always' };
  const currentConditionString = JSON.stringify(currentCondition);
  const conditionOptions = TRIG_CONDITIONS.map(c => ({ label: c.label, value: JSON.stringify(c.value) }));

  // Performance: Memoize callbacks for knobs
  const handlePLockConditionChange = useCallback((v: string) => {
      if(selectedPLockStep) setStepProperty(selectedPLockStep.trackId, selectedPLockStep.stepIndex, 'condition', JSON.parse(v))
  }, [selectedPLockStep, setStepProperty]);
  const handlePLockNoteChange = useCallback((v: number) => {
      if(selectedPLockStep) setStepProperty(selectedPLockStep.trackId, selectedPLockStep.stepIndex, 'notes', [midiToNoteName(v)])
  }, [selectedPLockStep, setStepProperty]);
  const handlePLockVelocityChange = useCallback((v: number) => {
      if(selectedPLockStep) setStepProperty(selectedPLockStep.trackId, selectedPLockStep.stepIndex, 'velocity', v)
  }, [selectedPLockStep, setStepProperty]);
  const handlePLockDecayChange = useCallback((v: number) => setParam('ampEnv.decay', v), [setParam]);
  const handlePLockCutoffChange = useCallback((v: number) => setParam('filter.cutoff', v), [setParam]);
  const handlePLockResoChange = useCallback((v: number) => setParam('filter.resonance', v), [setParam]);
  const handlePLockPanChange = useCallback((v: number) => {
    if(pLockTrack) setTrackPan(pLockTrack.id, v)
  }, [pLockTrack, setTrackPan]);
  const handlePLockReverbChange = useCallback((v: number) => {
    if(pLockTrack) setFxSend(pLockTrack.id, 'reverb', v)
  }, [pLockTrack, setFxSend]);
  const handlePatternLengthChange = useCallback((v: number) => setPatternLength(selectedTrackId, v), [selectedTrackId, setPatternLength]);

  return (
    <div className="h-full flex flex-col space-y-2">
        {/* Toolbar */}
        <div className="flex flex-wrap justify-between items-center bg-[var(--bg-panel-dark)] p-2 rounded border border-[var(--border-color)] flex-shrink-0 gap-2">
            <div className='flex items-center space-x-2 justify-start'>
                 <button
                    onClick={toggleCenterView}
                    disabled={!isMelodic}
                    title="Toggle Piano Roll"
                    className={`hidden md:flex items-center justify-center px-2 py-1.5 text-xs font-bold rounded-sm border transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                        centerView === 'pianoRoll' && isMelodic
                        ? 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                        : 'bg-[var(--bg-control)] hover:bg-[var(--border-color)] border-[var(--border-color)]'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 18v-12h18v12H3z"/>
                        <path d="M3 9h18"/>
                        <path d="M7 18v-9"/>
                        <path d="M12 18v-9"/>
                        <path d="M17 18v-9"/>
                    </svg>
                </button>
                <button onClick={() => randomizeTrackPattern(selectedTrackId)} title="Randomize Pattern" className="px-2 py-1.5 rounded-sm bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors text-[var(--text-light)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"></circle>
                        <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"></circle>
                        <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"></circle>
                        <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"></circle>
                    </svg>
                </button>
                 <button 
                    onClick={() => startEuclideanMode(selectedTrackId)} 
                    title="Generate Euclidean Rhythm" 
                    className={`px-2 py-1.5 rounded-sm border transition-colors text-[var(--text-light)] ${
                        euclideanMode ? 'bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.7)]' : 'bg-[var(--bg-control)] hover:bg-[var(--border-color)] border-[var(--border-color)]'
                    }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" strokeOpacity="0.5"></circle>
                        <circle cx="12" cy="3" r="1.5" fill="currentColor"></circle>
                        <circle cx="20.3" cy="12" r="1.5" fill="currentColor"></circle>
                        <circle cx="3.7" cy="12" r="1.5" fill="currentColor"></circle>
                        <circle cx="7.5" cy="19.1" r="1.5" fill="currentColor"></circle>
                        <circle cx="16.5" cy="19.1" r="1.5" fill="currentColor"></circle>
                    </svg>
                </button>
            </div>
            <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-2">
                <div className='flex items-center space-x-2'>
                    <span className="text-xs text-[var(--text-muted)] font-mono">PATTERN</span>
                    <div ref={patternSelectorRef} className='relative flex items-center bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm h-6'>
                        <button
                            onClick={() => handlePatternChange((selectedTrack.activePatternIndex - 1 + 8) % 8)}
                            className="px-2 h-full text-xs font-bold text-neutral-400 hover:bg-[var(--border-color-light)] transition-colors rounded-l-sm"
                            aria-label="Previous Pattern"
                        >
                            {'<'}
                        </button>
                        <button onClick={() => setIsPatternSelectorOpen(p => !p)} className="px-3 flex items-center justify-center h-full text-sm font-bold bg-black/20 text-center w-10 text-[var(--accent-color)]">
                            {selectedTrack.activePatternIndex + 1}
                        </button>
                        <button
                            onClick={() => handlePatternChange((selectedTrack.activePatternIndex + 1) % 8)}
                            className="px-2 h-full text-xs font-bold text-neutral-400 hover:bg-[var(--border-color-light)] transition-colors rounded-r-sm"
                            aria-label="Next Pattern"
                        >
                            {'>'}
                        </button>
                        {isPatternSelectorOpen && (
                            <div className="absolute top-full mt-2 right-0 bg-[var(--bg-panel-dark)] border border-[var(--border-color)] rounded-md p-2 shadow-lg z-20 grid grid-cols-4 gap-1 w-[180px]">
                                {selectedTrack.patterns.map((pattern, i) => {
                                    const hasData = pattern.some(step => step.active);
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => handlePatternChange(i)}
                                            className={`relative h-10 rounded-sm text-xs font-bold transition-colors border ${
                                                i === selectedTrack.activePatternIndex 
                                                ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)]'
                                                : 'bg-[var(--bg-control)] border-[var(--border-color)] hover:bg-[var(--border-color-light)]'
                                            }`}
                                        >
                                            {i + 1}
                                            {hasData && <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={copyPattern} 
                        title="Copy current pattern (Ctrl+Shift+C)"
                        className="h-6 px-2 text-[9px] font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 transition-colors text-white"
                    >
                        COPY
                    </button>
                    <button 
                        onClick={pastePattern} 
                        title="Paste copied pattern into current slot (Ctrl+Shift+V)"
                        disabled={!copiedPattern}
                        className="h-6 px-2 text-[9px] font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        PASTE
                    </button>
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
            </div>
            <div className="hidden sm:flex items-center space-x-1">
                 <button onClick={() => clearAutomation(selectedTrackId)} className="h-6 px-2 text-[9px] font-bold rounded-sm bg-blue-800 hover:bg-blue-700 border border-blue-900 transition-colors text-white" title="Clear Automation for selected track">AUTOM</button>
                 <button onClick={() => clearTrackPattern(selectedTrackId)} className="h-6 px-2 text-[9px] font-bold rounded-sm bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors text-[var(--text-light)]" title="Clear Current Pattern">CLEAR</button>
            </div>
        </div>
        
        {/* Main Grid Area */}
        <div className="flex-grow min-h-0 flex flex-col overflow-auto no-scrollbar bg-[var(--bg-chassis)] p-2 rounded-md border border-[var(--border-color)]" data-tour-id="sequencer-grid">
            {tracks.map(track => {
                const isSelected = track.id === selectedTrackId;
                const isMuted = mutedTracks.includes(track.id);
                const isSoloed = soloedTrackId === track.id;
                const isAudible = soloedTrackId === null ? !isMuted : isSoloed;
                const isDisabled = isSpectator || (isViewerMode && track.id >= 3);
                
                return (
                    <TrackRow
                        key={track.id}
                        track={track}
                        currentPage={sequencerPage}
                        isSelected={isSelected}
                        isAudible={isAudible}
                        isDisabled={isDisabled}
                    />
                );
            })}
        </div>


        {/* P-Lock Bar */}
        <div className="flex flex-wrap justify-between items-center bg-[var(--bg-panel-dark)] p-1 rounded border border-[var(--border-color)] flex-shrink-0 gap-1">
             {euclideanMode && euclideanMode.trackId === selectedTrackId ? (
                <div className="flex items-center space-x-2 w-full animate-fade-in px-2">
                    <span className="text-sm font-bold text-purple-400 animate-pulse">EUCLIDEAN MODE</span>
                    <Knob
                        label="PULSES" value={euclideanMode.pulses} min={0} max={euclideanMode.steps} step={1}
                        onChange={(v) => updateEuclidean({ pulses: v })} size={40} className="flex-shrink-0"
                    />
                    <Knob
                        label="STEPS" value={euclideanMode.steps} min={1} max={64} step={1}
                        onChange={(v) => updateEuclidean({ steps: v, pulses: euclideanMode.pulses > v ? v : euclideanMode.pulses })} size={40} className="flex-shrink-0"
                    />
                    <Knob
                        label="ROTATE" value={euclideanMode.rotation} min={0} max={euclideanMode.steps > 1 ? euclideanMode.steps - 1 : 0} step={1}
                        onChange={(v) => updateEuclidean({ rotation: v })} size={40} className="flex-shrink-0"
                    />
                    <div className="flex-grow" />
                    <button onClick={cancelEuclidean} className="h-9 px-4 text-xs font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 transition-colors text-white">CANCEL</button>
                    <button onClick={applyEuclidean} className="h-9 px-4 text-xs font-bold rounded-sm bg-purple-600 hover:bg-purple-500 border border-purple-500 transition-colors text-white">APPLY</button>
                </div>
            ) : (
                <div className="flex items-center space-x-4 flex-grow w-full p-1 min-w-0">
                    <div className="flex items-end space-x-2 flex-shrink-0">
                        <button 
                            onClick={togglePLockMode} 
                            className={`flex items-center justify-center h-9 px-4 text-xs font-bold rounded-sm border transition-all text-white ${isPLockModeActive ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'bg-[var(--bg-control)] hover:bg-[var(--border-color)] border-[var(--border-color)]'}`}
                        >
                            P-LOCK
                        </button>
                        <Knob 
                            label="LENGTH" value={selectedTrack?.patternLength || 16} min={1} max={64} step={1}
                            onChange={handlePatternLengthChange} size={40} className="flex-shrink-0"
                            mapInfo={{ path: `tracks.${selectedTrackId}.patternLength`, label: `T${selectedTrackId+1} Length` }}
                            onDisabledClick={triggerViewerModeInteraction}
                        />
                    </div>
                    
                    {selectedPLockStep && pLockTrack && pLockStepState ? (
                        <div className="flex-grow flex items-center justify-start gap-x-3 overflow-x-auto no-scrollbar py-1 min-w-0">
                            <div className="flex flex-col items-center justify-center bg-black/30 rounded p-1 flex-shrink-0">
                                <div className="text-xs text-cyan-300 font-mono">STEP {selectedPLockStep.stepIndex + 1}</div>
                                <Selector
                                    label="CONDITION"
                                    value={currentConditionString}
                                    options={conditionOptions}
                                    onChange={handlePLockConditionChange}
                                    isPLocked={currentCondition.type !== 'always'}
                                />
                            </div>
                            <div className="flex items-end gap-1 flex-shrink-0">
                                <Knob label="NOTE" value={pLockStepState?.notes?.[0] ? noteNameToMidi(pLockStepState.notes[0]) : noteNameToMidi(pLockTrack?.defaultNote ?? 'C4')} min={0} max={127} step={1} onChange={handlePLockNoteChange} size={40} displayTransform={v => midiToNoteName(v)} isPLocked={(pLockStepState?.notes?.length ?? 0) > 0} />
                                <button onClick={handleClearNoteLock} className="h-6 px-1.5 text-[8px] font-bold rounded-sm bg-red-800 hover:bg-red-700 border border-red-900 transition-colors text-white mb-1" title="Clear Note P-Lock">CLR</button>
                            </div>
                            <Knob label="VELOCITY" value={pLockStepState?.velocity ?? 1.0} min={0.01} max={1} step={0.01} onChange={handlePLockVelocityChange} size={40} isPLocked={pLockStepState?.velocity !== 1.0} className="flex-shrink-0" />
                            {pLockTrack.type !== 'midi' && (
                                <>
                                    <Knob label="DECAY" value={getParamValue(pLockTrack, pLockStepState.pLocks, 'ampEnv.decay')} min={0.01} max={4} step={0.01} onChange={handlePLockDecayChange} size={40} isPLocked={isParamLocked(pLockTrack, pLockStepState.pLocks, 'ampEnv.decay')} className="flex-shrink-0" />
                                    <Knob label="CUTOFF" value={getParamValue(pLockTrack, pLockStepState.pLocks, 'filter.cutoff')} min={20} max={20000} onChange={handlePLockCutoffChange} size={40} isPLocked={isParamLocked(pLockTrack, pLockStepState.pLocks, 'filter.cutoff')} className="flex-shrink-0" />
                                    <Knob label="RESO" value={getParamValue(pLockTrack, pLockStepState.pLocks, 'filter.resonance')} min={0.1} max={30} step={0.1} onChange={handlePLockResoChange} size={40} isPLocked={isParamLocked(pLockTrack, pLockStepState.pLocks, 'filter.resonance')} className="flex-shrink-0" />
                                    <Knob label="PAN" value={getTrackValue(pLockTrack, pLockStepState.pLocks, 'pan')} min={-1} max={1} step={0.01} onChange={handlePLockPanChange} size={40} isPLocked={isTrackValueLocked(pLockStepState.pLocks, 'pan')} displayTransform={v => { const p = Math.round(v * 100); return p === 0 ? 'C' : p < 0 ? `${Math.abs(p)}L` : `${p}R`; }} className="flex-shrink-0" />
                                    <Knob label="REVERB" value={getSendValue(pLockTrack, pLockStepState.pLocks, 'reverb')} min={0} max={1} step={0.01} onChange={handlePLockReverbChange} size={40} isPLocked={isSendLocked(pLockStepState.pLocks, 'reverb')} className="flex-shrink-0" />
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex-grow text-center text-xs text-[var(--text-muted)] font-mono self-center px-4">
                            {isPLockModeActive ? 'SELECT A STEP TO EDIT PARAMETER LOCKS' : 'ENABLE P-LOCK MODE TO EDIT INDIVIDUAL STEPS'}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export const Sequencer = React.memo(SequencerComponent);
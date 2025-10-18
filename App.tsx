import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useStore } from './store/store';
import { usePlaybackStore } from './store/playbackStore';
import { Sequencer } from './components/Sequencer';
import InstrumentEditor from './components/InstrumentEditor';
import EffectsRack from './components/EffectsRack';
import Mixer from './components/Mixer';
import PresetManager from './components/PresetManager';
import ExportManager from './components/ExportManager';
import Store from './components/Store';
import { PianoRoll } from './components/PianoRoll';
import ArrangementView from './components/ArrangementView';
import SettingsModal from './components/SettingsModal';
import WelcomeScreen from './components/WelcomeScreen';
import QuickStartGuide from './components/QuickStartGuide';
import Manual from './components/Manual';
import { NotificationSystem } from './components/NotificationSystem';
import { MidiContext, MidiContextProvider, useMidiMapping } from './contexts/MidiContext';
import VUMeter from './components/VUMeter';
import PresetDisplay from './components/PresetDisplay';
import { APPEARANCE_THEMES, ACCENT_THEMES, applyTheme } from './themes';
import { shallow } from 'zustand/shallow';
import LicenseModal from './components/LicenseModal';
import ShareJamModal from './components/ShareJamModal';

const AppLogo: React.FC = () => (
    <div className="flex items-center group">
        <svg width="48" height="42" viewBox="0 0 52 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3 flex-shrink-0">
            <defs>
                <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                 </filter>
                 <filter id="logoGlowHover" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                 </filter>
            </defs>
            <g className="group-hover:scale-105 transition-transform" style={{ animation: 'logo-breathe 4s ease-in-out infinite' }}>
                <path d="M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z" stroke="var(--accent-color)" strokeWidth="2.5" strokeLinejoin="round" fill="var(--bg-panel-dark)" />
                <path d="M26 13L13 20V32L26 39L39 32V20L26 13Z" stroke="var(--accent-color)" strokeWidth="1.5" strokeOpacity="0.5" />
                <path d="M1 13.5L26 24.5L51 13.5" stroke="var(--accent-color)" strokeWidth="1" strokeOpacity="0.4" />
                <path d="M26 48V24.5" stroke="var(--accent-color)" strokeWidth="1" strokeOpacity="0.4" />
            </g>
        </svg>
         <div>
            <h1 className="text-2xl font-bold uppercase tracking-tighter" style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.1)' }}>FM8/R</h1>
            <p className="text-[9px] uppercase tracking-widest text-neutral-400 -mt-1.5 font-mono">Another Groovebox</p>
        </div>
    </div>
);

const ManualIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <svg onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
         className="cursor-pointer text-neutral-400 hover:text-white transition-colors"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
         aria-label="Open manual">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);


const SettingsIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <svg onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
         className="cursor-pointer text-neutral-400 hover:text-white transition-colors"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
         aria-label="Open settings">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

const FullscreenIcon: React.FC = () => {
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    return (
        <svg onClick={toggleFullscreen} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="cursor-pointer text-neutral-400 hover:text-white transition-colors"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}>
            {isFullscreen ? (
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            ) : (
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            )}
        </svg>
    );
};

const MappableButton: React.FC<{
    onClick: (e: React.MouseEvent) => void;
    mapInfo: { path: string; label: string; };
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    isActive?: boolean;
}> = ({ onClick, mapInfo, children, className, disabled, isActive }) => {
    const { isLearning, learningTarget, mapTarget } = useMidiMapping();
    const isSelectedTarget = isLearning && learningTarget?.path === mapInfo.path;

    const handleClick = (e: React.MouseEvent) => {
        if (isLearning) {
            e.stopPropagation();
            mapTarget({ ...mapInfo, type: 'button' });
        } else {
            onClick(e);
        }
    }

    return (
        <button onClick={handleClick} disabled={disabled} className={`relative ${className} ${isActive ? 'bg-cyan-500 border-cyan-400 text-white' : 'bg-neutral-700 border-neutral-600 text-neutral-300'}`}>
            {isLearning && (
                <div className={`absolute inset-0 z-10 cursor-pointer transition-colors ${isSelectedTarget ? 'bg-cyan-500/60 animate-pulse-glow' : 'hover:bg-cyan-500/20'}`} />
            )}
            {children}
        </button>
    );
};

const TransportControls: React.FC = () => {
  const { mainView, setMainView, midiSyncSource, isAudioReady, isViewerMode, triggerViewerModeInteraction } = useStore(state => ({
    mainView: state.mainView,
    setMainView: state.setMainView,
    midiSyncSource: state.midiSyncSource,
    isAudioReady: state.isAudioReady,
    isViewerMode: state.isViewerMode,
    triggerViewerModeInteraction: state.triggerViewerModeInteraction,
  }), shallow);
  const { isPlaying, togglePlay, stop } = usePlaybackStore(state => ({
      isPlaying: state.isPlaying,
      togglePlay: state.togglePlay,
      stop: state.stop
  }), shallow);

  const isExternalSync = midiSyncSource !== 'internal';

  return (
    <div className="flex items-center space-x-2">
      <MappableButton 
        onClick={() => setMainView('pattern')} 
        mapInfo={{ path: 'transport.view.pattern', label: 'Pattern View' }}
        className="px-3 py-1 text-xs font-bold rounded-sm border"
        isActive={mainView === 'pattern'}
      >
        PATTERN
      </MappableButton>
       <MappableButton
        onClick={() => {
            if (isViewerMode) {
                triggerViewerModeInteraction();
            } else {
                setMainView('song');
            }
        }} 
        mapInfo={{ path: 'transport.view.song', label: 'Song View' }}
        className={`px-3 py-1 text-xs font-bold rounded-sm border ${isViewerMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        isActive={mainView === 'song'}
        disabled={isViewerMode}
      >
        SONG
      </MappableButton>

      <div className="w-px h-6 bg-neutral-700 mx-2" />
      
      <MappableButton onClick={stop} disabled={isExternalSync || !isAudioReady} className="px-3 py-2 rounded-sm bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed" mapInfo={{ path: 'transport.stop', label: 'Stop' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
      </MappableButton>
       <MappableButton onClick={togglePlay} disabled={isExternalSync || !isAudioReady} className={`px-3 py-2 rounded-sm bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isPlaying ? 'animate-play-pulse' : ''}`} mapInfo={{ path: 'transport.play', label: 'Play/Pause' }}>
        {isPlaying ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
      </MappableButton>
    </div>
  );
};


const CenterPanel: React.FC = () => {
  const { centerView, selectedTrack } = useStore(state => ({
    centerView: state.centerView,
    selectedTrack: state.preset?.tracks?.find(t => t.id === state.selectedTrackId)
  }), shallow);

  const isMelodic = useMemo(() => {
    if (!selectedTrack) return false;
    // Check against all non-percussive new engines
    return !['kick', 'hat', 'midi'].includes(selectedTrack.type);
  }, [selectedTrack]);

  return (
    <div className="bg-[var(--bg-panel)] rounded-md border border-[var(--border-color)]/50 flex-grow flex flex-col min-h-0 h-full">
      {centerView === 'pianoRoll' && isMelodic ? <PianoRoll /> : <Mixer />}
    </div>
  );
};

const AppContent: React.FC = () => {
    const {
        init, mainView,
        showWelcomeScreen, hideWelcomeScreen, showQuickStart, toggleQuickStart,
        isPresetManagerOpen, togglePresetManager, isExportModalOpen, toggleExportModal,
        isStoreOpen, toggleStore, isSettingsModalOpen, toggleSettingsModal,
        isManualOpen, toggleManual,
        handleMidiMessage,
        appearanceTheme, setAppearanceTheme, accentTheme, setAccentTheme,
        isExporting, exportProgress, isShareJamOpen, toggleShareJamModal,
        setMidiOutputs, selectedPLockStep, copyStep, pasteStep, copyPattern, pastePattern,
        audioEngineInstanceId, setAudioOutputDevices, isViewerMode, toggleLicenseModal,
        isLicenseModalOpen
    } = useStore(state => ({
        init: state.init,
        mainView: state.mainView,
        showWelcomeScreen: state.showWelcomeScreen,
        hideWelcomeScreen: state.hideWelcomeScreen,
        showQuickStart: state.showQuickStart,
        toggleQuickStart: state.toggleQuickStart,
        isPresetManagerOpen: state.isPresetManagerOpen,
        togglePresetManager: state.togglePresetManager,
        isExportModalOpen: state.isExportModalOpen,
        toggleExportModal: state.toggleExportModal,
        isStoreOpen: state.isStoreOpen,
        toggleStore: state.toggleStore,
        isSettingsModalOpen: state.isSettingsModalOpen,
        toggleSettingsModal: state.toggleSettingsModal,
        isManualOpen: state.isManualOpen,
        toggleManual: state.toggleManual,
        handleMidiMessage: state.handleMidiMessage,
        appearanceTheme: state.appearanceTheme,
        setAppearanceTheme: state.setAppearanceTheme,
        accentTheme: state.accentTheme,
        setAccentTheme: state.setAccentTheme,
        isExporting: state.isExporting,
        exportProgress: state.exportProgress,
        isShareJamOpen: state.isShareJamOpen,
        toggleShareJamModal: state.toggleShareJamModal,
        setMidiOutputs: state.setMidiOutputs,
        selectedPLockStep: state.selectedPLockStep,
        copyStep: state.copyStep,
        pasteStep: state.pasteStep,
        copyPattern: state.copyPattern,
        pastePattern: state.pastePattern,
        audioEngineInstanceId: state.audioEngineInstanceId,
        setAudioOutputDevices: state.setAudioOutputDevices,
        isViewerMode: state.isViewerMode,
        toggleLicenseModal: state.toggleLicenseModal,
        isLicenseModalOpen: state.isLicenseModalOpen,
    }), shallow);
    
    const midiContext = React.useContext(MidiContext);
    const togglePlay = usePlaybackStore(state => state.togglePlay);

    useEffect(() => { init(); }, [init]);

    useEffect(() => {
        const getDevices = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                try {
                    // Request permission first, if not already granted. This helps get device labels.
                    await navigator.mediaDevices.getUserMedia({ audio: true }); 
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const audioOutputs = devices
                        .filter(device => device.kind === 'audiooutput')
                        .map(device => ({ deviceId: device.deviceId, label: device.label || `Output ${device.deviceId.substring(0, 8)}` }));
                    setAudioOutputDevices(audioOutputs);
                } catch (err) {
                    console.warn('Could not get audio devices. Output selection will be unavailable.', err);
                }
            }
        };
        getDevices();
    }, [setAudioOutputDevices]);


    useEffect(() => {
        if (midiContext?.outputs) {
            setMidiOutputs(midiContext.outputs);
        }
    }, [midiContext?.outputs, setMidiOutputs, audioEngineInstanceId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if typing in an input, textarea, or select
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
                return; // Prevent other shortcuts from firing with space
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.shiftKey && !selectedPLockStep) { // Pattern copy/paste
                    if (e.key.toLowerCase() === 'c') {
                        e.preventDefault();
                        copyPattern();
                    } else if (e.key.toLowerCase() === 'v') {
                        e.preventDefault();
                        pastePattern();
                    }
                } else if (selectedPLockStep) { // Step copy/paste
                    if (e.key.toLowerCase() === 'c') {
                        e.preventDefault();
                        copyStep(selectedPLockStep.trackId, selectedPLockStep.stepIndex);
                    } else if (e.key.toLowerCase() === 'v') {
                        e.preventDefault();
                        pasteStep(selectedPLockStep.trackId, selectedPLockStep.stepIndex);
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPLockStep, copyStep, pasteStep, copyPattern, pastePattern, togglePlay]);

    useEffect(() => {
        applyTheme(appearanceTheme as any);
    }, [appearanceTheme]);

    useEffect(() => {
        const activeAccentTheme = ACCENT_THEMES[accentTheme as keyof typeof ACCENT_THEMES] as any;
        if (activeAccentTheme) {
            const root = document.body;
            root.style.setProperty('--accent-color', activeAccentTheme['--accent-color']);
            root.style.setProperty('--accent-color-active', activeAccentTheme['--accent-color-active']);
            if (activeAccentTheme['--accent-rgb']) {
                root.style.setProperty('--accent-rgb', activeAccentTheme['--accent-rgb']);
            }
        }
    }, [accentTheme]);

    return (
    <>
        {showWelcomeScreen && <WelcomeScreen onStart={hideWelcomeScreen} />}
        {showQuickStart && <QuickStartGuide onFinish={() => toggleQuickStart(false)} />}
        {isPresetManagerOpen && <PresetManager />}
        {isExportModalOpen && <ExportManager />}
        {isStoreOpen && <Store />}
        {isSettingsModalOpen && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => toggleSettingsModal(false)} appearanceThemes={APPEARANCE_THEMES} activeAppearanceTheme={appearanceTheme} onAppearanceThemeChange={setAppearanceTheme} accentThemes={ACCENT_THEMES} activeAccentTheme={accentTheme} onAccentThemeChange={setAccentTheme} />}
        {isLicenseModalOpen && <LicenseModal />}
        {isShareJamOpen && <ShareJamModal />}
        {isManualOpen && <Manual />}
        
        <NotificationSystem />

        <div className="flex flex-col h-screen bg-black text-white font-sans antialiased overflow-hidden">
             <header className="flex-shrink-0 flex items-center justify-between p-2 border-b border-[var(--border-color)] bg-[var(--bg-panel-dark)] gap-4">
                <AppLogo />
                <div className="flex items-center gap-4">
                    <TransportControls />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">MASTER</span>
                        <VUMeter />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <PresetDisplay 
                        onProjectNameClick={() => togglePresetManager(true)}
                    />
                    {isViewerMode ? (
                         <button
                            onClick={() => toggleLicenseModal(true)}
                            className="px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-sm border border-yellow-500 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500 hover:text-[var(--text-dark)] transition-all duration-200 animate-pulse-glow"
                        >
                            UNLOCK FULL VERSION
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => toggleStore(true)}
                                className="px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-sm border border-cyan-500 bg-transparent text-cyan-400 hover:bg-cyan-500 hover:text-[var(--text-dark)] transition-all duration-200 shadow-[0_0_10px_rgba(0,216,255,0.3)] hover:shadow-[0_0_15px_rgba(0,216,255,0.6)]"
                            >
                                Store
                            </button>
                            <button
                                onClick={() => toggleShareJamModal(true)}
                                className="px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-sm border border-purple-500 bg-transparent text-purple-400 hover:bg-purple-500 hover:text-[var(--text-dark)] transition-all duration-200 shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                            >
                                Share Jam
                            </button>
                            <button
                                onClick={() => toggleExportModal(true)}
                                className="px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-sm border border-[var(--accent-color)] bg-transparent text-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-[var(--text-dark)] transition-all duration-200 shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.6)]"
                            >
                                Export
                            </button>
                        </>
                    )}
                    <div className="flex items-center gap-3">
                        <ManualIcon onClick={() => toggleManual(true)} />
                        <SettingsIcon onClick={() => toggleSettingsModal(true)} />
                        <FullscreenIcon />
                    </div>
                </div>
            </header>

            <main className="flex-grow flex gap-2 p-2 min-h-0">
                <div className="w-1/4 min-w-[350px] max-w-[450px] flex flex-col">
                    <InstrumentEditor />
                </div>
                <div className="flex-grow flex flex-col gap-2 min-h-0 min-w-0">
                    <div className="h-3/5 min-h-0">
                        {mainView === 'pattern' ? <Sequencer /> : <ArrangementView />}
                    </div>
                    <div className="h-2/5 flex-shrink-0 min-h-[280px]" data-tour-id="mixer-pianoroll">
                        <CenterPanel />
                    </div>
                </div>
                <div className="w-1/5 min-w-[280px] max-w-[350px]" data-tour-id="effects-rack">
                    <EffectsRack />
                </div>
            </main>
        </div>
        
        {isExporting && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-[var(--bg-panel)] p-8 rounded-lg border border-[var(--border-color)] text-center">
                    <p className="text-lg font-bold mb-2">Exporting Audio...</p>
                    <p className="text-sm text-neutral-400">{exportProgress}</p>
                </div>
            </div>
        )}
    </>
    );
};

const App: React.FC = () => {
    return (
        <MidiContextProvider>
            <AppContent />
        </MidiContextProvider>
    );
}


export default App;
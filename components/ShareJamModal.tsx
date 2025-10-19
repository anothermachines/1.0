import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';
import Visualizer from './Visualizer';
import { usePlaybackStore } from '../store/playbackStore';
import { AudioEngine } from '../audioEngine';
import { downloadBlob } from '../utils';

const COLOR_PALETTES = [
    ['#a855f7', '#06b6d4', '#ec4899'], // Purple, Cyan, Pink
    ['#f59e0b', '#ef4444', '#fde047'], // Amber, Red, Yellow
    ['#22c55e', '#818cf8', '#38bdf8'], // Green, Indigo, Sky
    ['#ec4899', '#f97316', '#d946ef'], // Pink, Orange, Fuchsia
    ['#00FF7F', '#8A2BE2', '#FFD700'], // SpringGreen, BlueViolet, Gold
];

// All available visualizer modes
const VISUALIZER_MODES = ['hud', 'galaxy', 'spectrum', 'waveform', 'vectorscope', 'strobe'];
const VISUALIZER_MODE_NAMES: Record<string, string> = {
    hud: 'HUD',
    galaxy: 'Galaxy',
    spectrum: 'Spectrum',
    waveform: 'Waveform',
    vectorscope: 'Vectorscope',
    strobe: 'Strobe',
};


const ShareJamModal: React.FC = () => {
    const { preset, toggleShareJamModal, generateShareableLink, addNotification } = useStore(state => ({
        preset: state.preset,
        toggleShareJamModal: state.toggleShareJamModal,
        generateShareableLink: state.generateShareableLink,
        addNotification: state.addNotification,
    }), shallow);

    const [activeTab, setActiveTab] = useState<'record' | 'share'>('record');
    
    // Link Sharing State
    const [isLinkLoading, setIsLinkLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Video Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const audioPlayerNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const livePreviewSourceRef = useRef<GainNode | null>(null);
    
    const [palette, setPalette] = useState(COLOR_PALETTES[0]);
    const [mode, setMode] = useState(VISUALIZER_MODES[0]);

    // This effect runs once to set up a random style and the audio analyser
    useEffect(() => {
        // Select a random style each time the modal opens
        setPalette(COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]);
        setMode(VISUALIZER_MODES[Math.floor(Math.random() * VISUALIZER_MODES.length)]);

        const audioCtx = usePlaybackStore.getState().audioEngine?.getContext();
        const mainBus = usePlaybackStore.getState().audioEngine?.preCompressorBus;
        
        if (audioCtx && mainBus) {
            const analyser = audioCtx.createAnalyser();
            // Configure for high-resolution, professional spectrum analysis
            analyser.fftSize = 2048;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0.8;
            
            analyserNodeRef.current = analyser;
            
            // Connect to the main audio bus for live preview
            mainBus.connect(analyser);
            livePreviewSourceRef.current = mainBus;
        }

        return () => {
            // Cleanup on modal close
            if (audioPlayerNodeRef.current) {
                try {
                    audioPlayerNodeRef.current.stop();
                    audioPlayerNodeRef.current.disconnect();
                } catch(e) {}
            }
            if (livePreviewSourceRef.current && analyserNodeRef.current) {
                try {
                    livePreviewSourceRef.current.disconnect(analyserNodeRef.current);
                } catch (e) {}
            }
        };
    }, []);
    
    const handleGenerateLink = useCallback(async () => {
        setIsLinkLoading(true);
        setShareUrl('');
        try {
            const url = await generateShareableLink();
            setShareUrl(url);
        } catch (error) {
            console.error("Failed to generate share link:", error);
            addNotification({ type: 'error', message: 'Failed to generate share link.' });
        } finally {
            setIsLinkLoading(false);
        }
    }, [generateShareableLink, addNotification]);

    const handleCopy = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        }
    };
    
    const handleStartRecording = useCallback(async () => {
        const wasPlaying = usePlaybackStore.getState().isPlaying;
        if (wasPlaying) {
            usePlaybackStore.getState().stop();
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        setIsProcessing(true);
        setVideoUrl(null);
        recordedChunksRef.current = [];

        // Disconnect live preview to only hear the rendered audio
        if (livePreviewSourceRef.current && analyserNodeRef.current) {
            try {
                livePreviewSourceRef.current.disconnect(analyserNodeRef.current);
            } catch(e) {}
        }
        
        const { preset, mutedTracks, soloedTrackId } = useStore.getState();
        const secondsPerStep = (60.0 / preset.bpm) / 4.0;
        const duration = 64 * secondsPerStep;
        const sampleRate = 44100;
        const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
        const offlineEngine = new AudioEngine(offlineCtx);
        await offlineEngine.init();

        offlineEngine.createTrackChannels(preset.tracks);
        offlineEngine.updateBpm(preset.bpm);
        offlineEngine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
        offlineEngine.updateDelay(preset.globalFxParams.delay, preset.bpm);
        offlineEngine.updateDrive(preset.globalFxParams.drive);
        offlineEngine.updateCharacter(preset.globalFxParams.character);
        offlineEngine.updateMasterFilter(preset.globalFxParams.masterFilter);
        offlineEngine.updateCompressor(preset.globalFxParams.compressor);
        offlineEngine.updateMasterVolume(preset.globalFxParams.masterVolume);
        
        for (let i = 0; i < 64; i++) {
            const time = i * secondsPerStep;
            preset.tracks.forEach(track => {
                const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
                if (isAudible) {
                    const patternStepIndex = i % track.patternLength;
                    const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
                    offlineEngine.playStep(track, stepState, time, time, 0);
                }
            });
        }
        
        const audioBuffer = await offlineCtx.startRendering();
        
        setIsProcessing(false);
        setIsRecording(true);

        const canvas = visualizerCanvasRef.current;
        const audioContext = usePlaybackStore.getState().audioEngine!.getContext();
        
        if (!canvas || !analyserNodeRef.current || !audioContext) {
            addNotification({ type: 'error', message: 'Recording setup failed.' });
            setIsRecording(false);
            return;
        }

        const videoStream = canvas.captureStream(30);
        const audioDestination = audioContext.createMediaStreamDestination();
        
        audioPlayerNodeRef.current = audioContext.createBufferSource();
        audioPlayerNodeRef.current.buffer = audioBuffer;
        // The player node is now the *only* thing connected to the analyser
        audioPlayerNodeRef.current.connect(analyserNodeRef.current);
        // Also connect to destination to hear it while recording
        audioPlayerNodeRef.current.connect(audioContext.destination);
        
        const recordAudioSource = audioContext.createBufferSource();
        recordAudioSource.buffer = audioBuffer;
        recordAudioSource.connect(audioDestination);

        const combinedStream = new MediaStream([
            videoStream.getVideoTracks()[0],
            audioDestination.stream.getAudioTracks()[0]
        ]);
        
        mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9,opus' });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            setIsRecording(false);
            // Reconnect live preview
            if (livePreviewSourceRef.current && analyserNodeRef.current) {
                try {
                     livePreviewSourceRef.current.connect(analyserNodeRef.current);
                } catch(e) {}
            }
        };
        
        mediaRecorderRef.current.start();
        audioPlayerNodeRef.current.start();
        recordAudioSource.start();

        audioPlayerNodeRef.current.onended = () => {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [addNotification, preset]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (audioPlayerNodeRef.current) {
             try {
                audioPlayerNodeRef.current.stop();
             } catch(e) {}
        }
        setIsRecording(false);
    }, []);

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => toggleShareJamModal(false)}
        >
            <div 
                className="bg-gradient-to-br from-neutral-900 to-black w-full max-w-3xl rounded-lg border border-purple-400/30 shadow-2xl flex flex-col animate-slide-up" 
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slide-up 0.5s ease-out forwards, modal-glow 4s ease-in-out infinite' }}
            >
                <header className="flex justify-between items-center p-4 border-b border-purple-400/20 flex-shrink-0">
                    <h3 className="text-xl font-bold text-purple-300 uppercase tracking-widest">Share Jam</h3>
                    <div className="flex items-center space-x-2">
                        <div className="p-1 bg-black/30 rounded-md border border-neutral-700/80 flex items-center space-x-1">
                            <button onClick={() => setActiveTab('record')} className={`px-4 py-1 text-sm font-bold rounded transition-colors ${activeTab === 'record' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'}`}>Record Video</button>
                            <button onClick={() => setActiveTab('share')} className={`px-4 py-1 text-sm font-bold rounded transition-colors ${activeTab === 'share' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'}`}>Share Link</button>
                        </div>
                        <button onClick={() => toggleShareJamModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-neutral-800/50 hover:bg-neutral-700/80 border border-neutral-700 transition-colors" aria-label="Close">&times;</button>
                    </div>
                </header>

                <main className="flex-grow p-4 min-h-0">
                    {activeTab === 'record' ? (
                        <div className="flex flex-col items-center justify-center space-y-4 h-full">
                            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-700/80 shadow-inner">
                                <Visualizer 
                                    ref={visualizerCanvasRef} 
                                    analyserNode={analyserNodeRef.current} 
                                    bpm={preset.bpm}
                                    palette={palette}
                                    mode={mode}
                                />
                                <div className="absolute bottom-3 left-4 text-white font-mono text-lg pointer-events-none" style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}>
                                    {preset.name}
                                </div>
                            </div>
                             <div className="w-full flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    {isProcessing ? (
                                        <div className="text-purple-300">Processing audio...</div>
                                    ) : isRecording ? (
                                        <button onClick={handleStopRecording} className="px-4 py-2 text-sm font-bold rounded-md bg-red-600 hover:bg-red-500 border border-red-500 text-white transition-colors animate-pulse">Stop Recording</button>
                                    ) : (
                                        <button onClick={handleStartRecording} className="px-4 py-2 text-sm font-bold rounded-md bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white transition-colors">Record 64-step Loop</button>
                                    )}
                                    {videoUrl && (
                                        <a href={videoUrl} download={`${preset.name}.webm`} className="px-4 py-2 text-sm font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-white transition-colors">Download Video</a>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1 p-1 bg-black/30 rounded-md border border-neutral-700/80">
                                    {VISUALIZER_MODES.map(modeName => (
                                        <button key={modeName} onClick={() => setMode(modeName)} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${mode === modeName ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'}`}>{VISUALIZER_MODE_NAMES[modeName]}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6 text-center h-full flex flex-col items-center justify-center">
                            <p className="text-sm text-neutral-300">Generate a unique link to share your current project. Anyone with the link can listen to your jam in their browser.</p>
                            {isLinkLoading ? (
                                <div className="flex items-center justify-center space-x-2 text-purple-300">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>Compressing and generating link...</span>
                                </div>
                            ) : (
                                <button onClick={handleGenerateLink} className="w-full max-w-xs py-3 text-base font-bold rounded-md bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white transition-colors">Generate Share Link</button>
                            )}
                            {shareUrl && (
                                <div className="pt-4 border-t border-neutral-700/50 animate-fade-in w-full max-w-md">
                                    <label className="text-xs text-neutral-400 block mb-1">Your shareable link is ready:</label>
                                    <div className="flex space-x-2">
                                        <input type="text" readOnly value={shareUrl} className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 text-neutral-300"/>
                                        <button onClick={handleCopy} className="px-4 text-xs font-bold rounded-sm bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-white transition-colors flex-shrink-0">{copySuccess ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ShareJamModal;
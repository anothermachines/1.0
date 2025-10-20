import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';
import Visualizer from './Visualizer';
import { AudioEngine } from '../audioEngine';

const COLOR_PALETTES = [
    ['#a855f7', '#06b6d4', '#ec4899'], // Purple, Cyan, Pink
    ['#f59e0b', '#ef4444', '#fde047'], // Amber, Red, Yellow
    ['#22c55e', '#818cf8', '#38bdf8'], // Green, Indigo, Sky
    ['#ec4899', '#f97316', '#d946ef'], // Pink, Orange, Fuchsia
    ['#00FF7F', '#8A2BE2', '#FFD700'], // SpringGreen, BlueViolet, Gold
];

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
    const { 
        preset, mainView, arrangementLoop, 
        toggleShareJamModal, generateShareableLink, addNotification, renderJamVideoAudio 
    } = useStore(state => ({
        preset: state.preset,
        mainView: state.mainView,
        arrangementLoop: state.arrangementLoop,
        toggleShareJamModal: state.toggleShareJamModal,
        generateShareableLink: state.generateShareableLink,
        addNotification: state.addNotification,
        renderJamVideoAudio: state.renderJamVideoAudio,
    }), shallow);

    const [activeTab, setActiveTab] = useState<'record' | 'share'>('record');
    
    const [isLinkLoading, setIsLinkLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const audioPlayerNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const livePreviewSourceRef = useRef<GainNode | null>(null);
    
    const [palette, setPalette] = useState(COLOR_PALETTES[0]);
    const [mode, setMode] = useState(VISUALIZER_MODES[0]);

    useEffect(() => {
        const audioCtx = useStore.getState().audioEngine?.getContext();
        const mainBus = useStore.getState().audioEngine?.preCompressorBus;
        let localAnalyser: AnalyserNode | null = null;
        
        if (audioCtx && mainBus) {
            localAnalyser = audioCtx.createAnalyser();
            localAnalyser.fftSize = 2048;
            localAnalyser.minDecibels = -90;
            localAnalyser.maxDecibels = -10;
            localAnalyser.smoothingTimeConstant = 0.8;
            
            setAnalyserNode(localAnalyser);
            
            mainBus.connect(localAnalyser);
            livePreviewSourceRef.current = mainBus;
        }

        return () => {
            if (audioPlayerNodeRef.current) {
                try {
                    audioPlayerNodeRef.current.stop();
                    audioPlayerNodeRef.current.disconnect();
                } catch(e) {}
            }
            if (livePreviewSourceRef.current && localAnalyser) {
                try {
                    livePreviewSourceRef.current.disconnect(localAnalyser);
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
        const { stop, isPlaying } = useStore.getState();
        if (isPlaying) {
            stop();
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        setIsProcessing(true);
        setVideoUrl(null);
        recordedChunksRef.current = [];

        if (livePreviewSourceRef.current && analyserNode) {
            try {
                livePreviewSourceRef.current.disconnect(analyserNode);
            } catch(e) {}
        }
        
        let audioBuffer: AudioBuffer;
        try {
            audioBuffer = await renderJamVideoAudio();
        } catch (error) {
            console.error("Audio rendering for video failed:", error);
            addNotification({ type: 'error', message: `Failed to render audio: ${error instanceof Error ? error.message : String(error)}` });
            setIsProcessing(false);
            return;
        }
        
        setIsProcessing(false);
        setIsRecording(true);

        const canvas = visualizerCanvasRef.current;
        const audioContext = useStore.getState().audioEngine!.getContext();
        
        if (!canvas || !analyserNode || !audioContext) {
            addNotification({ type: 'error', message: 'Recording setup failed.' });
            setIsRecording(false);
            return;
        }

        const videoStream = canvas.captureStream(30);
        const audioDestination = audioContext.createMediaStreamDestination();
        
        audioPlayerNodeRef.current = audioContext.createBufferSource();
        audioPlayerNodeRef.current.buffer = audioBuffer;
        audioPlayerNodeRef.current.connect(analyserNode);
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
            if (livePreviewSourceRef.current && analyserNode) {
                try {
                     livePreviewSourceRef.current.connect(analyserNode);
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
    }, [addNotification, renderJamVideoAudio, analyserNode]);

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

    let recordButtonText = "Record 64-step Loop";
    let recordButtonDisabled = false;
    if (mainView === 'song') {
        if (arrangementLoop) {
            const durationInBeats = arrangementLoop.end - arrangementLoop.start;
            const durationInBars = durationInBeats / 4;
            recordButtonText = `Record Song Loop (${durationInBars} bars)`;
        } else {
            recordButtonText = "Set Song Loop to Record";
            recordButtonDisabled = true;
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => toggleShareJamModal(false)}
        >
            <div 
                className="bg-gradient-to-br from-neutral-900 to-black w-full max-w-4xl rounded-lg border border-purple-400/30 shadow-2xl flex flex-col animate-slide-up" 
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
                                    analyserNode={analyserNode} 
                                    bpm={preset.bpm}
                                    palette={palette}
                                    mode={mode}
                                />
                                <div className="absolute bottom-3 left-4 text-white font-mono text-lg pointer-events-none" style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}>
                                    {preset.name}
                                </div>
                            </div>
                            <div className="w-full flex items-center justify-between mt-4">
                                <div className="flex items-center space-x-2">
                                    {isProcessing ? (
                                        <div className="px-4 py-2 text-sm font-bold text-purple-300">Processing audio...</div>
                                    ) : isRecording ? (
                                        <button onClick={handleStopRecording} className="px-4 py-2 text-sm font-bold rounded-md bg-red-600 hover:bg-red-500 border border-red-500 text-white transition-colors animate-pulse">Stop Recording</button>
                                    ) : (
                                        <button onClick={handleStartRecording} disabled={recordButtonDisabled} className="px-4 py-2 text-sm font-bold rounded-md bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{recordButtonText}</button>
                                    )}
                                    {videoUrl && (
                                        <a href={videoUrl} download={`${preset.name}.webm`} className="px-4 py-2 text-sm font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-white transition-colors">Download Video</a>
                                    )}
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1 p-1 bg-black/30 rounded-md border border-neutral-700/80">
                                        {VISUALIZER_MODES.map(modeName => (
                                            <button key={modeName} onClick={() => setMode(modeName)} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${mode === modeName ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'}`}>{VISUALIZER_MODE_NAMES[modeName]}</button>
                                        ))}
                                    </div>
                                     <div className="flex items-center space-x-2 p-2 bg-black/30 rounded-md border border-neutral-700/80">
                                        {COLOR_PALETTES.map((p, index) => (
                                            <button key={index} onClick={() => setPalette(p)} className={`w-6 h-6 rounded-full transition-all duration-150 border-2 ${palette === p ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
                                                style={{ background: `linear-gradient(45deg, ${p[0]}, ${p[1]})` }}
                                            />
                                        ))}
                                    </div>
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
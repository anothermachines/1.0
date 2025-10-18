import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';

// --- SVG Icons for Export Options (Enlarged) ---
const MasterIcon = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h2l2-8l4 16l4-8l2 4h3" />
    </svg>
);
const StemsIcon = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 17H2" /><path d="M22 12H2" /><path d="M22 7H2" />
    </svg>
);


const ExportManager: React.FC = () => {
    const { 
        mainView, arrangementLoop, preset,
        toggleExportModal, exportAudio
    } = useStore(state => ({
        mainView: state.mainView,
        arrangementLoop: state.arrangementLoop,
        preset: state.preset,
        toggleExportModal: state.toggleExportModal,
        exportAudio: state.exportAudio,
    }), shallow);

    const [songExportSource, setSongExportSource] = useState<'song-loop' | 'song-full'>('song-loop');

    const fullArrangementDuration = useMemo(() => {
        const clips = preset.arrangementClips || [];
        if (clips.length === 0) return 0;
        return Math.max(...clips.map(c => c.startTime + c.duration));
    }, [preset.arrangementClips]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const handleExport = (type: 'master' | 'stems-wet' | 'stems-dry') => {
        const source = mainView === 'pattern' ? 'pattern' : songExportSource;
        
        exportAudio({
            type: type,
            includeMasterFx: type !== 'stems-dry',
            source: source,
        });
    };

    const exportOptions = [
        {
            type: 'master',
            icon: <MasterIcon />,
            title: 'Master Output',
            description: 'A single stereo WAV file of the final mix, including all master effects.',
            buttonText: 'Export Master',
            colorVar: 'var(--accent-color)',
        },
        {
            type: 'stems-wet',
            icon: <StemsIcon />,
            title: 'Wet Stems',
            description: 'Individual track files with sends to the master reverb, delay, and drive effects.',
            buttonText: 'Export Wet Stems',
            colorVar: '#22d3ee', // cyan-400
        },
        {
            type: 'stems-dry',
            icon: <StemsIcon />,
            title: 'Dry Stems',
            description: 'Individual track files without any master effects. Pure, clean, and ready for external mixing.',
            buttonText: 'Export Dry Stems',
            colorVar: '#a855f7', // purple-500
        },
    ];
    
    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono animate-fade-in"
            onClick={() => toggleExportModal(false)}
        >
            <div 
                className="bg-gradient-to-br from-neutral-900 to-black w-full max-w-5xl rounded-lg border border-neutral-800 shadow-2xl flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: '0 0 45px 5px rgba(0, 0, 0, 0.5)' }}
            >
                <header className="flex justify-between items-center p-4 border-b border-neutral-800 flex-shrink-0">
                    <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-neutral-300">AUDIO EXPORT</h2>
                    <button onClick={() => toggleExportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-500 hover:text-white bg-neutral-800/50 hover:bg-neutral-700/80 border border-neutral-700 transition-colors" aria-label="Close">&times;</button>
                </header>

                <main className="flex-grow p-6 sm:p-8 space-y-8 overflow-y-auto no-scrollbar">
                     {/* Source Selection */}
                    <div className="text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <h3 className="text-sm uppercase tracking-widest text-neutral-500 mb-3">Export Source</h3>
                        {mainView === 'pattern' ? (
                            <div className="px-4 py-2 bg-black/30 border border-neutral-700 rounded-md text-neutral-300 max-w-lg mx-auto">
                                Current Pattern Loop (64 Steps)
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-1 bg-black/30 border border-neutral-700 rounded-md text-neutral-300 gap-1 max-w-lg mx-auto">
                                <button
                                    onClick={() => setSongExportSource('song-loop')}
                                    disabled={!arrangementLoop}
                                    className={`px-4 py-2 rounded-sm text-xs w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${songExportSource === 'song-loop' ? 'bg-[var(--accent-color)] text-black' : 'hover:bg-neutral-700'}`}
                                >
                                    Selection ({formatTime(arrangementLoop ? arrangementLoop.end - arrangementLoop.start : 0)})
                                </button>
                                <button
                                    onClick={() => setSongExportSource('song-full')}
                                    disabled={fullArrangementDuration === 0}
                                    className={`px-4 py-2 rounded-sm text-xs w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${songExportSource === 'song-full' ? 'bg-[var(--accent-color)] text-black' : 'hover:bg-neutral-700'}`}
                                >
                                    Full Arrangement ({formatTime(fullArrangementDuration)})
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Export Options Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {exportOptions.map((opt, index) => (
                            <div
                                key={opt.type}
                                className="group relative bg-gradient-to-b from-neutral-900/80 to-black/80 rounded-xl border border-neutral-800/80 flex flex-col text-center transition-all duration-300 hover:border-[var(--glow-color)] hover:shadow-[0_0_35px_-5px_var(--glow-color)] hover:-translate-y-2 animate-slide-up"
                                style={{ '--glow-color': opt.colorVar, animationDelay: `${0.2 + index * 0.1}s`, opacity: 0, animationFillMode: 'forwards' } as React.CSSProperties}
                            >
                                <div className="flex flex-col items-center justify-start p-8 flex-grow">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-[-20px] bg-[var(--glow-color)] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-2xl" />
                                        <div className="text-[var(--glow-color)] transition-colors duration-300 group-hover:text-white">
                                            {opt.icon}
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-2xl font-bold tracking-wider text-white mb-3" style={{ textShadow: '0 0 15px rgba(0,0,0,0.8)' }}>{opt.title}</h4>
                                    <p className="text-sm text-neutral-400 font-sans leading-relaxed max-w-xs mx-auto flex-grow">{opt.description}</p>
                                </div>
                                <button
                                    onClick={() => handleExport(opt.type as any)}
                                    className="relative w-full h-16 text-sm font-bold rounded-b-xl tracking-widest uppercase transition-all duration-300 text-white bg-neutral-800/50 border-t border-neutral-700/80 group-hover:bg-[var(--glow-color)] group-hover:text-black group-hover:border-[var(--glow-color)]"
                                >
                                    <span className="relative z-10">{opt.buttonText}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ExportManager;
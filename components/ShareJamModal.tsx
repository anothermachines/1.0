import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import Visualizer from './Visualizer';

const AppLogo: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <svg width="200" height="180" viewBox="0 0 52 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g>
                <path d="M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z" stroke="var(--accent-color)" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.5" />
                <path d="M26 13L13 20V32L26 39L39 32V20L26 13Z" stroke="var(--accent-color)" strokeWidth="1" strokeOpacity="0.3" />
                <path d="M1 13.5L26 24.5L51 13.5" stroke="var(--accent-color)" strokeWidth="0.5" strokeOpacity="0.2" />
                <path d="M26 48V24.5" stroke="var(--accent-color)" strokeWidth="0.5" strokeOpacity="0.2" />
            </g>
        </svg>
    </div>
);


const ShareJamModal: React.FC = () => {
    const { toggleShareJamModal, preset, generateShareableLink } = useStore(state => ({
        toggleShareJamModal: state.toggleShareJamModal,
        preset: state.preset,
        generateShareableLink: state.generateShareableLink,
    }));
    
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [link, setLink] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    const handleGenerateLink = async () => {
        setIsLoading(true);
        setProgress('Compressing project data...');
        try {
            const generatedLink = await generateShareableLink();
            setLink(generatedLink);
            setProgress('Link generated!');
        } catch (error) {
            console.error("Error generating shareable link:", error);
            setProgress('Error!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (link) {
            navigator.clipboard.writeText(link).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Failed to copy.');
            });
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => toggleShareJamModal(false)}
        >
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-purple-500/30 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: '0 0 45px 5px rgba(168, 85, 247, 0.3)' }}
            >
                <header className="flex justify-between items-center p-4 border-b border-purple-500/20 flex-shrink-0">
                    <h3 className="text-lg font-bold text-purple-400 uppercase tracking-widest">Share Jam</h3>
                    <button onClick={() => toggleShareJamModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto no-scrollbar space-y-6">
                    <div className="text-center space-y-2">
                        <h4 className="text-xl font-bold text-white">Live Jam Visualizer</h4>
                        <p className="text-sm text-neutral-400 max-w-lg mx-auto">
                            Generate a shareable link that includes your project data. Anyone with the link can listen to your jam instantly.
                        </p>
                    </div>

                    <div className="aspect-video max-w-xl mx-auto bg-black rounded-md overflow-hidden border border-neutral-700 relative">
                         <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                         <AppLogo />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <Visualizer id="share-jam-visualizer" width={500} height={150} />
                         </div>
                         <div className="absolute bottom-4 left-0 right-0 text-center">
                            <p className="font-mono text-lg text-white" style={{textShadow: '0 1px 5px black'}}>{preset.name}</p>
                         </div>
                    </div>
                    
                    {link ? (
                        <div className="space-y-3 animate-fade-in">
                            <p className="text-center text-sm text-green-400">{progress}</p>
                            <div className="flex space-x-2 max-w-lg mx-auto">
                                <input 
                                    type="text"
                                    readOnly
                                    value={link}
                                    className="w-full bg-black/30 border border-neutral-600 rounded-sm text-xs px-2 py-2 text-neutral-300"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="px-4 text-xs font-bold rounded-sm bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white transition-colors flex-shrink-0"
                                >
                                    {copySuccess || 'COPY'}
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center h-20 flex items-center justify-center">
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
                                    <span className="text-neutral-300">{progress}</span>
                                </>
                            ) : (
                                <button
                                    onClick={handleGenerateLink}
                                    className="px-8 py-4 text-lg font-bold rounded-md bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white transition-colors shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]"
                                >
                                    Generate Shareable Link
                                </button>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ShareJamModal;
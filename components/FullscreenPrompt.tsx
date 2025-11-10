import React, { useCallback } from 'react';
import { useStore } from '../store/store';

const FullscreenPrompt: React.FC = () => {
    const toggleFullscreenPrompt = useStore(state => state.toggleFullscreenPrompt);

    const dismiss = useCallback(() => {
        toggleFullscreenPrompt(false);
    }, [toggleFullscreenPrompt]);

    const enterFullscreen = useCallback(() => {
        const appRoot = document.getElementById('root');
        if (appRoot && appRoot.requestFullscreen) {
            appRoot.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }
        dismiss();
    }, [dismiss]);

    return (
        <div 
            className="fixed bottom-4 right-4 z-[100] w-full max-w-sm p-4 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-2xl animate-slide-up"
            style={{ boxShadow: '0 0 25px 5px rgba(var(--accent-rgb), 0.2)' }}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 text-[var(--accent-color)] mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                </div>
                <div className="ml-4 flex-grow">
                    <h3 className="text-base font-bold text-[var(--text-light)]">Enhance Your Experience</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">For optimal performance and an immersive session, we recommend entering fullscreen mode.</p>
                </div>
                <button 
                    onClick={dismiss} 
                    className="-mt-2 -mr-2 p-2 rounded-full text-neutral-500 hover:bg-neutral-700 hover:text-white transition-colors"
                    aria-label="Dismiss"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={enterFullscreen}
                    className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--accent-color)] hover:bg-[var(--accent-color-active)] text-[var(--text-dark)] transition-colors border border-transparent"
                >
                    Enter Fullscreen
                </button>
            </div>
        </div>
    );
};

export default FullscreenPrompt;
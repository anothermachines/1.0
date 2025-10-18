import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';

const AppLogo: React.FC = () => (
    <svg width="28" height="26" viewBox="0 0 52 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block mr-2 text-[var(--accent-color)]">
        <path d="M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="var(--bg-panel-dark)" />
        <path d="M26 13L13 20V32L26 39L39 32V20L26 13Z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.7" />
    </svg>
);

const Manual: React.FC = () => {
    const { toggleManual } = useStore(state => ({ toggleManual: state.toggleManual }));
    const [manualContent, setManualContent] = useState<string>('<p style="color: white; text-align: center; padding: 2rem;">Loading manual...</p>');

    useEffect(() => {
        fetch('./manual.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch manual: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Remove the header from the manual.html as the React component provides its own
                const header = doc.querySelector('header');
                header?.remove();

                // Ensure the container takes full height inside the iframe
                const container = doc.querySelector('.manual-container');
                if (container) {
                    (container as HTMLElement).style.height = '100%';
                }

                setManualContent(doc.documentElement.outerHTML);
            })
            .catch(error => {
                console.error('Error loading manual:', error);
                setManualContent('<div style="color: white; text-align: center; padding: 2rem;"><h1>Error</h1><p>Could not load the user manual. Please check the browser console for details.</p></div>');
            });
    }, []);

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => toggleManual(false)}
        >
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-[var(--border-color)] w-full max-w-5xl h-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <h3 className="flex items-center text-lg font-bold text-[var(--text-light)] uppercase tracking-widest">
                        <AppLogo />
                        FM8/R User Manual
                    </h3>
                    <button onClick={() => toggleManual(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>

                <div className="flex-grow min-h-0">
                    <iframe srcDoc={manualContent} className="w-full h-full border-0" title="FM8/R User Manual" />
                </div>
            </div>
        </div>
    );
};

export default Manual;
import React, { useRef } from 'react';
import { useStore } from '../store/store';

const AppLogo: React.FC<{className?: string}> = ({className}) => (
    <svg viewBox="0 0 52 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="var(--bg-panel-dark)" />
        <path d="M26 13L13 20V32L26 39L39 32V20L26 13Z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.7" />
    </svg>
);

const NavIcon: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 opacity-70 w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);

const SectionIcon: React.FC<{children: React.ReactNode}> = ({ children }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 w-6 h-6 flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);


const Manual: React.FC = () => {
    const { toggleManual } = useStore(state => ({ toggleManual: state.toggleManual }));
    const mainRef = useRef<HTMLElement>(null);

    const scrollTo = (id: string) => {
        const section = document.getElementById(id);
        if (section && mainRef.current) {
            mainRef.current.scrollTo({
                top: section.offsetTop - 24, // 24px padding at top of main
                behavior: 'smooth',
            });
        }
    };

    const navLinks = [
        { id: 'manual-philosophy', label: 'Design Philosophy', icon: <><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c.34 0 .67-.02 1-.05" /><path d="M19.5 22c-5.25 0-9.5-4.25-9.5-9.5S14.25 3 19.5 3" /></> },
        { id: 'manual-engines', label: 'Sound Engines', icon: <><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m15.5 15.5-3-3-3-3-3.5 3.5" /><path d="m8.5 8.5 3 3 3 3 3.5-3.5" /></> },
        { id: 'manual-sequencer', label: 'The Sequencer', icon: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="7" y1="3" x2="7" y2="21" /><line x1="17" y1="3" x2="17" y2="21" /><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="17" x2="21" y2="17" /></> },
        { id: 'manual-editor', label: 'Instrument Editor', icon: <><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0-2.5 8.2" /><circle cx="12" cy="12" r="3" /></> },
        { id: 'manual-mixer', label: 'Mixer & Piano Roll', icon: <><path d="M16 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M8 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M12 6V18" /><path d="M12 6H8" /><path d="M12 12H16" /></> },
        { id: 'manual-effects', label: 'Master Effects', icon: <><path d="M3 12h2l2-8l4 16l4-8l2 4h3" /></> },
        { id: 'manual-song-mode', label: 'Song Mode', icon: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> },
        { id: 'manual-presets', label: 'Saving & Loading', icon: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></> },
        { id: 'manual-export', label: 'Export & Share', icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></> },
        { id: 'manual-midi', label: 'MIDI Control', icon: <><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2v0Z" /><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12v0Z" /><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4v0Z" /></> },
        { id: 'manual-shortcuts', label: 'Shortcuts', icon: <><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><path d="M6 11h.01" /><path d="M10 11h.01" /><path d="M14 11h.01" /><path d="M18 11h.01" /><path d="M8 15h.01" /><path d="M12 15h.01" /><path d="M16 15h.01" /><path d="M7 19h10" /></> },
        { id: 'manual-requirements', label: 'System Requirements', icon: <><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><rect x="6" y="2" width="12" height="8" rx="2" ry="2"></rect><line x1="12" y1="10" x2="12" y2="14"></line></> },
    ];
    
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
                        <AppLogo className="inline-block mr-2 text-[var(--accent-color)] w-7 h-7" />
                        FM8/R User Manual
                    </h3>
                    <button onClick={() => toggleManual(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>
                
                <div className="flex-grow flex flex-col md:flex-row min-h-0">
                    <nav className="w-full md:w-64 flex-shrink-0 bg-black/20 md:border-r border-b md:border-b-0 border-[var(--border-color)]/50 p-4 overflow-y-auto no-scrollbar">
                        <ul>
                            {navLinks.map(link => (
                                <li key={link.id}>
                                    <button onClick={() => scrollTo(link.id)} className="w-full flex items-center p-2 rounded-md text-left text-sm text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors">
                                        <NavIcon>{link.icon}</NavIcon>
                                        <span>{link.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <main ref={mainRef} className="flex-grow p-6 md:p-8 overflow-y-auto no-scrollbar scroll-smooth">
                        <section id="manual-philosophy">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c.34 0 .67-.02 1-.05" /><path d="M19.5 22c-5.25 0-9.5-4.25-9.5-9.5S14.25 3 19.5 3" /></SectionIcon>
                                Design Philosophy
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">Welcome to FM8/R, a professional groovebox engineered by <strong>Another Machines</strong> for producers to create their own unique loops for any DAW. While it lives in a virtual cloud, its heart is modular, offering deep sound sculpting capabilities inspired by hardware workflows. We are constantly in development, with exciting new features planned for future updates.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed"><b>This is not just a tool; it's an instrument for sonic exploration.</b></p>
                        </section>
                
                        <section id="manual-engines">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m15.5 15.5-3-3-3-3-3.5 3.5" /><path d="m8.5 8.5 3 3 3 3 3.5-3.5" /></SectionIcon>
                                The Sound Engines
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">FM8/R features 8 distinct sound engines, each designed for a specific sonic purpose. Understanding them is key to mastering the machine.</p>
                            <ul className="list-square pl-6 text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">KICK:</strong> A powerful, punchy drum synth for crafting everything from tight clicks to booming sub-basses.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">HAT:</strong> A versatile noise and resonator engine for creating a wide range of hi-hats, cymbals, and metallic percussion.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">ARCANE:</strong> A dual-oscillator synth with phase modulation, sync, and wavefolding. Perfect for complex digital tones, pads, and aggressive leads.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">RUIN:</strong> A distortion and feedback-focused engine for destructive, noisy, and chaotic basslines and textures.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">ARTIFICE:</strong> A sophisticated synth voice with dual multi-mode filters, FM, and noise mixing. Ideal for intricate sound design, evolving pads, and complex percussive hits.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">SHIFT:</strong> A wavetable oscillator with unique 'bend' and 'twist' parameters for creating shifting, glassy, and formant-like sounds.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">RESON:</strong> A physical modeling engine that simulates the sound of struck objects. Excellent for realistic (and unrealistic) bells, plucks, and resonant percussion.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">ALLOY:</strong> A 2-operator FM synth designed for creating classic metallic, bell-like, and electric piano sounds with a sharp, percussive character.</li>
                            </ul>
                        </section>
                
                        <section id="manual-sequencer">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="7" y1="3" x2="7" y2="21" /><line x1="17" y1="3" x2="17" y2="21" /><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="17" x2="21" y2="17" /></SectionIcon>
                                The Sequencer
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">The main grid is where you create patterns. Click a step to activate it. The selected track's instrument will play on that step. You can change pattern length, randomize, and create complex rhythms using Euclidean mode.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed"><strong className="text-[var(--text-light)] font-medium">P-Locks (Parameter Locks):</strong> Enable <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">P-LOCK</kbd> mode to edit parameters for individual steps. Select a step, then adjust any knob in the Instrument Editor or Mixer. This locks the new value to that specific step, creating dynamic, evolving patterns.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed"><strong className="text-[var(--text-light)] font-medium">Trig Conditions:</strong> When in P-LOCK mode, select a step to access its Trigger Condition. This allows you to set rules for when a step will play (e.g., '50%' probability, or only on the '2nd' time through the pattern), adding immense variation.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed"><strong className="text-[var(--text-light)] font-medium">Euclidean Rhythms:</strong> Activate Euclidean mode from the sequencer toolbar to generate complex, musical rhythms automatically. Adjust Pulses, Steps, and Rotation to explore a world of polyrhythms.</p>
                        </section>
                
                        <section id="manual-editor">
                             <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0-2.5 8.2" /><circle cx="12" cy="12" r="3" /></SectionIcon>
                                Instrument Editor
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">Select a track to see its sound engine parameters here. Each engine has a unique set of controls. Experiment to find new sounds! Detailed descriptions of each engine's core purpose can be found in the "Sound Engines" section above.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed"><strong className="text-[var(--text-light)] font-medium">Presets:</strong> Save and load instrument sounds using the preset manager at the top. This is a great way to build your personal sound library and speed up your workflow.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed"><strong className="text-[var(--text-light)] font-medium">Automation:</strong> Activate the <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">REC AUTOM</kbd> button to record knob movements. Any parameter you tweak while recording will be captured as automation for the selected track, adding life and movement to your sounds.</p>
                        </section>

                        <section id="manual-mixer">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M16 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M8 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M12 6V18" /><path d="M12 6H8" /><path d="M12 12H16" /></SectionIcon>
                                Mixer & Piano Roll
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">The bottom center panel serves two roles. By default, it's the <strong className="text-[var(--text-light)] font-medium">Mixer</strong>, where you can adjust volume, pan, and effect sends for each of the 8 tracks. This is where you balance your overall sound.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">For melodic tracks, you can toggle to the <strong className="text-[var(--text-light)] font-medium">Piano Roll</strong> view using the keyboard icon in the sequencer toolbar. This provides a traditional piano-style interface for composing melodies, chords, and basslines with precise control over note pitch and length.</p>
                        </section>

                        <section id="manual-effects">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M3 12h2l2-8l4 16l4-8l2 4h3" /></SectionIcon>
                                Master Effects
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">The right-hand panel contains the master effects rack, which processes the entire mix. Use these to add polish, space, and character to your sound.</p>
                            <ul className="list-square pl-6 text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Master Filter:</strong> A global LP/HP filter for broad tonal shaping and buildups.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Character:</strong> Adds harmonic complexity through four modes: Saturate, Overdrive, Bitcrush, and Fold.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Delay:</strong> A tempo-synced or free-running delay for creating echoes and rhythmic complexity.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Reverb:</strong> Adds space and depth to your mix, from small rooms to vast caverns.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Drive:</strong> A master distortion unit for adding warmth, grit, or aggressive overdrive to the entire mix.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Master Compressor:</strong> The final "glue" for your track. It helps to control dynamics and increase perceived loudness. Can be sidechained from any track.</li>
                            </ul>
                        </section>

                        <section id="manual-song-mode">
                             <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></SectionIcon>
                                Song Mode
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">Switch from <strong className="text-[var(--text-light)] font-medium">PATTERN</strong> to <strong className="text-[var(--text-light)] font-medium">SONG</strong> mode to arrange your patterns into a full track. In this view, you can place clips of your patterns onto a timeline for each track.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">Click <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">ADD PATTERN</kbd>, select a pattern number, and click on the timeline to place a clip. You can then move, resize, and duplicate clips to build your song structure. Use the Loop control at the top of the timeline to define a region for playback or export.</p>
                        </section>

                        <section id="manual-presets">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></SectionIcon>
                                Saving & Loading
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">You can manage both full projects and individual instrument sounds.</p>
                            <ul className="list-square pl-6 text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Project Library:</strong> Access via the project name display in the top header. Here you can save, load, rename, and delete entire projects (all 8 tracks, patterns, and settings).</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Instrument Presets:</strong> Found at the top of the Instrument Editor. This allows you to save and load the sound of a single track, making it easy to reuse your favorite kick, bass, or lead sounds across different projects.</li>
                            </ul>
                        </section>

                        <section id="manual-export">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></SectionIcon>
                                Export & Share
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">When you're ready to take your loops out of FM8/R, use the <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">EXPORT</kbd> button. You have several options:</p>
                            <ul className="list-square pl-6 text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Master Output:</strong> Renders a single stereo WAV file of your full mix.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Wet Stems:</strong> Exports each audible track as a separate WAV file, including the master send effects (Reverb, Delay, Drive).</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Dry Stems:</strong> Exports each track as a pure, clean WAV file with no master effects, perfect for mixing in your DAW.</li>
                            </ul>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">The <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">SHARE JAM</kbd> button generates a unique link containing your compressed project data for others to listen to instantly.</p>
                        </section>

                        <section id="manual-midi">
                             <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2v0Z" /><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12v0Z" /><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4v0Z" /></SectionIcon>
                                MIDI Control
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">FM8/R has a powerful MIDI Learn system. Go to <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">Settings</kbd> &gt; <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">MIDI Mapping</kbd> and click the <kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">MIDI LEARN</kbd> button.</p>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">While in learn mode, first click any parameter (knob, button, etc.) on the screen, then move a physical control on your MIDI controller. The mapping will be created automatically. You can also send MIDI out from a MIDI track to control external hardware or software.</p>
                        </section>
                
                        <section id="manual-shortcuts">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><path d="M6 11h.01" /><path d="M10 11h.01" /><path d="M14 11h.01" /><path d="M18 11h.01" /><path d="M8 15h.01" /><path d="M12 15h.01" /><path d="M16 15h.01" /><path d="M7 19h10" /></SectionIcon>
                                Keyboard Shortcuts
                            </h2>
                            <ul className="list-square pl-6 text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                                <li className="mb-3"><kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">Spacebar</kbd>: Play / Pause</li>
                                <li className="mb-3"><kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">Ctrl/Cmd + C</kbd> (on step): Copy Step</li>
                                <li className="mb-3"><kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">Ctrl/Cmd + V</kbd> (on step): Paste Step</li>
                                <li className="mb-3"><kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">Ctrl/Cmd + Shift + C</kbd>: Copy Pattern</li>
                                <li className="mb-3"><kbd className="px-2 py-1 font-mono text-sm text-[var(--text-screen)] bg-[#3b4252] border border-[#4c566a] rounded-md shadow-md">Ctrl/Cmd + Shift + V</kbd>: Paste Pattern</li>
                            </ul>
                        </section>
                        <section id="manual-requirements">
                            <h2 className="text-2xl font-bold text-[var(--accent-color)] mb-4 flex items-center font-mono border-b border-[var(--border-color)] pb-3">
                                <SectionIcon><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><rect x="6" y="2" width="12" height="8" rx="2" ry="2"></rect><line x1="12" y1="10" x2="12" y2="14"></line></SectionIcon>
                                System Requirements & Disclaimer
                            </h2>
                            <p className="text-[var(--text-muted)] text-base mb-4 leading-relaxed">For the best experience, please ensure your system meets the following recommendations.</p>
                            <ul className="list-square pl-6 text-[var(--text-muted)] text-base mb-4 leading-relaxed">
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Browser:</strong> The latest version of <strong className="text-[var(--text-light)] font-medium">Google Chrome</strong> is strongly recommended for optimal performance and full compatibility with the Web Audio and Web MIDI APIs. Other modern browsers (Firefox, Edge) may work but are not officially supported.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">CPU:</strong> Intel Core i5 (or equivalent) 2.5GHz or faster. Real-time audio synthesis is CPU-intensive.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">RAM:</strong> 8GB minimum, 16GB or more recommended for complex projects.</li>
                                <li className="mb-3"><strong className="text-[var(--text-light)] font-medium">Operating System:</strong> A modern desktop OS such as Windows 10+, macOS 11+, or a recent Linux distribution.</li>
                            </ul>
                            <p className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-200 mt-4">
                                <strong className="text-[var(--text-light)] font-medium">Disclaimer:</strong> FM8/R is an experimental instrument under active development. While we strive for stability, you may encounter occasional bugs or performance issues. We appreciate your understanding and feedback as we continue to improve the experience.
                            </p>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Manual;

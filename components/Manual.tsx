import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store';

const sections = [
    { id: 'welcome', title: 'Welcome to FM8/R' },
    { id: 'sequencer', title: 'The Sequencer' },
    { id: 'instrument-editor', title: 'Instrument Editor' },
    { id: 'sound-engines', title: 'Sound Engines' },
    { id: 'mixer-pianoroll', title: 'Mixer & Piano Roll' },
    { id: 'effects-rack', title: 'Effects Rack' },
    { id: 'song-mode', title: 'Song Mode & Arrangement' },
    { id: 'export-share', title: 'Export & Share' },
    { id: 'store', title: 'Expansion Packs & Store' },
    { id: 'license', title: 'License & Viewer Mode' },
    { id: 'midi', title: 'MIDI' },
    { id: 'shortcuts', title: 'Shortcuts' },
];

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
    <div id={id} className="mb-8 section-observer-target">
        <h3 className="text-xl font-bold text-[var(--accent-color)] mb-3 border-b-2 border-[var(--accent-color)]/30 pb-2">{title}</h3>
        <div className="space-y-3 text-sm text-neutral-300 font-sans leading-relaxed">
            {children}
        </div>
    </div>
);

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="px-2 py-1 text-xs font-sans font-semibold text-neutral-200 bg-neutral-700 border border-neutral-600 rounded-md">{children}</kbd>
);

const Manual: React.FC = () => {
    const { toggleManual } = useStore();
    const [activeSection, setActiveSection] = useState('welcome');
    const contentRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        observer.current = new IntersectionObserver(handleIntersection, {
            root: contentRef.current,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0.1,
        });

        const targets = contentRef.current?.querySelectorAll('.section-observer-target');
        targets?.forEach(target => observer.current?.observe(target));

        return () => {
            targets?.forEach(target => observer.current?.unobserve(target));
        };
    }, []);

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={() => toggleManual(false)}
        >
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-[var(--border-color)] w-full max-w-4xl h-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <h2 className="text-lg font-bold text-[var(--text-light)] uppercase tracking-widest">FM8/R User Manual</h2>
                    <button onClick={() => toggleManual(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>

                <div className="flex flex-grow min-h-0">
                    <nav className="w-56 flex-shrink-0 bg-black/20 border-r border-[var(--border-color)] p-4 overflow-y-auto no-scrollbar">
                        <ul className="space-y-2">
                            {sections.map(section => (
                                <li key={section.id}>
                                    <a 
                                        href={`#${section.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className={`block px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
                                            activeSection === section.id
                                            ? 'bg-[var(--accent-color)] text-[var(--text-dark)]'
                                            : 'text-neutral-300 hover:bg-white/10'
                                        }`}
                                    >
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <main ref={contentRef} className="flex-grow p-6 overflow-y-auto no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                        <Section id="welcome" title="Welcome to FM8/R">
                            <p>
                                FM8/R is a powerful groovebox designed for modern electronic music production, with a focus on techno and related genres. This guide will walk you through the main features to get you started.
                            </p>
                        </Section>

                        <Section id="sequencer" title="The Sequencer">
                            <p>
                                The sequencer is where you create your patterns. Each row represents a track, and the grid represents time.
                            </p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Creating Trigs:</strong> Click on a step in the grid to activate it. A lit step will trigger a sound.</li>
                                <li><strong>Track Selection:</strong> Click on a track's header on the left to select it for editing in the Instrument Editor.</li>
                                <li><strong>P-Locks (Parameter Locks):</strong> Enable <span className="font-bold text-cyan-400">P-LOCK</span> mode. Now, when you select a step, you can use the knobs at the bottom to change parameters for that step only. This is key for creating dynamic and evolving patterns.</li>
                                <li><strong>Pattern Controls:</strong> Use the controls above the grid to change patterns, set pattern length, randomize, and generate Euclidean rhythms.</li>
                                <li><strong>Piano Roll:</strong> Click the piano icon in the top-left of the sequencer to switch to the Piano Roll view for melodic sequencing.</li>
                            </ul>
                        </Section>
                        
                        <Section id="instrument-editor" title="Instrument Editor">
                            <p>This is where you design the sound for the currently selected track. Each track has a unique sound engine.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Knobs:</strong> Drag vertically on a knob to change its value. Hold <Key>Shift</Key> while dragging for fine control. Double-click a knob's value to type in a number.</li>
                                <li><strong>Presets:</strong> Use the Instrument Preset manager at the top of the editor to save, load, and randomize sounds for the current track type.</li>
                                <li><strong>Automation:</strong> Click the <span className="font-bold text-red-500">REC AUTOM</span> button to record knob movements into your pattern or song.</li>
                            </ul>
                        </Section>
                        
                        <Section id="sound-engines" title="Sound Engines (The 8 Instruments)">
                            <p>Each track runs a specialized synthesizer. Understanding them is the key to mastering sound design in FM8/R.</p>
                            <ul className="space-y-4">
                                <li>
                                    <h4 className="font-bold text-neutral-100">Kick: The Foundation</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A dedicated kick drum synthesizer. Perfect for everything from deep, resonant sub-basses to hard-hitting techno punches. Key parameters include <strong>Tune</strong> (pitch), <strong>Decay</strong> (length), <strong>Impact</strong> (the initial click or "beater" sound), and <strong>Character</strong> (saturation/distortion).</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Hat: Rhythmic Texture</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A versatile noise-based percussion synth. Ideal for hi-hats, shakers, and noise textures. <strong>Tone</strong> adjusts the core frequency, <strong>Character</strong> adds metallic quality, and <strong>Spread</strong> creates stereo width by detuning internal oscillators.</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Arcane: Digital Playground</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A dual-oscillator synth specializing in Phase Modulation (PM) and wavefolding. Capable of complex digital tones, bells, and aggressive leads. The <strong>Mode</strong> switch changes how the oscillators interact (PM, Additive, Ring Mod, Hard Sync), while <strong>Mod Amount</strong> and <strong>Fold</strong> are your main tools for sonic exploration.</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Ruin: Destructive Synthesis</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A synth designed for chaos. It excels at aggressive basses, distorted leads, and industrial noise. The core is the <strong>Algorithm</strong> parameter, which selects different methods of feedback, distortion, and folding. <strong>Timbre</strong>, <strong>Drive</strong>, and <strong>Fold</strong> add layers of grit and destruction.</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Artifice: Sound Designer's Dream</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">The most complex engine. It features two oscillators with FM, a noise source, and a powerful dual filter that can run in series or parallel. Excellent for intricate pads, sharp plucks, evolving textures, and experimental sounds. The interaction between the <strong>Osc Mix</strong>, <strong>Noise Level</strong>, and the dual filter controls (<strong>Cutoff, Reso, Spread</strong>) is where the magic happens.</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Shift: Wavetable Synthesis</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A modern wavetable synth. The <strong>Table</strong> parameter selects a set of waveforms, and <strong>Position</strong> smoothly scans through them. <strong>Bend</strong> and <strong>Twist</strong> further warp the fabric of the sound. Ideal for evolving pads, complex modern tones, and sounds with intricate timbral movement.</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Reson: Physical Modeling</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A physical modeling resonator that simulates the sound of an object being struck. It doesn't use traditional oscillators. Instead, an "exciter" (a noise burst or impulse) strikes a virtual object. Parameters like <strong>Structure</strong> (inharmonicity), <strong>Brightness</strong>, <strong>Decay</strong>, and <strong>Material</strong> define the object's properties. Perfect for realistic (and unrealistic) bells, woodblocks, and metallic percussion.</p>
                                </li>
                                <li>
                                    <h4 className="font-bold text-neutral-100">Alloy: Classic FM</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2">A classic 2-operator FM (Frequency Modulation) synthesizer. A simple but powerful way to get classic digital sounds. The <strong>Ratio</strong> control sets the frequency relationship between the two operators, which is the key to creating different timbres. The <strong>Modulator Envelope</strong> (Mod Level/Decay) defines how the sound changes over time. Famous for bells, electric pianos, and sharp, punchy basses.</p>
                                </li>
                            </ul>
                        </Section>

                        <Section id="mixer-pianoroll" title="Mixer & Piano Roll Panel">
                            <p>This central bottom panel can be switched between two views.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Mixer:</strong> Adjust volume, pan, and FX sends for each track. Mute and solo tracks to focus on specific elements.</li>
                                <li><strong>Piano Roll:</strong> When enabled via the sequencer toolbar, this view allows for detailed melodic and chordal sequencing for the selected track. You can adjust note pitch, velocity, and duration.</li>
                            </ul>
                        </Section>

                        <Section id="effects-rack" title="Effects Rack">
                            <p>The global effects on the right process the entire mix, adding space, texture, and punch.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Sends:</strong> Each track has sends for Reverb, Delay, and Drive.</li>
                                <li><strong>Master Chain:</strong> The signal goes through a Master Filter, Character (Saturate, Overdrive, Bitcrush), a master Compressor, and finally a Limiter. Use these to glue your mix together.</li>
                            </ul>
                        </Section>
                        
                        <Section id="song-mode" title="Song Mode & Arrangement">
                            <p>Switch from PATTERN to SONG view in the top transport controls to arrange your patterns into a full track.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Clips:</strong> In Song mode, the sequencer becomes an arrangement view. You can place clips, which are instances of your patterns, on the timeline.</li>
                                <li><strong>Adding Clips:</strong> Enable "ADD PATTERN" mode, select a pattern number, and click on a track's lane in the timeline to place it.</li>
                                <li><strong>Editing Clips:</strong> Click a clip to select it. Drag to move it, or drag its right edge to change its duration. Press <Key>Delete</Key> or <Key>Backspace</Key> to remove the selected clip.</li>
                            </ul>
                        </Section>

                        <Section id="export-share" title="Export & Share">
                            <p>Finalize and share your work using the dedicated modals.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Export:</strong> Render your project as high-quality WAV files. You can export the full stereo master or individual track "stems" for mixing in a traditional DAW.</li>
                                <li><strong>Share Jam:</strong> This powerful feature lets you either record a video of your loop with a cool visualizer for social media, or generate a unique URL that contains your entire project. Anyone with the link can listen to your jam instantly.</li>
                            </ul>
                        </Section>

                        <Section id="store" title="Expansion Packs & Store">
                            <p>Expand your sonic palette by visiting the Store.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Install Packs:</strong> The Store contains official and custom expansion packs. Installing a pack adds its projects and instrument presets to your library, ready to be used and remixed.</li>
                            </ul>
                        </Section>

                        <Section id="license" title="License & Viewer Mode">
                            <p>FM8/R operates in a limited "Viewer Mode" by default.</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Limitations:</strong> In Viewer Mode, only the first 3 sound engines are available, and Song Mode is disabled.</li>
                                <li><strong>Unlock Full Version:</strong> To unlock all 8 sound engines and all features, please consider purchasing a license. Your support makes future development possible!</li>
                            </ul>
                        </Section>
                        
                        <Section id="midi" title="MIDI">
                            <p>Integrate FM8/R with your hardware setup using its comprehensive MIDI features.</p>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-neutral-100">MIDI Out Track</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2 mt-1">
                                        Track 8 defaults to a special MIDI Out track, allowing you to sequence external hardware synthesizers, drum machines, or software instruments directly from FM8/R. Its editor is unique:
                                    </p>
                                    <ul className="list-disc list-inside ml-8 mt-2 text-xs text-neutral-400 space-y-1">
                                        <li><strong>Device & Channel:</strong> Select your connected MIDI output device and the desired channel (1-16).</li>
                                        <li><strong>Note Sequencing:</strong> Use the Sequencer or Piano Roll to write melodies and rhythms, just like any other track. The notes will be sent to your external gear.</li>
                                        <li><strong>CC P-Locks:</strong> This is a powerful feature for automating external hardware. In P-Lock mode, select a step and go to the Instrument Editor for the MIDI track. You can add "CC Locks" to send specific MIDI Control Change messages on that step, allowing you to automate parameters like filter cutoff or resonance on your external synth.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-100">MIDI Learn</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2 mt-1">
                                        In the Settings modal, you can enable MIDI Learn mode to easily map knobs and buttons on your controller to almost any parameter in the app. Click the "MIDI LEARN" button, click a parameter in the UI, and then move the control on your hardware.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-100">MIDI Sync</h4>
                                    <p className="text-xs text-neutral-400 pl-4 border-l-2 border-neutral-700 ml-2 mt-1">
                                        You can configure FM8/R to send or receive MIDI clock signals to synchronize its tempo with external drum machines, synthesizers, or your DAW. Configure this in the Settings modal.
                                    </p>
                                </div>
                            </div>
                        </Section>

                        <Section id="shortcuts" title="Shortcuts">
                            <ul className="list-disc list-inside space-y-2">
                                <li><Key>Spacebar</Key>: Play / Pause</li>
                                <li><Key>Ctrl/Cmd</Key> + <Key>Shift</Key> + <Key>C</Key>: Copy current pattern</li>
                                <li><Key>Ctrl/Cmd</Key> + <Key>Shift</Key> + <Key>V</Key>: Paste copied pattern</li>
                                <li><Key>Ctrl/Cmd</Key> + <Key>C</Key>: Copy selected step (in P-Lock mode)</li>
                                <li><Key>Ctrl/Cmd</Key> + <Key>V</Key>: Paste copied step (in P-Lock mode)</li>
                            </ul>
                        </Section>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Manual;
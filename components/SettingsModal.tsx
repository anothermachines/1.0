import React, { useContext, useState, useEffect } from 'react';
import ThemeSelector from './ThemeSelector';
import { useStore } from '../store/store';
import { MidiContext } from '../contexts/MidiContext';
import { shallow } from 'zustand/shallow';
import { MidiMapping, LatencySetting } from '../types';
import { downloadBlob } from '../utils';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appearanceThemes: Record<string, { name: string }>;
    activeAppearanceTheme: string;
    onAppearanceThemeChange: (themeKey: string) => void;
    accentThemes: Record<string, { name: string; '--accent-color': string; '--accent-color-active': string }>;
    activeAccentTheme: string;
    onAccentThemeChange: (themeKey: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, 
    appearanceThemes, activeAppearanceTheme, onAppearanceThemeChange,
    accentThemes, activeAccentTheme, onAccentThemeChange
}) => {
    const {
        audioOutputDevices, selectedAudioOutputId, selectAudioOutput,
        latencySetting, setLatency,
        exportFullBackup, importFullBackup,
        midiSyncSource, setMidiSyncSource, midiSyncOutput, setMidiSyncOutput,
        customStoreUrl, setCustomStoreUrl, fetchCustomPacks,
        uiPerformanceMode, setUiPerformanceMode,
    } = useStore(state => ({
        audioOutputDevices: state.audioOutputDevices,
        selectedAudioOutputId: state.selectedAudioOutputId,
        selectAudioOutput: state.selectAudioOutput,
        latencySetting: state.latencySetting,
        setLatency: state.setLatency,
        exportFullBackup: state.exportFullBackup,
        importFullBackup: state.importFullBackup,
        midiSyncSource: state.midiSyncSource,
        setMidiSyncSource: state.setMidiSyncSource,
        midiSyncOutput: state.midiSyncOutput,
        setMidiSyncOutput: state.setMidiSyncOutput,
        customStoreUrl: state.customStoreUrl,
        setCustomStoreUrl: state.setCustomStoreUrl,
        fetchCustomPacks: state.fetchCustomPacks,
        uiPerformanceMode: state.uiPerformanceMode,
        setUiPerformanceMode: state.setUiPerformanceMode,
    }), shallow);
    
    const midiContext = useContext(MidiContext);
    const [localStoreUrl, setLocalStoreUrl] = useState(customStoreUrl);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        // Check for owner mode only on component mount
        const params = new URLSearchParams(window.location.search);
        setIsOwner(params.get('owner_mode') === 'true');
    }, []);


    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && midiContext) {
            const importedMappings = await importFullBackup(e.target.files[0]);
            if (importedMappings) {
                midiContext.setMappings(importedMappings);
            }
        }
        if (e.target) e.target.value = '';
    };

    const handleLoadCustomPacks = () => {
        setCustomStoreUrl(localStoreUrl);
        fetchCustomPacks(localStoreUrl);
    };

    const handleDeleteMapping = (mappingToDelete: MidiMapping) => {
        if (midiContext) {
            midiContext.setMappings(prev => prev.filter(m => m.target.path !== mappingToDelete.target.path));
        }
    };

    if (!isOpen) return null;

    const latencyOptions: {label: string, value: LatencySetting}[] = [
        { label: 'Fast', value: 'interactive' },
        { label: 'Balanced', value: 'balanced' },
        { label: 'Stable', value: 'playback' },
    ];
    
    const performanceOptions: {label: string, value: 'high' | 'performance' | 'off'}[] = [
        { label: 'High Quality', value: 'high' },
        { label: 'Performance', value: 'performance' },
        { label: 'Off', value: 'off' },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-[var(--border-color)] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: '0 0 25px 5px rgba(var(--accent-rgb), 0.25)' }}
            >
                <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <h3 className="text-lg font-bold text-yellow-400 uppercase tracking-widest">Settings</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>
                
                <main className="flex-grow p-4 overflow-y-auto no-scrollbar">
                     <div className="space-y-6">
                        {/* Audio Settings */}
                        <div>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Audio</h4>
                            <div className="space-y-4 bg-black/20 p-3 rounded-md border border-[var(--border-color)]/50">
                                <div>
                                    <label className="text-xs text-neutral-300 block mb-1">Output Device</label>
                                    <select
                                        value={selectedAudioOutputId}
                                        onChange={(e) => selectAudioOutput(e.target.value)}
                                        className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 text-[var(--text-light)]"
                                    >
                                        <option value="default">System Default</option>
                                        {audioOutputDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-300 block mb-1">Latency</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {latencyOptions.map(({ label, value }) => (
                                            <button
                                                key={value}
                                                onClick={() => setLatency(value)}
                                                className={`py-2 px-3 text-xs font-bold rounded-sm border transition-colors ${latencySetting === value 
                                                    ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)]'
                                                    : 'bg-[var(--bg-control)] hover:bg-[var(--border-color)] border-[var(--border-color)]'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* UI Performance Settings */}
                        <div>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">UI Performance</h4>
                            <div className="space-y-4 bg-black/20 p-3 rounded-md border border-[var(--border-color)]/50">
                                <div>
                                    <label className="text-xs text-neutral-300 block mb-1">VU Meter Mode</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {performanceOptions.map(({ label, value }) => (
                                            <button
                                                key={value}
                                                onClick={() => setUiPerformanceMode(value)}
                                                className={`py-2 px-3 text-xs font-bold rounded-sm border transition-colors ${uiPerformanceMode === value 
                                                    ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)]'
                                                    : 'bg-[var(--bg-control)] hover:bg-[var(--border-color)] border-[var(--border-color)]'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Content (Owner Only) */}
                         {isOwner && (<div>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Custom Content</h4>
                            <div className="space-y-2 bg-black/20 p-3 rounded-md border border-[var(--border-color)]/50">
                                <label className="text-xs text-neutral-300 block mb-1">Custom Store Manifest URL</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="https://.../store-manifest.json"
                                        value={localStoreUrl}
                                        onChange={(e) => setLocalStoreUrl(e.target.value)}
                                        className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none"
                                    />
                                    <button
                                        onClick={handleLoadCustomPacks}
                                        className="px-4 py-2 text-xs font-bold rounded-sm border transition-colors bg-cyan-700 hover:bg-cyan-600 border-cyan-600 text-white"
                                    >
                                        Load
                                    </button>
                                </div>
                            </div>
                        </div>)}

                        {/* MIDI Sync */}
                        {midiContext && (
                            <div>
                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">MIDI Sync</h4>
                                <div className="space-y-4 bg-black/20 p-3 rounded-md border border-[var(--border-color)]/50">
                                    <div>
                                        <label className="text-xs text-neutral-300 block mb-1">Sync Source</label>
                                        <select
                                            value={midiSyncSource || 'internal'}
                                            onChange={(e) => setMidiSyncSource(e.target.value === 'internal' ? 'internal' : e.target.value)}
                                            className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 text-[var(--text-light)]"
                                        >
                                            <option value="internal">Internal Clock</option>
                                            {midiContext.inputs.map(input => (
                                                <option key={input.id} value={input.id}>{input.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-300 block mb-1">Sync Output</label>
                                        <select
                                            value={midiSyncOutput || 'none'}
                                            onChange={(e) => setMidiSyncOutput(e.target.value === 'none' ? 'none' : e.target.value)}
                                            className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 text-[var(--text-light)]"
                                        >
                                            <option value="none">None</option>
                                            {midiContext.outputs.map(output => (
                                                <option key={output.id} value={output.id}>{output.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* MIDI Mapping */}
                        {midiContext && (
                            <div>
                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">MIDI Mapping</h4>
                                <div className="space-y-4 bg-black/20 p-3 rounded-md border border-[var(--border-color)]/50">
                                    <div>
                                        <label className="text-xs text-neutral-300 block mb-1">MIDI Input Device</label>
                                        <select
                                            value={midiContext.selectedInputId || ''}
                                            onChange={(e) => midiContext.setSelectedInputId(e.target.value)}
                                            className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 text-[var(--text-light)]"
                                        >
                                            {midiContext.inputs.length === 0 ? (
                                                <option>No MIDI devices found</option>
                                            ) : (
                                                midiContext.inputs.map(input => (
                                                    <option key={input.id} value={input.id}>{input.name}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <button
                                            onClick={midiContext.toggleLearningMode}
                                            className={`w-full py-2 px-3 text-xs font-bold rounded-sm border transition-colors ${
                                                midiContext.isLearning 
                                                ? 'bg-cyan-500 border-cyan-400 text-white animate-pulse-glow'
                                                : 'bg-blue-800 hover:bg-blue-700 border-blue-700 text-white'
                                            }`}
                                        >
                                            {midiContext.isLearning ? (midiContext.learningTarget ? `LEARNING: ${midiContext.learningTarget.label}` : 'LISTENING...') : 'MIDI LEARN'}
                                        </button>
                                        {midiContext.isLearning && <p className="text-center text-[10px] text-cyan-300 mt-1">Click a parameter on the screen, then move a knob/fader on your MIDI controller.</p>}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1 pr-1">
                                        {midiContext.mappings.length === 0 ? (
                                            <p className="text-center text-xs text-neutral-500 py-4">No MIDI mappings yet.</p>
                                        ) : (
                                            midiContext.mappings.map((mapping, index) => (
                                                <div key={`${mapping.target.path}-${index}`} className="flex items-center justify-between bg-black/30 p-1.5 rounded-sm text-xs">
                                                    <span className="font-mono text-neutral-300 truncate">
                                                        <span className="text-cyan-400">{`CC ${mapping.message.key} (Ch ${mapping.message.channel + 1})`}</span>
                                                        {' → '}
                                                        <span className="text-neutral-200">{mapping.target.label}</span>
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteMapping(mapping)}
                                                        className="w-5 h-5 flex-shrink-0 bg-red-800/80 text-white rounded text-[10px] hover:bg-red-700 ml-2"
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Appearance */}
                        <div>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Appearance Theme</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(appearanceThemes).map(([key, theme]: [string, { name: string }]) => (
                                    <button
                                        key={key}
                                        onClick={() => onAppearanceThemeChange(key)}
                                        className={`py-2 px-3 text-xs font-bold rounded-sm border transition-colors ${activeAppearanceTheme === key 
                                            ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)]'
                                            : 'bg-[var(--bg-control)] hover:bg-[var(--border-color)] border-[var(--border-color)]'
                                        }`}
                                    >
                                        {theme.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="animate-fade-in">
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Accent Color</h4>
                            <div className="flex justify-center p-2 rounded-md bg-black/20 border border-[var(--border-color)]/50">
                                <ThemeSelector 
                                    themes={accentThemes}
                                    activeTheme={activeAccentTheme}
                                    onThemeChange={onAccentThemeChange}
                                />
                            </div>
                        </div>

                        {/* Backup & Restore */}
                        <div>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Backup &amp; Restore</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => midiContext && exportFullBackup(midiContext.mappings)}
                                    className="py-2 px-3 text-xs font-bold rounded-sm border transition-colors bg-blue-800 hover:bg-blue-700 border-blue-700 text-white"
                                >
                                    Export Full Backup
                                </button>
                                <label className="py-2 px-3 text-xs font-bold rounded-sm border transition-colors bg-green-800 hover:bg-green-700 border-green-700 text-white text-center cursor-pointer">
                                    Import Backup
                                    <input type="file" onChange={handleImport} className="hidden" accept=".json, .fm8r-backup" />
                                </label>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default React.memo(SettingsModal);
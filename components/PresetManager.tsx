import React, { useState, useCallback } from 'react';
import { useStore } from '../store/store';
import { Preset } from '../types';

const PresetManager: React.FC = () => {
    const { 
        presets, currentPresetName,
        loadPreset, savePreset, overwritePreset, deletePreset, renamePreset,
        togglePresetManager, exportProject, importProject, saveAllProjects,
        saveCurrentProjectAndExtractPresets, isViewerMode, triggerViewerModeInteraction,
        saveCurrentSessionAsNewProject
    } = useStore(state => ({
        presets: state.presets,
        currentPresetName: state.preset.name,
        loadPreset: state.loadPreset,
        savePreset: state.savePreset,
        overwritePreset: state.overwritePreset,
        deletePreset: state.deletePreset,
        renamePreset: state.renamePreset,
        togglePresetManager: state.togglePresetManager,
        exportProject: state.exportProject,
        importProject: state.importProject,
        saveAllProjects: state.saveAllProjects,
        saveCurrentProjectAndExtractPresets: state.saveCurrentProjectAndExtractPresets,
        isViewerMode: state.isViewerMode,
        triggerViewerModeInteraction: state.triggerViewerModeInteraction,
        saveCurrentSessionAsNewProject: state.saveCurrentSessionAsNewProject,
    }));

    const [newPresetName, setNewPresetName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const canOverwrite = presets.some(p => p.name === currentPresetName && currentPresetName !== "Blank Project" && currentPresetName !== "New Project");
   
    const handleSaveClick = () => {
        savePreset(newPresetName);
        setNewPresetName(''); // Clear input after saving
    };

    const handleRenameClick = (e: React.MouseEvent, oldName: string) => {
        e.stopPropagation();
        if (isViewerMode) {
            triggerViewerModeInteraction();
            return;
        }
        const newName = window.prompt(`Enter new name for "${oldName}":`, oldName);
        if (newName && newName.trim() !== '') {
            renamePreset(oldName, newName);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        if (isViewerMode) {
            triggerViewerModeInteraction();
            return;
        }
        deletePreset(name);
    };

    const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            importProject(e.target.files[0]);
        }
        e.target.value = ''; // Reset input
    };
    
    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            importProject(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    }, [importProject]);


    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={() => togglePresetManager(false)}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
             {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg pointer-events-none z-[60]">
                    <div className="p-8 border-4 border-dashed border-[var(--accent-color)] rounded-lg text-center">
                        <p className="text-2xl font-bold text-[var(--accent-color)]">Drop Project File to Import</p>
                    </div>
                </div>
            )}
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-[var(--border-color)] w-full max-w-lg h-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <h3 className="text-lg font-bold text-[var(--text-light)] uppercase tracking-widest">PROJECT LIBRARY</h3>
                    <button onClick={() => togglePresetManager(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>
                
                <main className="flex-grow p-2 overflow-hidden flex flex-col">
                    <div className="bg-black/70 rounded border border-[var(--border-color)]/50 overflow-y-auto no-scrollbar flex-grow">
                        <ul className="p-1">
                            {presets.map((preset, index) => (
                                <li key={`${preset.name}-${index}`} className="group flex items-center space-x-1 pr-1 my-0.5">
                                    <button
                                        onClick={() => loadPreset(preset)}
                                        className={`flex-grow text-left text-xs font-mono p-2 rounded-sm transition-colors duration-100 ${
                                            currentPresetName === preset.name 
                                            ? 'bg-[var(--accent-color)] text-[var(--text-dark)] font-bold' 
                                            : 'hover:bg-white/10 text-[var(--text-light)]'
                                        }`}
                                    >
                                        {preset.name}
                                    </button>
                                    <button
                                        onClick={(e) => handleRenameClick(e, preset.name)}
                                        disabled={isViewerMode}
                                        className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-yellow-800 hover:bg-yellow-700 transition-opacity text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Rename Project"
                                    >
                                        EDIT
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, preset.name)}
                                        disabled={isViewerMode}
                                        className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-red-800 hover:bg-red-700 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete Project"
                                    >
                                        DEL
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </main>
                
                <footer className="p-4 border-t border-[var(--border-color)]/50 bg-black/20 rounded-b-lg flex-shrink-0">
                    <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                            <input 
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                placeholder="New Project Name..."
                                className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-2 placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none"
                            />
                            <button onClick={handleSaveClick} disabled={!newPresetName.trim()} className="px-3 text-xs font-bold rounded-sm bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">SAVE AS</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             <button 
                                onClick={() => overwritePreset(currentPresetName)} 
                                disabled={!canOverwrite}
                                className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-[var(--accent-color)] hover:bg-[var(--accent-color-active)] border border-[var(--accent-color)] text-[var(--text-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent-color)]"
                            >
                                OVERWRITE '{currentPresetName}'
                            </button>
                            <button 
                                onClick={saveCurrentSessionAsNewProject} 
                                className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-green-600 hover:bg-green-500 border border-green-500 text-white transition-colors"
                            >
                                SAVE CURRENT SESSION
                            </button>
                            <button 
                                onClick={() => saveCurrentProjectAndExtractPresets()} 
                                disabled={!canOverwrite}
                                title="Save the current project and create an instrument preset for each track."
                                className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                SAVE &amp; EXTRACT PRESETS
                            </button>
                        </div>

                        <div className="border-t border-[var(--border-color)]/50 pt-3 mt-1">
                            <div className="flex flex-col space-y-2">
                                <div className="flex space-x-2">
                                    <button onClick={exportProject} className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 text-white transition-colors">EXPORT CURRENT</button>
                                    <label className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 text-white transition-colors text-center cursor-pointer">
                                        IMPORT
                                        <input 
                                            type="file" 
                                            onChange={handleProjectFileChange} 
                                            className="hidden" 
                                            accept=".fm8r-project,application/json,.json" 
                                        />
                                    </label>
                                </div>
                                <button onClick={saveAllProjects} className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-green-700 hover:bg-green-600 border border-green-600 text-white transition-colors">SAVE ALL PROJECTS TO FILE</button>
                            </div>
                            <p className="text-center text-[10px] text-neutral-500 mt-2">
                                or drag & drop a project file onto this window
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default React.memo(PresetManager);
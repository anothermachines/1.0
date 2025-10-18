import React, { useState, useMemo, useRef } from 'react';
import { InstrumentPreset, TrackType } from '../types';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';

interface InstrumentPresetManagerProps {
    trackType: TrackType;
    presets: InstrumentPreset[];
    onSave: (trackType: TrackType, name: string) => void;
    onLoad: (preset: InstrumentPreset) => void;
    onDelete: (trackType: TrackType, name: string) => void;
    onRandomize: () => void;
    loadedPresetName?: string | null;
    onImportInstrumentPresets: (file: File) => void;
    onExportInstrumentPresets: (trackType: TrackType) => void;
}

const PresetListItem: React.FC<{
  preset: InstrumentPreset;
  isLoaded: boolean;
  onLoad: () => void;
  onDelete: (name: string) => void;
}> = ({ preset, isLoaded, onLoad, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(preset.name);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000); // Reset after 3s
    }
  };

  return (
    <div 
      className={`group flex items-center justify-between p-1 rounded-sm transition-colors duration-150 cursor-pointer ${isLoaded ? 'bg-black/40' : 'hover:bg-white/5'}`}
      onDoubleClick={onLoad}
    >
      <span className={`text-xs font-mono truncate ${isLoaded ? 'text-[var(--accent-color)] font-bold' : 'text-neutral-300'}`}>
        {preset.name}
      </span>
      <div className="flex items-center space-x-1">
        <button
          onClick={handleDeleteClick}
          className={`px-2 py-1 text-[10px] font-bold rounded-sm border transition-all duration-200 w-16 text-center
            ${confirmDelete
              ? 'bg-red-500 border-red-400 text-white'
              : 'bg-neutral-700 border-neutral-600 text-neutral-300 opacity-0 group-hover:opacity-100'
            }`}
        >
          {confirmDelete ? 'CONFIRM' : 'DELETE'}
        </button>
        <button
          onClick={onLoad}
          className="px-3 py-1 text-[10px] font-bold rounded-sm border bg-neutral-600 border-neutral-500 text-white hover:bg-neutral-500 transition-colors"
        >
          LOAD
        </button>
      </div>
    </div>
  );
};

const InstrumentPresetManager: React.FC<InstrumentPresetManagerProps> = ({ 
    trackType, presets, onSave, onLoad, onDelete, onRandomize, loadedPresetName,
    onImportInstrumentPresets, onExportInstrumentPresets
}) => {
    const { isViewerMode, triggerViewerModeInteraction } = useStore(state => ({
        isViewerMode: state.isViewerMode,
        triggerViewerModeInteraction: state.triggerViewerModeInteraction,
    }), shallow);
    
    const [name, setName] = useState('');
    const importRef = useRef<HTMLInputElement>(null);

    const filteredPresets = useMemo(() => 
        presets.filter(p => p.type === trackType).sort((a, b) => a.name.localeCompare(b.name)), 
        [presets, trackType]
    );

    const handleSave = () => {
        if (isViewerMode) {
            triggerViewerModeInteraction();
            return;
        }
        if (name.trim()) {
            onSave(trackType, name.trim());
            setName('');
        }
    };

    const handleImportClick = () => {
        if (isViewerMode) {
            triggerViewerModeInteraction();
            return;
        }
        importRef.current?.click();
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportInstrumentPresets(e.target.files[0]);
        }
        e.target.value = ''; // Reset input
    };
    
    const handleExportClick = () => {
        if (isViewerMode) {
            triggerViewerModeInteraction();
            return;
        }
        onExportInstrumentPresets(trackType);
    };

    return (
        <div className="bg-[var(--bg-panel-dark)] p-2 border-b border-[var(--border-color)] flex-shrink-0">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">Instrument Preset</h3>
            <div className="flex flex-col gap-2">
                <div className="bg-black/30 rounded border border-neutral-700/50 h-32 overflow-y-auto no-scrollbar p-1">
                  {filteredPresets.length > 0 ? (
                    filteredPresets.map(p => (
                      <PresetListItem
                        key={p.name}
                        preset={p}
                        isLoaded={p.name === loadedPresetName}
                        onLoad={() => onLoad(p)}
                        onDelete={() => onDelete(trackType, p.name)}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-500 text-xs">No presets for this type.</div>
                  )}
                </div>

                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Save new preset as..."
                        className="flex-grow w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-xs px-2 py-1.5 placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none"
                    />
                     <button 
                        onClick={handleSave} 
                        disabled={!name.trim() || isViewerMode}
                        className={`px-3 text-xs font-bold rounded-sm bg-[var(--accent-color)] hover:bg-[var(--accent-color-active)] border border-[var(--accent-color)] text-[var(--text-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent-color)]`}
                    >
                        SAVE
                    </button>
                </div>
                 <div className="flex gap-2">
                    <button 
                        onClick={onRandomize}
                        className="w-full px-3 py-2 text-xs font-bold rounded-sm bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white transition-colors"
                    >
                        RANDOMIZE
                    </button>
                    <button onClick={handleImportClick} className={`w-full px-3 py-2 text-xs font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 text-white transition-colors ${isViewerMode ? 'opacity-50 cursor-not-allowed' : ''}`}>IMPORT</button>
                    <button onClick={handleExportClick} className={`w-full px-3 py-2 text-xs font-bold rounded-sm bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 text-white transition-colors ${isViewerMode ? 'opacity-50 cursor-not-allowed' : ''}`}>EXPORT</button>
                    <input type="file" ref={importRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".json" />
                </div>
            </div>
        </div>
    );
};

export default React.memo(InstrumentPresetManager);
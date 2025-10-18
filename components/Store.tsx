import React, { useMemo } from 'react';
import { ExpansionPack } from '../types';
import { useStore } from '../store/store';
import { EXPANSION_PACKS } from '../expansionPacks';

interface PackCardProps {
    pack: ExpansionPack; 
    onInstall: (pack: ExpansionPack) => void; 
    isInstalled: boolean;
}

const PackCard: React.FC<PackCardProps> = ({ pack, onInstall, isInstalled }) => {
    return (
        <div className="bg-[var(--bg-panel-dark)] rounded-lg border border-neutral-700/80 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:border-[var(--accent-color)]/50 hover:-translate-y-1">
            <div className="w-full h-48 bg-black relative overflow-hidden group">
                {pack.coverArt && <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: pack.coverArt }} />}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
                <h4 className="text-xl font-bold text-[var(--accent-color)]">{pack.name}</h4>
                <p className="text-sm text-neutral-400 mb-2">by {pack.artist}</p>
                <p className="text-xs text-neutral-300 font-sans flex-grow mb-4 line-clamp-3">{pack.description}</p>
                
                {pack.gumroadUrl ? (
                    <a
                        href={pack.gumroadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full block text-center mt-4 px-4 py-3 text-sm font-bold rounded-md border transition-colors bg-pink-600 hover:bg-pink-500 border-pink-500 text-white"
                    >
                        GET ON GUMROAD
                    </a>
                ) : (
                    <button
                        onClick={() => onInstall(pack)}
                        disabled={isInstalled}
                        className={`w-full mt-4 px-4 py-3 text-sm font-bold rounded-md border transition-colors ${
                            isInstalled 
                            ? 'bg-green-700/80 border-green-600/50 text-white/90 cursor-default' 
                            : 'bg-teal-600 hover:bg-teal-500 border-teal-500 text-white'
                        }`}
                    >
                       {isInstalled ? 'INSTALLED' : 'INSTALL'}
                    </button>
                )}
            </div>
        </div>
    );
};

const Store: React.FC = () => {
    const { toggleStore, installPack, installedPacks, customPacks } = useStore(state => ({
        toggleStore: state.toggleStore,
        installPack: state.installPack,
        installedPacks: new Set(state.installedPacks),
        customPacks: state.customPacks,
    }));

    const allPacks = useMemo(() => {
        // Prevent duplicates if a custom pack has the same ID as a factory pack
        const factoryPackIds = new Set(EXPANSION_PACKS.map(p => p.id));
        const uniqueCustomPacks = customPacks.filter(p => !factoryPackIds.has(p.id));
        return [...uniqueCustomPacks, ...EXPANSION_PACKS];
    }, [customPacks]);
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => toggleStore(false)}>
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-[var(--border-color)] w-full max-w-4xl h-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: '0 0 25px 5px rgba(var(--accent-rgb), 0.25)' }}
            >
                <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <h3 className="text-lg font-bold text-[var(--text-light)] uppercase tracking-widest">EXPANSION STORE</h3>
                    <button onClick={() => toggleStore(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>
                
                <main className="flex-grow bg-black/70 rounded m-4 mt-0 border border-[var(--border-color)]/50 overflow-y-auto no-scrollbar p-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {allPacks.map(pack => (
                           <PackCard 
                               key={pack.id} 
                               pack={pack}
                               isInstalled={installedPacks.has(pack.id)}
                               onInstall={installPack}
                           />
                       ))}
                   </div>
                </main>
            </div>
        </div>
    );
};

export default Store;
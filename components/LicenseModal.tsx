import React, { useState } from 'react';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);


const LicenseModal: React.FC = () => {
    const { toggleLicenseModal, setLicenseKey } = useStore(state => ({
        toggleLicenseModal: state.toggleLicenseModal,
        setLicenseKey: state.setLicenseKey,
    }), shallow);
    const [key, setKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);

    const handleUnlock = () => {
        if (key.trim()) {
            setLicenseKey(key.trim());
        }
    };

    const features = [
        { name: 'Sound Engines', trial: '3 of 8', full: 'All 8 Engines' },
        { name: 'Song / Arrangement Mode', trial: false, full: true },
        { name: 'Advanced Export (Stems)', trial: false, full: true },
        { name: 'Share Jams as Video', trial: false, full: true },
        { name: 'Save/Load Projects', trial: true, full: true },
        { name: 'MIDI Mapping', trial: true, full: true },
        { name: 'Future Updates', trial: false, full: true },
    ];

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => toggleLicenseModal(false)}
        >
            <div 
                className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-panel-dark)] rounded-lg border border-yellow-400/30 w-full max-w-4xl flex flex-col shadow-2xl animate-slide-up" 
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: '0 0 45px 5px rgba(253, 224, 71, 0.2)' }}
            >
                <header className="flex justify-between items-center p-4 border-b border-yellow-400/20 flex-shrink-0">
                    <h3 className="text-xl font-bold text-yellow-300 uppercase tracking-widest">Unlock Full Version</h3>
                    <button onClick={() => toggleLicenseModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-neutral-400 hover:text-white bg-[var(--bg-control)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors" aria-label="Close">&times;</button>
                </header>

                <main className="p-6 overflow-y-auto no-scrollbar space-y-6">
                    {/* Feature Comparison Table */}
                    <div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-2 text-sm font-bold uppercase text-neutral-400">Feature</th>
                                    <th className="p-2 text-sm font-bold uppercase text-neutral-400 text-center">Trial</th>
                                    <th className="p-2 text-sm font-bold uppercase text-yellow-300 text-center">Full Version</th>
                                </tr>
                            </thead>
                            <tbody>
                                {features.map((feature, index) => (
                                    <tr key={index} className="border-t border-neutral-700/50">
                                        <td className="p-2.5 text-sm text-neutral-200">{feature.name}</td>
                                        <td className="p-2.5 text-center">
                                            {typeof feature.trial === 'boolean' ? (
                                                feature.trial ? <CheckIcon className="text-green-500 mx-auto" /> : <XIcon className="text-red-500 mx-auto" />
                                            ) : (
                                                <span className="text-neutral-400 text-xs">{feature.trial}</span>
                                            )}
                                        </td>
                                        <td className="p-2.5 text-center">
                                            {typeof feature.full === 'boolean' ? (
                                                feature.full ? <CheckIcon className="text-green-400 mx-auto" /> : <XIcon className="text-red-500 mx-auto" />
                                            ) : (
                                                <span className="text-yellow-300 font-bold">{feature.full}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Monthly Plan */}
                        <div className="bg-neutral-800/50 rounded-lg border border-neutral-700 p-6 flex flex-col items-center text-center transition-transform hover:scale-105">
                            <h4 className="text-lg font-bold text-neutral-200 uppercase">Monthly</h4>
                            <p className="text-4xl font-bold text-white my-2">€9.99</p>
                            <p className="text-xs text-neutral-400 mb-6">per month</p>
                            <a href="https://anothermachines.gumroad.com/l/fm8r?variant=Monthly" target="_blank" rel="noopener noreferrer" className="w-full block px-4 py-3 text-base font-bold rounded-md bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 text-white transition-colors">
                                Choose Monthly
                            </a>
                        </div>
                        {/* Quarterly Plan */}
                        <div className="bg-neutral-800/50 rounded-lg border border-neutral-700 p-6 flex flex-col items-center text-center transition-transform hover:scale-105">
                            <h4 className="text-lg font-bold text-neutral-200 uppercase">Quarterly</h4>
                            <p className="text-4xl font-bold text-white my-2">€24.99</p>
                            <p className="text-xs text-neutral-400 mb-6">per 3 months (Save 15%)</p>
                             <a href="https://anothermachines.gumroad.com/l/fm8r?variant=Quarterly" target="_blank" rel="noopener noreferrer" className="w-full block px-4 py-3 text-base font-bold rounded-md bg-neutral-600 hover:bg-neutral-500 border border-neutral-500 text-white transition-colors">
                                Choose Quarterly
                            </a>
                        </div>
                        {/* Annual Plan */}
                        <div className="bg-yellow-500/10 rounded-lg border-2 border-yellow-400 p-6 flex flex-col items-center text-center relative overflow-hidden transition-transform hover:scale-105">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold uppercase px-3 py-1 rounded-bl-lg">Best Value</div>
                            <h4 className="text-lg font-bold text-yellow-300 uppercase">Annual</h4>
                            <p className="text-4xl font-bold text-white my-2">€79.99</p>
                            <p className="text-xs text-neutral-400 mb-6">per year (Save 33%)</p>
                            <a href="https://anothermachines.gumroad.com/l/fm8r?variant=Annual%20(Best%20Value)" target="_blank" rel="noopener noreferrer" className="w-full block px-4 py-3 text-base font-bold rounded-md bg-yellow-500 hover:bg-yellow-400 border border-yellow-400 text-black transition-colors shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                                Choose Annual
                            </a>
                        </div>
                    </div>

                    {/* Existing Key Input */}
                    <div className="text-center pt-4 border-t border-neutral-700/50">
                        {showKeyInput ? (
                            <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
                                 <input 
                                    type="text"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    placeholder="FM8R-XXXX-XXXX-XXXX-XXXX"
                                    className="w-full bg-[var(--bg-control)] border border-[var(--border-color)] rounded-sm text-lg px-3 py-3 font-mono placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                                />
                                <button onClick={handleUnlock} className="w-full px-4 py-3 text-base font-bold rounded-md bg-green-600 hover:bg-green-500 border border-green-500 text-white transition-colors">
                                    Activate Key
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setShowKeyInput(true)} className="text-sm text-neutral-400 hover:text-white hover:underline">
                                Already have a license key?
                            </button>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LicenseModal;
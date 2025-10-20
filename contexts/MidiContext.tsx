import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { MidiMapTarget, MidiMapping } from '../types';
import { useStore } from '../store/store';

interface MidiContextState {
    isLearning: boolean;
    learningTarget: MidiMapTarget | null;
    setLearningTarget: (target: MidiMapTarget) => void;
    toggleLearningMode: () => void;
    inputs: MIDIInput[];
    outputs: MIDIOutput[];
    selectedInputId: string | null;
    setSelectedInputId: (id: string | null) => void;
    selectedOutputId: string | null;
    setSelectedOutputId: (id: string | null) => void;
    mappings: MidiMapping[];
    setMappings: React.Dispatch<React.SetStateAction<MidiMapping[]>>;
}

export const MidiContext = createContext<MidiContextState | undefined>(undefined);

export const useMidiMapping = () => {
    const context = useContext(MidiContext);
    if (!context) {
        console.warn('useMidiMapping must be used within a MidiContextProvider. MIDI Learn will be disabled for this component.');
        return {
            isLearning: false,
            learningTarget: null,
            mapTarget: (target: MidiMapTarget) => {
                console.warn('MIDI learn action triggered, but context is not available.', target);
            },
        };
    }
    return {
        isLearning: context.isLearning,
        learningTarget: context.learningTarget,
        mapTarget: context.setLearningTarget,
    };
};

interface MidiContextProviderProps {
    children: ReactNode;
}

export const MidiContextProvider: React.FC<MidiContextProviderProps> = ({ children }) => {
    const [inputs, setInputs] = useState<MIDIInput[]>([]);
    const [outputs, setOutputs] = useState<MIDIOutput[]>([]);
    const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
    const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
    const [isLearning, setIsLearning] = useState(false);
    const [learningTarget, setLearningTarget] = useState<MidiMapTarget | null>(null);

    const selectedInputIdRef = useRef(selectedInputId);
    selectedInputIdRef.current = selectedInputId;
    const selectedOutputIdRef = useRef(selectedOutputId);
    selectedOutputIdRef.current = selectedOutputId;

    const [mappings, setMappings] = useState<MidiMapping[]>(() => {
        try {
            const saved = localStorage.getItem('fm8r-midi-mappings');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('fm8r-midi-mappings', JSON.stringify(mappings));
    }, [mappings]);
    
    const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
        const [status, data1, data2] = event.data;

        if (status >= 0xF8) {
            const { midiSyncSource, handleMidiSyncMessage } = useStore.getState();
            if (midiSyncSource !== 'internal') {
                handleMidiSyncMessage(status);
            }
            return;
        }

        const command = status >> 4;
        const channel = status & 0xf;

        if (isLearning && learningTarget) {
            let newMapping: MidiMapping | null = null;
            if (command === 11) { // CC for knobs/faders
                newMapping = {
                    message: { type: 'cc', channel, key: data1 },
                    target: learningTarget
                };
            } else if (command === 9 && data2 > 0) { // Note On for buttons
                newMapping = {
                    message: { type: 'noteon', channel, key: data1 },
                    target: learningTarget
                };
            }

            if (newMapping) {
                setMappings(prev => {
                    const filtered = prev.filter(m => 
                        m.target.path !== learningTarget.path &&
                        !(m.message.type === newMapping!.message.type && m.message.key === newMapping!.message.key && m.message.channel === newMapping!.message.channel)
                    );
                    return [...filtered, newMapping!];
                });
                setLearningTarget(null);
                return;
            }
        }

        const mapping = mappings.find(m =>
            m.message.channel === channel &&
            m.message.key === data1 &&
            (
                (m.message.type === 'cc' && command === 11) ||
                (m.message.type === 'noteon' && (command === 9 || command === 8))
            )
        );

        if (mapping) {
            useStore.getState().handleMidiMessage(mapping, data2, command);
            return;
        }
    
    }, [isLearning, learningTarget, mappings, setMappings]);
    
    const toggleLearningMode = useCallback(() => {
        setIsLearning(prev => {
            const nextState = !prev;
            if (!nextState) { // Exiting learn mode
                setLearningTarget(null);
            }
            return nextState;
        });
    }, []);

    const updateDevices = useCallback((midiAccess: MIDIAccess) => {
        const newInputs = Array.from(midiAccess.inputs.values());
        const newOutputs = Array.from(midiAccess.outputs.values());
        setInputs(newInputs);
        setOutputs(newOutputs);
        
        const isSelectedInputConnected = newInputs.some(i => i.id === selectedInputIdRef.current);
        if (!isSelectedInputConnected && newInputs.length > 0) {
            setSelectedInputId(newInputs[0].id);
        }
        const isSelectedOutputConnected = newOutputs.some(o => o.id === selectedOutputIdRef.current);
        if (!isSelectedOutputConnected && newOutputs.length > 0) {
            setSelectedOutputId(newOutputs[0].id);
        }
    }, []);

    useEffect(() => {
        let midiAccess: MIDIAccess | null = null;
        
        const onStateChange = () => {
            if (midiAccess) {
                updateDevices(midiAccess);
            }
        };

        const setupMidi = async () => {
            if (navigator.requestMIDIAccess) {
                try {
                    const access = await navigator.requestMIDIAccess({ sysex: true });
                    midiAccess = access;
                    updateDevices(midiAccess);
                    midiAccess.onstatechange = onStateChange;
                } catch (error) {
                    console.error("MIDI access denied:", error);
                }
            } else {
                console.warn("Web MIDI API is not supported in this browser.");
            }
        };

        setupMidi();

        return () => {
            if (midiAccess) {
                midiAccess.onstatechange = null;
            }
        };
    }, [updateDevices]);

    useEffect(() => {
        inputs.forEach(input => {
            input.onmidimessage = null;
        });

        const selectedInput = inputs.find(input => input.id === selectedInputId);

        if (selectedInput) {
            selectedInput.onmidimessage = handleMidiMessage;
        }

        return () => {
            if (selectedInput) {
                selectedInput.onmidimessage = null;
            }
        };
    }, [selectedInputId, inputs, handleMidiMessage]);
    
    const contextValue: MidiContextState = {
        isLearning,
        learningTarget,
        setLearningTarget,
        toggleLearningMode,
        inputs,
        outputs,
        selectedInputId,
        setSelectedInputId,
        selectedOutputId,
        setSelectedOutputId,
        mappings,
        setMappings,
    };
    
    return (
        <MidiContext.Provider value={contextValue}>
            {children}
        </MidiContext.Provider>
    );
};
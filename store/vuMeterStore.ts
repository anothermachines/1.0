import { create } from 'zustand';

interface VUMeterState {
    audioLevels: Record<number, number>;
    masterLevel: number;
}

export const useVUMeterStore = create<VUMeterState>(() => ({
    audioLevels: {},
    masterLevel: 0,
}));

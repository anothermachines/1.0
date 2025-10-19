import { Preset } from './types';
import { deepClone } from './utils';
import { 
    DEMO_DEFAULT_PROJECT, 
    LICENSED_DEFAULT_PROJECT,
    stygianPath,
    systemCollapse,
    polyrhythmicRitual,
    ethericDub,
    machineCult,
    fractalGateway,
    quantumEntanglement
} from './factoryProjects';

export const newProjectPreset: Preset = deepClone(LICENSED_DEFAULT_PROJECT);
newProjectPreset.name = "Placeholder"; // Name will be overridden on save

export const INITIAL_PRESET_LIBRARY: Preset[] = [
    deepClone(LICENSED_DEFAULT_PROJECT),
    deepClone(DEMO_DEFAULT_PROJECT),
    deepClone(stygianPath),
    deepClone(systemCollapse),
    deepClone(polyrhythmicRitual),
    deepClone(ethericDub),
    deepClone(machineCult),
    deepClone(fractalGateway),
    deepClone(quantumEntanglement),
];
import { Preset } from './types';
import { LICENSED_DEFAULT_PROJECT, DEMO_DEFAULT_PROJECT, LEVEL_UP_PROJECT } from './factoryProjects';
import { deepClone } from './utils';

export const newProjectPreset: Preset = deepClone(LICENSED_DEFAULT_PROJECT);

export const INITIAL_PRESET_LIBRARY: Preset[] = [
    deepClone(DEMO_DEFAULT_PROJECT),
    deepClone(LEVEL_UP_PROJECT),
];
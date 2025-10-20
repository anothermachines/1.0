import { InstrumentPreset } from './types';
import { TECHNO_PRESET_LIBRARY } from './store/technoPresetLibrary';

// FIX: Flatten the object of arrays into a single array of presets to match the expected type InstrumentPreset[].
// The previous object structure caused a `presets.filter is not a function` error.
export const INITIAL_INSTRUMENT_PRESET_LIBRARY: InstrumentPreset[] = Object.values(TECHNO_PRESET_LIBRARY).flat();

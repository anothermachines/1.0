import { ControlScript } from './control-script';

// Registry of known controller names and their corresponding script modules.
// The key is a substring to look for in the MIDI device name.
export const SCRIPT_REGISTRY: Record<string, () => Promise<{ default: new (...args: any[]) => ControlScript }>> = {
  'LKMK3': () => import('./novation-launchkey-mini-mk3').then(m => ({ default: m.NovationLaunchkeyMiniMk3Script })),
  // Add more controllers here in the future
  // 'APC Mini': () => import('./akai-apc-mini'),
};
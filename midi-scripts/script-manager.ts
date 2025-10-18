import { useStore } from '../store/store';
import { ControlScript } from './control-script';
import { SCRIPT_REGISTRY } from './script-registry';


export class ScriptManager {
  private getState: typeof useStore.getState;
  private setState: typeof useStore.setState;
  public activeScript: ControlScript | null = null;

  constructor(getState: typeof useStore.getState, setState: typeof useStore.setState) {
    this.getState = getState;
    this.setState = setState;
  }

  public async findAndLoadScriptForDevice(
    input: MIDIInput,
    output: MIDIOutput | undefined
  ): Promise<ControlScript | null> {
    const deviceName = input.name || '';
    
    // Find a matching script in the registry by ignoring whitespace and case
    const deviceNameUpper = deviceName.toUpperCase().replace(/\s+/g, '');
    const matchingKey = Object.keys(SCRIPT_REGISTRY).find(key => 
      deviceNameUpper.includes(key.toUpperCase().replace(/\s+/g, ''))
    );

    if (matchingKey) {
      try {
        const module = await SCRIPT_REGISTRY[matchingKey]();
        const ScriptClass = module.default;
        
        // Instantiate the script, passing dependencies
        this.activeScript = new ScriptClass(this.getState, this.setState, output);
        console.log(`Successfully loaded control script for ${deviceName}`);
        return this.activeScript;
      } catch (error) {
        console.error(`Failed to load script for ${deviceName}:`, error);
        return null;
      }
    }

    return null; // No script found
  }

  public getActiveScript(): ControlScript | null {
    return this.activeScript;
  }

  public unloadScript() {
    if (this.activeScript) {
      this.activeScript.destroy();
      this.activeScript = null;
    }
  }
}
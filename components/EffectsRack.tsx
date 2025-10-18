import React from 'react';
import { GlobalFXParams, Track } from '../types';
import { useStore } from '../store/store';
import Knob from './Knob';
import { TIME_DIVISIONS } from '../constants';
import Selector from './Selector';
import { shallow } from 'zustand/shallow';

const Section: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className="px-2 pb-3">
        <div className="bg-[var(--bg-panel-dark)] rounded-md border border-[var(--border-color)]/50 p-2">
            <h3 className="text-sm font-bold text-[var(--accent-color)] uppercase tracking-wider mb-1 text-center" style={{textShadow: '0 0 5px var(--accent-color)'}}>{title}</h3>
            <div className={`grid gap-x-2 gap-y-8 ${className}`}>
                {children}
            </div>
        </div>
    </div>
);

const EffectsRack: React.FC = () => {
  const { fxParams, tracks, setGlobalFxParam, isSpectator, triggerViewerModeInteraction } = useStore(state => ({
    fxParams: state.preset.globalFxParams,
    tracks: state.preset?.tracks || [],
    setGlobalFxParam: state.setGlobalFxParam,
    isSpectator: state.isSpectator,
    triggerViewerModeInteraction: state.triggerViewerModeInteraction,
  }), shallow);
  const onChange = setGlobalFxParam;

  const { reverb, delay, drive, compressor, masterFilter, character } = fxParams;
  
  const trackOptions = [
    { value: null, label: 'NONE' },
    ...tracks.map(t => ({ value: t.id, label: `${t.id+1}: ${t.name.toUpperCase()}` }))
  ];

  return (
    <div className="font-mono text-sm text-[var(--text-screen)] h-full overflow-y-auto no-scrollbar pt-2 min-h-0 bg-[var(--bg-chassis)]" data-tour-id="effects-rack">
        <Section title="MASTER FILTER" className="grid-cols-2 md:grid-cols-3">
          <Selector label="TYPE" 
            value={masterFilter.type} 
            options={[{value: 'lowpass', label: 'LP'}, {value: 'highpass', label: 'HP'}]}
            onChange={v => onChange('masterFilter', 'type', v)}
          />
          <Knob label="CUTOFF" value={masterFilter.cutoff} min={20} max={20000} onChange={v => onChange('masterFilter', 'cutoff', v)} unit="hz" mapInfo={{ path: 'globalFx.masterFilter.cutoff', label: 'Master Cutoff' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
          <Knob label="RESO" value={masterFilter.resonance} min={0.1} max={30} step={0.1} onChange={v => onChange('masterFilter', 'resonance', v)} mapInfo={{ path: 'globalFx.masterFilter.resonance', label: 'Master Reso' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
        </Section>
        
        <Section title="CHARACTER" className="grid-cols-2 md:grid-cols-3">
            <Selector label="MODE" 
              value={character.mode} 
              options={[
                  {value: 'saturate', label: 'SAT'}, 
                  {value: 'overdrive', label: 'OD'}, 
                  {value: 'bitcrush', label: 'CRUSH'},
                  {value: 'fold', label: 'FOLD'}
              ]}
              onChange={v => onChange('character', 'mode', v)}
            />
            <Knob label="AMOUNT" value={character.amount} min={0} max={100} step={1} onChange={v => onChange('character', 'amount', v)} mapInfo={{ path: 'globalFx.character.amount', label: 'Character Amt' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="MIX" value={character.mix} min={0} max={1} step={0.01} onChange={v => onChange('character', 'mix', v)} mapInfo={{ path: 'globalFx.character.mix', label: 'Character Mix' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
        </Section>
        
        <Section title="DELAY" className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col items-center">
             <div className="flex items-center justify-between w-full px-4 h-4 mb-1.5">
                 <span className="text-[var(--text-muted)] text-[10px] font-mono uppercase tracking-wider">{delay.timeSync ? 'DIV' : 'TIME'}</span>
                 <button onClick={() => onChange('delay', 'timeSync', !delay.timeSync)}
                    className={`px-1.5 text-[9px] font-bold rounded-sm transition-all border ${delay.timeSync ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color)]' : 'bg-[var(--bg-control)] text-[var(--text-light)] border-[var(--border-color)]'}`}
                    >
                    SYNC
                 </button>
            </div>
            {delay.timeSync ? (
                <Selector label="" value={String(delay.timeDivision)}
                    options={TIME_DIVISIONS.map(d => ({value: String(d.value), label: d.name}))}
                    onChange={v => onChange('delay', 'timeDivision', Number(v))}
                />
            ) : (
                <Knob label="" value={delay.time} min={0.01} max={2} step={0.01} onChange={v => onChange('delay', 'time', v)} unit="s" size={40} mapInfo={{ path: 'globalFx.delay.time', label: 'Delay Time' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            )}
          </div>
          <Knob label="FDBK" value={delay.feedback} min={0} max={0.92} step={0.01} onChange={v => onChange('delay', 'feedback', v)} size={40} mapInfo={{ path: 'globalFx.delay.feedback', label: 'Delay Fdbk' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
          <Knob label="TONE" value={delay.tone} min={500} max={15000} onChange={v => onChange('delay', 'tone', v)} size={40} mapInfo={{ path: 'globalFx.delay.tone', label: 'Delay Tone' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
          <Knob label="MIX" value={delay.mix} min={0} max={1} step={0.01} onChange={v => onChange('delay', 'mix', v)} size={40} mapInfo={{ path: 'globalFx.delay.mix', label: 'Delay Mix' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
        </Section>

        <Section title="REVERB" className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Knob label="DECAY" value={reverb.decay} min={0.1} max={5} step={0.01} onChange={v => onChange('reverb', 'decay', v)} size={40} mapInfo={{ path: 'globalFx.reverb.decay', label: 'Reverb Decay' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="DAMP" value={reverb.damping} min={1000} max={20000} onChange={v => onChange('reverb', 'damping', v)} size={40} mapInfo={{ path: 'globalFx.reverb.damping', label: 'Reverb Damp' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="PRE-DLY" value={reverb.preDelay} min={0} max={0.5} step={0.001} onChange={v => onChange('reverb', 'preDelay', v)} size={40} unit="s" mapInfo={{ path: 'globalFx.reverb.preDelay', label: 'Reverb PreDelay' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="MIX" value={reverb.mix} min={0} max={1} step={0.01} onChange={v => onChange('reverb', 'mix', v)} size={40} mapInfo={{ path: 'globalFx.reverb.mix', label: 'Reverb Mix' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
        </Section>
        
        <Section title="DRIVE" className="grid-cols-3">
            <Knob label="AMOUNT" value={drive.amount} min={0} max={100} onChange={v => onChange('drive', 'amount', v)} mapInfo={{ path: 'globalFx.drive.amount', label: 'Drive Amount' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="TONE" value={drive.tone} min={1000} max={15000} onChange={v => onChange('drive', 'tone', v)} mapInfo={{ path: 'globalFx.drive.tone', label: 'Drive Tone' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="MIX" value={drive.mix} min={0} max={1} step={0.01} onChange={v => onChange('drive', 'mix', v)} mapInfo={{ path: 'globalFx.drive.mix', label: 'Drive Mix' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
        </Section>

        <Section title="MASTER COMPRESSOR" className="grid-cols-3 sm:grid-cols-4">
             <div className="flex flex-col items-center space-y-2 justify-end h-full pb-1">
                <button
                    onClick={() => onChange('compressor', 'enabled', !compressor.enabled)}
                    className={`w-12 h-12 rounded-md flex items-center justify-center font-bold text-sm transition-all duration-200
                        ${compressor.enabled 
                            ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.6),inset_0_2px_4px_rgba(0,0,0,0.4),inset_0_-2px_4px_rgba(255,255,255,0.2)] border border-orange-400'
                            : 'bg-neutral-800 text-neutral-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-black'
                        }`
                    }
                    title={compressor.enabled ? "Compressor Engaged" : "Compressor Bypassed"}
                    disabled={isSpectator}
                >
                    IN
                </button>
            </div>
            <Knob label="THRESH" value={compressor.threshold} min={-60} max={0} onChange={v => onChange('compressor', 'threshold', v)} unit="db" mapInfo={{ path: 'globalFx.compressor.threshold', label: 'Comp Thresh' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="RATIO" value={compressor.ratio} min={1} max={20} step={0.1} onChange={v => onChange('compressor', 'ratio', v)} mapInfo={{ path: 'globalFx.compressor.ratio', label: 'Comp Ratio' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="KNEE" value={compressor.knee} min={0} max={40} step={1} onChange={v => onChange('compressor', 'knee', v)} mapInfo={{ path: 'globalFx.compressor.knee', label: 'Comp Knee' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="ATTACK" value={compressor.attack} min={0.001} max={0.2} step={0.001} onChange={v => onChange('compressor', 'attack', v)} unit="s" mapInfo={{ path: 'globalFx.compressor.attack', label: 'Comp Atk' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="RELEASE" value={compressor.release} min={0.01} max={1} step={0.01} onChange={v => onChange('compressor', 'release', v)} unit="s" mapInfo={{ path: 'globalFx.compressor.release', label: 'Comp Rel' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <Knob label="MAKEUP" value={compressor.makeup} min={0} max={24} step={0.1} onChange={v => onChange('compressor', 'makeup', v)} unit="db" mapInfo={{ path: 'globalFx.compressor.makeup', label: 'Comp Makeup' }} disabled={isSpectator} onDisabledClick={triggerViewerModeInteraction}/>
            <div className="col-span-full">
                <Selector label="SIDECHAIN SOURCE" 
                    value={compressor.sidechainSource}
                    options={trackOptions}
                    onChange={v => onChange('compressor', 'sidechainSource', v)}
                />
            </div>
        </Section>
    </div>
  );
};

export default React.memo(EffectsRack);
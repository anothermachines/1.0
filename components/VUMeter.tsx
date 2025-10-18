import React, { useEffect, useRef } from 'react';
import { useVUMeterStore } from '../store/vuMeterStore';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';

interface VUMeterProps {
    trackId?: number;
}

const VUMeter: React.FC<VUMeterProps> = ({ trackId }) => {
    const levelRef = useRef<HTMLDivElement>(null);
    const peakRef = useRef<HTMLDivElement>(null);
    const clipRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    
    const peakValue = useRef(0);
    const peakTimeoutRef = useRef<number>();
    const clipTimeoutRef = useRef<number>();
    const animationFrameId = useRef<number>();

    const { uiPerformanceMode } = useStore(state => ({
        uiPerformanceMode: state.uiPerformanceMode,
    }), shallow);

    useEffect(() => {
        if (uiPerformanceMode === 'off') {
            if (levelRef.current) levelRef.current.style.transform = 'scaleY(0)';
            if (glowRef.current) glowRef.current.style.transform = 'scaleY(0)';
            if (peakRef.current) peakRef.current.style.opacity = '0';
            if (clipRef.current) clipRef.current.style.opacity = '0';
            return;
        }

        const draw = () => {
            const level = (trackId !== undefined ? useVUMeterStore.getState().audioLevels[trackId] : useVUMeterStore.getState().masterLevel) || 0;

            if (level >= peakValue.current) {
                peakValue.current = level;
                clearTimeout(peakTimeoutRef.current);
                peakTimeoutRef.current = window.setTimeout(() => {
                    peakValue.current = 0;
                }, 1500);
            }

            if (level > 0.98) {
                if (clipRef.current) {
                    clipRef.current.style.opacity = '1';
                    clipRef.current.style.boxShadow = '0 0 6px 2px #ef4444';
                }
                clearTimeout(clipTimeoutRef.current);
                clipTimeoutRef.current = window.setTimeout(() => {
                    if (clipRef.current) {
                        clipRef.current.style.opacity = '0';
                        clipRef.current.style.boxShadow = 'none';
                    }
                }, 750);
            }

            const safeLevel = Math.min(1, Math.max(0, level));
            
            if (levelRef.current) {
                levelRef.current.style.transform = `scaleY(${safeLevel})`;
            }
            
            if (glowRef.current && uiPerformanceMode === 'high') {
                glowRef.current.style.transform = `scaleY(${safeLevel})`;
                let glowColor;
                if (safeLevel > 0.95) glowColor = '#ef4444'; // red-500
                else if (safeLevel > 0.8) glowColor = '#facc15'; // yellow-400
                else glowColor = '#4ade80'; // green-400
                
                // Opacity is included in the color `99` = ~60%
                glowRef.current.style.boxShadow = `0 0 8px 3px ${glowColor}99`;
                glowRef.current.style.opacity = '1';

            } else if (glowRef.current) {
                glowRef.current.style.opacity = '0';
            }


            if (peakRef.current) {
                if (peakValue.current > level && peakValue.current > 0.05) {
                    const peakHeight = Math.min(1, Math.max(0, peakValue.current)) * 100;
                    peakRef.current.style.bottom = `${peakHeight}%`;
                    peakRef.current.style.opacity = '1';
                } else {
                    peakRef.current.style.opacity = '0';
                }
            }
        };

        let intervalId: number | null = null;

        const startAnimation = () => {
            if (uiPerformanceMode === 'high') {
                const animate = () => {
                    draw();
                    animationFrameId.current = requestAnimationFrame(animate);
                };
                animationFrameId.current = requestAnimationFrame(animate);
            } else { // 'performance' mode
                intervalId = window.setInterval(draw, 100); // ~10fps
            }
        };
        
        startAnimation();

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (intervalId) {
                clearInterval(intervalId);
            }
            clearTimeout(peakTimeoutRef.current);
            clearTimeout(clipTimeoutRef.current);
        };
    }, [trackId, uiPerformanceMode]);

    return (
        <div className="w-4 h-full relative group">
            <div className="w-full h-full bg-neutral-900 rounded-sm overflow-hidden border-t border-b border-neutral-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative">
                <div
                    ref={glowRef}
                    className="absolute bottom-0 w-full"
                    style={{
                        transformOrigin: 'bottom',
                        transition: uiPerformanceMode === 'performance' ? 'transform 0.1s linear' : 'none',
                        willChange: 'transform'
                    }}
                />
                <div 
                    ref={levelRef}
                    className="absolute bottom-0 w-full h-full"
                    style={{ 
                        transformOrigin: 'bottom',
                        background: `linear-gradient(to top, #4ade80, #fde047 80%, #f87171 95%)`,
                        transition: uiPerformanceMode === 'performance' ? 'transform 0.1s linear' : 'none',
                        willChange: 'transform'
                    }}
                />
                <div ref={peakRef} className="absolute w-full h-1 bg-white" style={{ opacity: 0, zIndex: 1 }} />
                <div ref={clipRef} className="absolute top-0 w-full h-1 bg-red-500" style={{ opacity: 0, zIndex: 1 }} />
            </div>
        </div>
    );
};

export default React.memo(VUMeter);

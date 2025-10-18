import React, { useRef, useEffect } from 'react';
import { usePlaybackStore } from '../store/playbackStore';

interface VisualizerProps {
    id: string;
    width: number;
    height: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ id, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { audioEngine } = usePlaybackStore.getState();
        if (!audioEngine) return;

        const analyser = audioEngine.getMasterAnalyser();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);
            
            const barWidth = (width / bufferLength);
            let x = 0;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

            for(let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * height;
                
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [width, height]);

    return <canvas id={id} ref={canvasRef} width={width} height={height} style={{ background: 'transparent' }} />;
};

export default Visualizer;
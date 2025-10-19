import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
    analyserNode: AnalyserNode | null;
    bpm: number;
    palette: string[];
    mode: string;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    angle: number;
    spin: number;
}

const logoOuterPath = new Path2D("M26 2L1 13.5V36.5L26 48L51 36.5V13.5L26 2Z");
const logoInnerPath = new Path2D("M26 13L13 20V32L26 39L39 32V20L26 13Z");

const Visualizer = React.forwardRef<HTMLCanvasElement, VisualizerProps>(({ analyserNode, bpm, palette, mode }, ref) => {
    const animationFrameId = useRef<number>();
    const lastBeatTime = useRef(0);
    const beatProgress = useRef(1);
    const lastTime = useRef(0);
    
    // Particle containers for different modes
    const particlesRef = useRef<Particle[]>([]);
    const vectorscopeParticlesRef = useRef<Particle[]>([]);
    const strobeParticlesRef = useRef<Particle[]>([]);
    
    const timeDomainDataArray = useRef<Uint8Array | null>(null);
    const floatFreqDataArray = useRef<Float32Array | null>(null);
    const peakLevels = useRef<number[]>([]);
    const galaxyRotation = useRef(0);

    const drawHud = (
        time: number,
        canvas: HTMLCanvasElement, 
        ctx: CanvasRenderingContext2D, 
        data: { freqData: Uint8Array, timeData: Uint8Array }
    ) => {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.8);
        bgGrad.addColorStop(0, palette[0] + '1A');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        
        const radius = Math.min(width, height) * 0.3;
        const barCount = 128; 
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        for (let i = 0; i < barCount; i++) {
            const barHeight = Math.pow(data.freqData[i] / 255, 2) * (radius * 0.5);
            const angle = (i / barCount) * Math.PI * 2;
            
            ctx.save();
            ctx.rotate(angle);
            
            const lineGrad = ctx.createLinearGradient(0, radius, 0, radius + barHeight);
            lineGrad.addColorStop(0, palette[0] + '33');
            lineGrad.addColorStop(1, palette[1] + 'FF');
            ctx.strokeStyle = lineGrad;
            
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, radius);
            ctx.lineTo(0, radius + barHeight);
            ctx.stroke();
            
            ctx.restore();
        }
        ctx.restore();
        
        ctx.save();
        ctx.translate(centerX, centerY);
        const pulse = 1 + (1 - Math.cos(beatProgress.current * Math.PI)) * 0.05;
        ctx.scale(pulse * 6.0, pulse * 6.0);
        ctx.translate(-26, -25);
        
        ctx.shadowColor = palette[0];
        ctx.shadowBlur = (1 - beatProgress.current) * 10; // Reduced blur for performance

        ctx.strokeStyle = palette[1] + 'CC';
        ctx.fillStyle = "#05020cCC";

        ctx.lineWidth = 2.5;
        ctx.stroke(logoOuterPath);
        ctx.fill(logoOuterPath);
        
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = palette[1] + '66';
        ctx.stroke(logoInnerPath);

        ctx.restore();
    };

    const drawGalaxy = (
        time: number,
        canvas: HTMLCanvasElement, 
        ctx: CanvasRenderingContext2D, 
        data: { freqData: Uint8Array, timeData: Uint8Array },
        deltaTime: number
    ) => {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const bassLevel = (data.freqData[0] + data.freqData[1] + data.freqData[2]) / 3 / 255;
        const midLevel = (data.freqData[32] + data.freqData[33] + data.freqData[34]) / 3 / 255;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        updateAndDrawParticles(ctx, deltaTime, bassLevel, centerX, centerY, palette[1]);
        galaxyRotation.current += deltaTime * 0.05 * (1 + midLevel);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(galaxyRotation.current);

        const nebulaRadius = Math.min(width, height) * 0.6;
        const nebulaGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, nebulaRadius);
        nebulaGrad.addColorStop(0, palette[0] + '33');
        nebulaGrad.addColorStop(0.7, palette[2] + '11');
        nebulaGrad.addColorStop(1, palette[0] + '00');
        ctx.fillStyle = nebulaGrad;
        
        for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const size = Math.pow(data.freqData[i * 2] / 255, 2) * nebulaRadius * 0.8;
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(nebulaRadius * 0.4, 0, size, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(centerX, centerY);
        const pulse = 1 + bassLevel * 0.2;
        ctx.scale(pulse * 6.0, pulse * 6.0);
        ctx.translate(-26, -25);
        
        ctx.shadowColor = palette[0];
        ctx.shadowBlur = (1 - beatProgress.current) * 12; // Reduced blur for performance

        ctx.strokeStyle = palette[1] + 'FF';
        ctx.fillStyle = palette[0] + '88';

        ctx.lineWidth = 2.5;
        ctx.stroke(logoOuterPath);
        ctx.fill(logoOuterPath);
        
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = palette[1] + '99';
        ctx.stroke(logoInnerPath);

        ctx.restore();
    };

    const drawSpectrum = (
        time: number,
        canvas: HTMLCanvasElement, 
        ctx: CanvasRenderingContext2D, 
        data: { floatFreqData: Float32Array }
    ) => {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        const pulse = 1 + (1 - Math.cos(beatProgress.current * Math.PI * 2)) * 0.03;
        ctx.scale(pulse * 6.0, pulse * 6.0);
        ctx.translate(-26, -25);
        ctx.strokeStyle = palette[1] + '1A';
        ctx.lineWidth = 3;
        ctx.stroke(logoOuterPath);
        ctx.stroke(logoInnerPath);
        ctx.restore();

        const bufferLength = analyserNode!.frequencyBinCount;
        analyserNode!.getFloatFrequencyData(data.floatFreqData);
        
        const numBars = 128;
        if (peakLevels.current.length !== numBars) {
            peakLevels.current = new Array(numBars).fill(0);
        }

        const barGradient = ctx.createLinearGradient(0, height, 0, 0);
        barGradient.addColorStop(0, palette[0]);
        barGradient.addColorStop(0.6, palette[1]);
        barGradient.addColorStop(0.9, '#ef4444');

        const barWidth = width / numBars;
        const peakFalloff = 2.0;

        for (let i = 0; i < numBars; i++) {
            let sum = 0;
            const start = Math.floor(i * bufferLength / numBars);
            const end = Math.floor((i + 1) * bufferLength / numBars);
            for (let j = start; j < end; j++) {
                sum += data.floatFreqData[j];
            }
            const avgDb = (end > start) ? sum / (end - start) : analyserNode!.minDecibels;
            
            const { minDecibels, maxDecibels } = analyserNode!;
            const dbRange = maxDecibels - minDecibels;
            const normalizedDb = (avgDb - minDecibels) / dbRange;

            const barHeight = Math.max(0, Math.min(1, normalizedDb)) * height;
            const x = i * barWidth;
            
            if (barHeight > peakLevels.current[i]) {
                peakLevels.current[i] = barHeight;
            } else {
                peakLevels.current[i] -= peakFalloff;
            }
            
            ctx.fillStyle = barGradient;
            ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

            const peakY = height - peakLevels.current[i];
            if (peakY < height - 1) {
                 ctx.fillStyle = '#FFFFFFCC';
                 ctx.fillRect(x, peakY, barWidth - 1, 2);
            }
        }
    };

    const drawWaveform = (
        canvas: HTMLCanvasElement, 
        ctx: CanvasRenderingContext2D, 
        data: { timeData: Uint8Array }
    ) => {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(6.0, 6.0);
        ctx.translate(-26, -25);
        ctx.strokeStyle = palette[0] + '1A';
        ctx.lineWidth = 3;
        ctx.stroke(logoOuterPath);
        ctx.stroke(logoInnerPath);
        ctx.restore();

        analyserNode!.getByteTimeDomainData(data.timeData);
        const bufferLength = analyserNode!.fftSize;

        ctx.lineWidth = 2;
        ctx.strokeStyle = palette[1];
        ctx.shadowColor = palette[1];
        ctx.shadowBlur = 5;

        ctx.beginPath();
        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = data.timeData[i] / 128.0;
            const y = v * height / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    };

    const drawVectorscope = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        data: { timeData: Uint8Array },
        deltaTime: number
    ) => {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
    
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(6.0, 6.0);
        ctx.translate(-26, -25);
        ctx.strokeStyle = palette[0] + '0A';
        ctx.lineWidth = 4;
        ctx.stroke(logoOuterPath);
        ctx.restore();
    
        analyserNode!.getByteTimeDomainData(data.timeData);
        const bufferLength = 256;
        const scale = Math.min(width, height) * 0.45;
        const offset = 8;
        
        for (let i = 0; i < bufferLength; i += 4) {
            if (vectorscopeParticlesRef.current.length > 500) break;
            const v_x = (data.timeData[i] - 128) / 128.0;
            const v_y = (data.timeData[(i + offset) % bufferLength] - 128) / 128.0;
    
            vectorscopeParticlesRef.current.push({
                x: centerX + v_x * scale,
                y: centerY + v_y * scale,
                life: 1.0,
                size: Math.random() * 1.5 + 1,
                vx: 0, vy: 0, angle: 0, spin: 0,
            });
        }
    
        ctx.fillStyle = palette[1];
        ctx.shadowColor = palette[1];
        ctx.shadowBlur = 5;
    
        for (let i = vectorscopeParticlesRef.current.length - 1; i >= 0; i--) {
            const p = vectorscopeParticlesRef.current[i];
            p.life -= deltaTime * 3;
    
            if (p.life <= 0) {
                vectorscopeParticlesRef.current.splice(i, 1);
            } else {
                ctx.globalAlpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    };

    const drawStrobe = (
        time: number,
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        data: { freqData: Uint8Array },
        deltaTime: number
    ) => {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
    
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
    
        const bassLevel = (data.freqData[0] + data.freqData[1] + data.freqData[2]) / 3 / 255;
        if (bassLevel > 0.85 && beatProgress.current < 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, bassLevel * 1.2)})`;
            ctx.fillRect(0, 0, width, height);
    
            const particleCount = 50;
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 200 + 100 * bassLevel;
                strobeParticlesRef.current.push({
                    x: centerX, y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.random() * 0.5 + 0.3,
                    size: Math.random() * 2 + 1,
                    angle: 0, spin: 0,
                });
            }
        }
    
        ctx.fillStyle = '#FFFFFF';
        for (let i = strobeParticlesRef.current.length - 1; i >= 0; i--) {
            const p = strobeParticlesRef.current[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= deltaTime;
    
            if (p.life <= 0) {
                strobeParticlesRef.current.splice(i, 1);
            } else {
                ctx.globalAlpha = p.life > 0.5 ? 1 : p.life * 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
    
        ctx.save();
        ctx.translate(centerX, centerY);
        const pulse = 1 + bassLevel * 0.05;
        ctx.scale(pulse * 6.0, pulse * 6.0);
        ctx.translate(-26, -25);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke(logoOuterPath);
        ctx.lineWidth = 1.5;
        ctx.stroke(logoInnerPath);
        ctx.restore();
    };


    const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, deltaTime: number, bassLevel: number, cx: number, cy: number, color: string) => {
        if (bassLevel > 0.6 && Math.random() > 0.75) { // Reduced particle generation rate
            for (let i = 0; i < Math.floor(bassLevel * 1); i++) { // Reduced particle count
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 50 + 50 * bassLevel;
                particlesRef.current.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.random() * 1.5 + 1.0,
                    size: Math.random() * 2 + 1,
                    angle: 0,
                    spin: (Math.random() - 0.5) * 5,
                });
            }
        }
        
        ctx.fillStyle = color;
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            p.angle += p.spin * deltaTime;
            
            if (p.life <= 0) {
                particlesRef.current.splice(i, 1);
            } else {
                ctx.globalAlpha = p.life > 1 ? 1 : p.life;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1.0;
    }

    useEffect(() => {
        const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current;
        if (!canvas || !analyserNode) return;
        
        // Reset particles on re-initialization to prevent artifacts
        particlesRef.current = [];
        vectorscopeParticlesRef.current = [];
        strobeParticlesRef.current = [];

        if (!timeDomainDataArray.current || timeDomainDataArray.current.length !== analyserNode.fftSize) {
            timeDomainDataArray.current = new Uint8Array(analyserNode.fftSize);
        }
        if (!floatFreqDataArray.current || floatFreqDataArray.current.length !== analyserNode.frequencyBinCount) {
            floatFreqDataArray.current = new Float32Array(analyserNode.frequencyBinCount);
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const bufferLength = analyserNode.frequencyBinCount;
        const freqDataArray = new Uint8Array(bufferLength);
        
        const render = (time: number) => {
            const deltaTime = (time - lastTime.current) / 1000;
            lastTime.current = time;

            const beatsPerSecond = bpm / 60;
            const secondsPerBeat = 1 / beatsPerSecond;

            if (time / 1000 > lastBeatTime.current + secondsPerBeat) {
                lastBeatTime.current = time / 1000;
                beatProgress.current = 0;
            } else {
                beatProgress.current = Math.min(1, (time / 1000 - lastBeatTime.current) / secondsPerBeat);
            }

            if (analyserNode && timeDomainDataArray.current && floatFreqDataArray.current) {
                analyserNode.getByteFrequencyData(freqDataArray);
                
                const data = {
                    freqData: freqDataArray,
                    timeData: timeDomainDataArray.current,
                    floatFreqData: floatFreqDataArray.current,
                };

                switch(mode) {
                    case 'hud':
                        drawHud(time, canvas, ctx, data);
                        break;
                    case 'galaxy':
                        drawGalaxy(time, canvas, ctx, data, deltaTime);
                        break;
                    case 'spectrum':
                        drawSpectrum(time, canvas, ctx, data);
                        break;
                    case 'waveform':
                        drawWaveform(canvas, ctx, data);
                        break;
                    case 'vectorscope':
                        drawVectorscope(canvas, ctx, data, deltaTime);
                        break;
                    case 'strobe':
                        drawStrobe(time, canvas, ctx, data, deltaTime);
                        break;
                    default:
                        drawHud(time, canvas, ctx, data);
                }
            }
            animationFrameId.current = requestAnimationFrame(render);
        };
        
        animationFrameId.current = requestAnimationFrame(render);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [analyserNode, bpm, ref, palette, mode]);

    return <canvas ref={ref} width="1280" height="720" style={{ width: '100%', height: '100%' }} />;
});

export default Visualizer;
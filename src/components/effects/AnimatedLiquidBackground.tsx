import React, { useEffect, useRef, useMemo, useState } from 'react';
import { motion, useInView } from 'framer-motion';

// Preset configurations from Framer source
const templates = {
    Prism: {
        color1: "#050505",
        color2: "#66B3FF",
        color3: "#FFFFFF",
        rotation: -50,
        proportion: 1,
        scale: 0.01,
        speed: 30,
        distortion: 0,
        swirl: 50,
        swirlIterations: 16,
        softness: 47,
        offset: -299,
        shape: "Checks",
        shapeSize: 45
    },
    Plasma: {
        color1: "#B566FF",
        color2: "#000000",
        color3: "#1a0b2e",
        rotation: 0,
        proportion: 63,
        scale: 0.75,
        speed: 30,
        distortion: 5,
        swirl: 61,
        swirlIterations: 5,
        softness: 100,
        offset: -168,
        shape: "Checks",
        shapeSize: 28
    },
    DeepOcean: {
        color1: "#02040a",
        color2: "#0f172a",
        color3: "#020617",
        rotation: 45,
        proportion: 50,
        scale: 0.6,
        speed: 25,
        distortion: 8,
        swirl: 40,
        swirlIterations: 4,
        softness: 80,
        offset: 0,
        shape: "Checks",
        shapeSize: 40
    },
    Onyx: {
        color1: "#000000",
        color2: "#18181b",
        color3: "#09090b",
        rotation: -30,
        proportion: 80,
        scale: 0.5,
        speed: 20,
        distortion: 3,
        swirl: 30,
        swirlIterations: 3,
        softness: 60,
        offset: 100,
        shape: "Stripes",
        shapeSize: 60
    }
};

// WebGL Vertex Shader
const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// WebGL Fragment Shader - Liquid/Warp effect
const fragmentShaderSource = `
    precision highp float;
    varying vec2 v_uv;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform float u_scale;
    uniform float u_rotation;
    uniform float u_proportion;
    uniform float u_softness;
    uniform float u_distortion;
    uniform float u_swirl;
    uniform float u_swirlIterations;
    uniform float u_seed;
    
    #define PI 3.14159265359
    
    // Noise functions
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 6; i++) {
            value += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
        }
        return value;
    }
    
    vec2 rotate(vec2 p, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    }
    
    void main() {
        vec2 uv = v_uv;
        vec2 center = vec2(0.5);
        
        // Apply rotation
        uv = rotate(uv - center, u_rotation) + center;
        
        // Apply scale
        uv = (uv - center) / max(u_scale, 0.01) + center;
        
        // Add time-based movement
        float time = u_time * 0.5;
        
        // Swirl effect
        vec2 toCenter = uv - center;
        float dist = length(toCenter);
        float angle = atan(toCenter.y, toCenter.x);
        
        for (int i = 0; i < 20; i++) {
            if (float(i) >= u_swirlIterations) break;
            float swirlAmount = u_swirl * (1.0 - dist) * 0.1;
            angle += swirlAmount * sin(time + dist * 10.0);
        }
        
        uv = center + dist * vec2(cos(angle), sin(angle));
        
        // Distortion
        float n = fbm(uv * 3.0 + time * 0.2 + u_seed);
        uv += (n - 0.5) * u_distortion * 0.5;
        
        // Create color gradient
        float gradient = fbm(uv * 2.0 + time * 0.3);
        gradient = mix(gradient, dist, u_proportion);
        
        // Apply softness
        gradient = smoothstep(0.0, u_softness, gradient);
        
        // Mix colors
        vec3 color = mix(u_color1, u_color2, gradient);
        color = mix(color, u_color3, fbm(uv * 4.0 - time * 0.1) * 0.5);
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
        : [0, 0, 0];
}

interface AnimatedLiquidBackgroundProps {
    preset?: keyof typeof templates;
    style?: React.CSSProperties;
}

export const AnimatedLiquidBackground: React.FC<AnimatedLiquidBackgroundProps> = ({
    preset = 'Prism',
    style
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, amount: 0.1 });

    const values = templates[preset] || templates.Prism;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });

        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        glRef.current = gl;

        // Create shaders
        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        // Create program
        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        programRef.current = program;

        // Create geometry (fullscreen quad)
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Set initial uniforms
        const color1 = hexToRgb(values.color1);
        const color2 = hexToRgb(values.color2);
        const color3 = hexToRgb(values.color3);

        gl.uniform3f(gl.getUniformLocation(program, 'u_color1'), ...color1);
        gl.uniform3f(gl.getUniformLocation(program, 'u_color2'), ...color2);
        gl.uniform3f(gl.getUniformLocation(program, 'u_color3'), ...color3);
        gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), values.scale || 1);
        gl.uniform1f(gl.getUniformLocation(program, 'u_rotation'), values.rotation * Math.PI / 180);
        gl.uniform1f(gl.getUniformLocation(program, 'u_proportion'), values.proportion / 100);
        gl.uniform1f(gl.getUniformLocation(program, 'u_softness'), values.softness / 100);
        gl.uniform1f(gl.getUniformLocation(program, 'u_distortion'), values.distortion / 50);
        gl.uniform1f(gl.getUniformLocation(program, 'u_swirl'), values.swirl / 100);
        gl.uniform1f(gl.getUniformLocation(program, 'u_swirlIterations'), values.swirlIterations);
        gl.uniform1f(gl.getUniformLocation(program, 'u_seed'), values.offset * 0.01);

        // Animation loop
        const animate = () => {
            if (!gl || !program || !canvas) return;

            // Resize canvas if needed
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, displayWidth, displayHeight);
            }

            gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), displayWidth, displayHeight);

            // Update time
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const speed = isInView ? (values.speed / 100) * 2 : 0;
            gl.uniform1f(gl.getUniformLocation(program, 'u_time'), elapsed * speed);

            // Draw
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationRef.current);
            if (gl) {
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
            }
        };
    }, [preset, values, isInView]);

    return (
        <div ref={ref} className="absolute inset-0 w-full h-full overflow-hidden" style={style}>
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: 'block' }}
            />
        </div>
    );
};

export default AnimatedLiquidBackground;

/**
 * usePanZoom Hook
 * 
 * Provides pan, zoom, and momentum scrolling functionality for bracket visualization.
 * Extracted from BracketVisualization component.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface UsePanZoomOptions {
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    momentumFriction?: number;
    velocityThreshold?: number;
}

export interface UsePanZoomReturn {
    // Refs
    containerRef: React.RefObject<HTMLDivElement>;
    scrollContainerRef: React.RefObject<HTMLDivElement>;

    // State
    zoomLevel: number;
    setZoomLevel: (zoom: number) => void;
    isFullscreen: boolean;
    isDragging: boolean;

    // Handlers
    toggleFullscreen: () => void;
    handleMouseDown: (e: React.MouseEvent) => void;
    handleMouseUp: () => void;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseLeave: () => void;
}

export const usePanZoom = (options: UsePanZoomOptions = {}): UsePanZoomReturn => {
    const {
        initialZoom = 1,
        momentumFriction = 0.95,
        velocityThreshold = 0.1
    } = options;

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // State
    const [zoomLevel, setZoomLevel] = useState(initialZoom);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // Momentum refs
    const velocityRef = useRef({ x: 0, y: 0 });
    const lastPosRef = useRef({ x: 0, y: 0 });
    const lastTimeRef = useRef(0);
    const momentumIdRef = useRef<number>(0);
    const isDownRef = useRef(false);

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        // Only allow panning with left click
        if (e.button !== 0) return;

        // Stop any ongoing momentum
        if (momentumIdRef.current) {
            cancelAnimationFrame(momentumIdRef.current);
            momentumIdRef.current = 0;
        }

        isDownRef.current = true;
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setStartY(e.pageY - scrollContainerRef.current.offsetTop);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        setScrollTop(scrollContainerRef.current.scrollTop);

        // Initialize velocity tracking
        lastPosRef.current = { x: e.pageX, y: e.pageY };
        lastTimeRef.current = Date.now();
        velocityRef.current = { x: 0, y: 0 };
    }, []);

    const handleMouseUp = useCallback(() => {
        isDownRef.current = false;
        setIsDragging(false);

        // Start momentum if velocity is high enough
        if (Math.abs(velocityRef.current.x) > velocityThreshold || Math.abs(velocityRef.current.y) > velocityThreshold) {
            const applyMomentum = () => {
                if (!scrollContainerRef.current) return;

                // Apply friction
                velocityRef.current.x *= momentumFriction;
                velocityRef.current.y *= momentumFriction;

                // Update scroll position
                scrollContainerRef.current.scrollLeft -= velocityRef.current.x * 10;
                scrollContainerRef.current.scrollTop -= velocityRef.current.y * 10;

                // Continue if still moving
                if (Math.abs(velocityRef.current.x) > velocityThreshold || Math.abs(velocityRef.current.y) > velocityThreshold) {
                    momentumIdRef.current = requestAnimationFrame(applyMomentum);
                } else {
                    momentumIdRef.current = 0;
                }
            };
            momentumIdRef.current = requestAnimationFrame(applyMomentum);
        }
    }, [momentumFriction, velocityThreshold]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDownRef.current || !scrollContainerRef.current) return;
        e.preventDefault();

        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const y = e.pageY - scrollContainerRef.current.offsetTop;

        // Drag threshold check to prevent jitter on clicks
        if (!isDragging) {
            const dist = Math.hypot(x - startX, y - startY);
            if (dist < 10) return; // Threshold to prevent jitter
            setIsDragging(true);
        }

        const walkX = (x - startX) * 1.0;
        const walkY = (y - startY) * 1.0;

        scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
        scrollContainerRef.current.scrollTop = scrollTop - walkY;

        // Track velocity
        const now = Date.now();
        const dt = now - lastTimeRef.current;
        if (dt > 0) {
            const dx = e.pageX - lastPosRef.current.x;
            const dy = e.pageY - lastPosRef.current.y;

            // Smooth velocity tracking
            velocityRef.current = {
                x: (dx / dt) * 0.5 + velocityRef.current.x * 0.5,
                y: (dy / dt) * 0.5 + velocityRef.current.y * 0.5
            };
        }
        lastPosRef.current = { x: e.pageX, y: e.pageY };
        lastTimeRef.current = now;
    }, [isDragging, startX, startY, scrollLeft, scrollTop]);

    const handleMouseLeave = useCallback(() => {
        if (isDownRef.current) {
            handleMouseUp();
        }
    }, [handleMouseUp]);

    return {
        containerRef,
        scrollContainerRef,
        zoomLevel,
        setZoomLevel,
        isFullscreen,
        isDragging,
        toggleFullscreen,
        handleMouseDown,
        handleMouseUp,
        handleMouseMove,
        handleMouseLeave
    };
};

export default usePanZoom;

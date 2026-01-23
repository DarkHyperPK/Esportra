import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const MotionTiles = () => {
    const [columns, setColumns] = useState(0);
    const [rows, setRows] = useState(0);

    useEffect(() => {
        // Calculate grid size based on window
        const updateGrid = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const size = 60; // tile size
            setColumns(Math.ceil(w / size));
            setRows(Math.ceil(h / size));
        };
        updateGrid();
        window.addEventListener('resize', updateGrid);
        return () => window.removeEventListener('resize', updateGrid);
    }, []);

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-20 mix-blend-overlay">
            <div
                className="grid w-full h-full"
                style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`
                }}
            >
                {Array.from({ length: columns * rows }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="border-[0.5px] border-white/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

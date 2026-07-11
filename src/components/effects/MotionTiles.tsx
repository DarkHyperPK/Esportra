import { useEffect, useRef, useState } from "react";

interface TileData {
  duration: number;
  delay: number;
}

export const MotionTiles = () => {
    const [columns, setColumns] = useState(0);
    const [rows, setRows] = useState(0);
    const tilesRef = useRef<TileData[]>([]);

    useEffect(() => {
        const updateGrid = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const size = 60;
            setColumns(Math.ceil(w / size));
            setRows(Math.ceil(h / size));
        };
        updateGrid();
        window.addEventListener('resize', updateGrid);
        return () => window.removeEventListener('resize', updateGrid);
    }, []);

    const total = columns * rows;
    if (tilesRef.current.length !== total) {
        tilesRef.current = Array.from({ length: total }, () => ({
            duration: Math.random() * 5 + 5,
            delay: Math.random() * 5,
        }));
    }

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-20 mix-blend-overlay">
            <div
                className="grid w-full h-full"
                style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`
                }}
            >
                {tilesRef.current.map((tile, i) => (
                    <div
                        key={i}
                        className="border-[0.5px] border-white/5"
                        style={{
                            animation: `tile-flicker ${tile.duration}s ${tile.delay}s infinite`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

import { useEffect, useMemo, useRef } from 'react';
import { projectPoint, type MapTransform } from '@/services/scrimInsights/heatmap';

interface Props { art: string; transform: MapTransform | undefined; points: Array<{ x: number; y: number }>; label: string }

const SIZE = 720;

/** The map picture with the recorded positions glowing on it. Every point is drawn with the same weight, so a bright area is simply where many events were recorded. */
export function HeatmapCanvas({ art, transform, points, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const projected = useMemo(() => points.map((p) => projectPoint(p, transform)).filter((p): p is { across: number; down: number } => p !== null), [points, transform]);

  useEffect(() => {
    const ctx = ref.current?.getContext?.('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = 'lighter';
    const radius = SIZE * 0.035;
    for (const p of projected) {
      const x = p.across * SIZE;
      const y = p.down * SIZE;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, 'rgba(255,170,60,0.28)');
      g.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [projected]);

  return (
    <figure className="relative mx-auto aspect-square w-full max-w-[720px] overflow-hidden border border-white/[0.06] bg-[#0b0b0d]" aria-label={label}>
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60" loading="lazy" />
      <canvas ref={ref} width={SIZE} height={SIZE} className="absolute inset-0 h-full w-full mix-blend-screen" aria-hidden />
    </figure>
  );
}

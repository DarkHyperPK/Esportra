import { useLayoutEffect, useRef, useState } from "react";

export type OverlayPoolMap = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

/** Tracks an element's rendered size so SVG geometry can be drawn in real pixels. */
function useBoxSize<T extends Element>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, box };
}

/**
 * The ban slash. Measured in real pixels so the dash trick is exact: one dash
 * the full length of the line, slid into place by the `banned` class, with a
 * short bright dash riding its head like a pen tip. It starts just above the
 * card and ends just below it, so it cuts through rather than sits in.
 */
export const Slash = ({ color = "#f43f5e", tipColor = "#ffe4e6" }: { color?: string; tipColor?: string }) => {
  const { ref, box } = useBoxSize<SVGSVGElement>();
  const x1 = box.width * 0.06;
  const x2 = box.width * 0.94;
  const length = Math.hypot(x2 - x1, box.height);
  const tip = Math.max(8, length * 0.06);

  return (
    <svg
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-[3%] -top-[3%] z-20 h-[106%] w-full overflow-visible"
      viewBox={`0 0 ${box.width || 1} ${box.height || 1}`}
    >
      {box.width > 0 ? (
        <>
          <line
            className="bcv-slash"
            x1={x1}
            y1={0}
            x2={x2}
            y2={box.height}
            stroke={color}
            // Butt caps: a square cap draws a dot at the end even when the dash is fully hidden.
            strokeLinecap="butt"
            strokeDasharray={length}
            style={{ strokeWidth: "0.27vw", ["--len" as string]: `${length}` }}
          />
          <line
            className="bcv-slash-tip"
            x1={x1}
            y1={0}
            x2={x2}
            y2={box.height}
            stroke={tipColor}
            strokeLinecap="round"
            strokeDasharray={`${tip} ${length + tip}`}
            style={{
              strokeWidth: "0.42vw",
              filter: `drop-shadow(0 0 0.5vw ${color})`,
              ["--tip" as string]: `${tip}`,
              ["--tip-end" as string]: `${-(length - tip)}`,
            }}
          />
        </>
      ) : null}
    </svg>
  );
};

/**
 * A frame that draws itself around the card's edge; its colour comes from the
 * state class. `cut` clips the top-right corner (as a share of the width) so the
 * frame follows an angled card. Measured in pixels so one dash is the perimeter.
 */
export const Frame = ({ cut = 0 }: { cut?: number }) => {
  const { ref, box } = useBoxSize<SVGSVGElement>();
  const inset = 1.5;
  const left = inset;
  const top = inset;
  const right = Math.max(left, box.width - inset);
  const bottom = Math.max(top, box.height - inset);
  const corner = Math.min(box.width * cut, right - left, bottom - top);
  const points: Array<[number, number]> = [
    [left, top],
    [right - corner, top],
    [right, top + corner],
    [right, bottom],
    [left, bottom],
    [left, top],
  ];
  const perimeter = points.slice(1).reduce((total, [x, y], i) => total + Math.hypot(x - points[i][0], y - points[i][1]), 0);

  return (
    <svg
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox={`0 0 ${box.width || 1} ${box.height || 1}`}
    >
      {box.width > 0 ? (
        <polyline
          className="bcv-frame"
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          strokeLinejoin="miter"
          strokeLinecap="square"
          strokeDasharray={perimeter}
          style={{ strokeWidth: 3, ["--perimeter" as string]: `${perimeter}` }}
        />
      ) : null}
    </svg>
  );
};

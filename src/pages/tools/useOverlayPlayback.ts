import { useEffect, useMemo, useRef, useState } from "react";
import { BEAT_MS, type OverlayBeat } from "./overlayBeats";

/** Breath between two beats: the last card settles back before the next one lifts. */
export const BEAT_GAP_MS = 700;
/** A full replay waits for the overlay's own entrance before the first beat. */
export const REPLAY_LEAD_MS = 1600;

type Options = {
  /** Data has loaded; what's on the board now can be taken as the starting point. */
  ready: boolean;
  /** Play every beat from the first action instead of starting from what's settled. */
  replay: boolean;
};

/**
 * Plays the veto back like an edited sequence rather than mirroring it live.
 * Each beat gets the stage for its full length, then a short breath, then the
 * next, so a fast veto never blurs into one jump. Live mode starts from what's
 * already settled when OBS loads the source; replay mode plays it all.
 */
export function useOverlayPlayback(beats: OverlayBeat[], { ready, replay }: Options) {
  const [played, setPlayed] = useState<string[] | null>(null);
  const [initial, setInitial] = useState<ReadonlySet<string>>(() => new Set());
  const [current, setCurrent] = useState<OverlayBeat | null>(null);

  const playedSet = useMemo(() => new Set(played ?? []), [played]);
  const next = played ? beats.find((beat) => !playedSet.has(beat.id)) ?? null : null;
  const nextId = next?.id ?? null;
  // Read through a ref so a refetch that brings the same beat doesn't restart the cue.
  const nextRef = useRef(next);
  nextRef.current = next;
  const freshStart = replay && playedSet.size === 0;

  // Starting point: everything settled (live) or nothing (replay).
  useEffect(() => {
    if (!ready || played !== null) return;
    const settled = replay ? [] : beats.map((beat) => beat.id);
    setInitial(new Set(settled));
    setPlayed(settled);
  }, [beats, played, ready, replay]);

  // A reset clears the board: the next veto plays from its first beat.
  useEffect(() => {
    if (!played || played.length === 0 || beats.length > 0) return;
    setPlayed([]);
    setInitial(new Set());
    setCurrent(null);
  }, [beats.length, played]);

  // Cue the next beat once the stage is free.
  useEffect(() => {
    if (current || !nextId) return undefined;
    const timer = window.setTimeout(() => {
      const beat = nextRef.current;
      if (!beat) return;
      setPlayed((ids) => [...(ids ?? []), beat.id]);
      setCurrent(beat);
    }, freshStart ? REPLAY_LEAD_MS : BEAT_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [current, nextId, freshStart]);

  // Hold the beat for its full length.
  useEffect(() => {
    if (!current) return undefined;
    const timer = window.setTimeout(() => setCurrent(null), BEAT_MS[current.kind]);
    return () => window.clearTimeout(timer);
  }, [current]);

  const shown = useMemo(() => beats.filter((beat) => playedSet.has(beat.id)), [beats, playedSet]);
  const lastPlayed = shown[shown.length - 1] ?? null;

  return {
    /** The beat on stage right now. */
    current,
    /** Beats that have played (including the current one), in veto order. */
    shown,
    /** Beats already settled when playback started: their cards show without replaying. */
    initial,
    /** The most recent beat, held on the caption between beats. */
    lastPlayed,
    /** More beats are queued behind the current one. */
    busy: next !== null,
  };
}

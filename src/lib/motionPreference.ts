/**
 * Reduce motion is an opt-in Esportra setting, stored per device and off by
 * default. The OS-level `prefers-reduced-motion` is deliberately not read: the
 * site animates for everyone unless they turn it off here (Account Settings →
 * Accessibility). CSS reads it from `html[data-reduce-motion="true"]`.
 */
const STORAGE_KEY = "esportra:reduce-motion";
const ATTRIBUTE = "data-reduce-motion";

const listeners = new Set<() => void>();

export function readReduceMotion(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function applyReduceMotion(on: boolean) {
  if (on) document.documentElement.setAttribute(ATTRIBUTE, "true");
  else document.documentElement.removeAttribute(ATTRIBUTE);
}

export function setReduceMotion(on: boolean) {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, "true");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the choice still applies for this visit.
  }
  applyReduceMotion(on);
  listeners.forEach((listener) => listener());
}

/** Notifies on changes from this tab and from other tabs. */
export function subscribeReduceMotion(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    applyReduceMotion(readReduceMotion());
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Call once before the first render so CSS matches the saved choice from the first paint. */
export function initReduceMotion() {
  applyReduceMotion(readReduceMotion());
}

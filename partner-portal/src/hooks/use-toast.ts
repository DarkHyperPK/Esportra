import { useState, useEffect, useCallback } from 'react';

interface Toast {
    id: number;
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

type Listener = (toasts: Toast[]) => void;

// Module-level global store so all components share the same toasts
let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
    listeners.forEach(l => l([...toasts]));
}

function addToast(t: Omit<Toast, 'id'>) {
    const id = Date.now();
    toasts = [...toasts, { id, ...t }];
    notify();
    setTimeout(() => {
        toasts = toasts.filter(x => x.id !== id);
        notify();
    }, t.variant === 'destructive' ? 6000 : 3000);
}

export const useToast = () => {
    const [state, setState] = useState<Toast[]>(toasts);

    useEffect(() => {
        listeners.add(setState);
        return () => { listeners.delete(setState); };
    }, []);

    const toast = useCallback((t: Omit<Toast, 'id'>) => addToast(t), []);
    return { toast, toasts: state };
};

import { useState, useCallback } from 'react';

interface Toast {
    id: number;
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, description, variant }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return { toast, toasts };
};

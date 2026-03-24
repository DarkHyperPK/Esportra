import { useToast } from '../hooks/use-toast';

export default function Toaster() {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`rounded-lg px-4 py-3 shadow-lg border text-sm animate-in slide-in-from-bottom-2 ${
                        t.variant === 'destructive'
                            ? 'bg-red-900/90 border-red-700 text-red-100'
                            : 'bg-zinc-900/90 border-zinc-700 text-zinc-100'
                    }`}
                >
                    <p className="font-medium">{t.title}</p>
                    {t.description && (
                        <p className="mt-1 text-xs opacity-80">{t.description}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

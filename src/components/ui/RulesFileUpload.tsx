import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

async function extractPdfText(file: File): Promise<string> {
    // Dynamically import pdfjs + worker source so the large bundle is only
    // loaded when an organiser actually uploads a PDF.
    // pdfjs-dist v6 uses named exports only — no default export.
    const [pdfjsLib, { default: workerText }] = await Promise.all([
        import('pdfjs-dist'),
        // ?raw imports the file as a string; re-serve as a blob with the correct
        // MIME type to avoid the octet-stream rejection browsers enforce.
        import('pdfjs-dist/build/pdf.worker.min.mjs?raw'),
    ]);

    const blob = new Blob([workerText], { type: 'application/javascript' });
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        pages.push(pageText);
    }
    return pages.join('\n\n');
}

interface RulesFileUploadProps {
    onLoad: (text: string) => void;
    className?: string;
}

export const RulesFileUpload: React.FC<RulesFileUploadProps> = ({ onLoad, className }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        setError(null);
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'md' || ext === 'txt') {
            onLoad(await file.text());
            return;
        }

        if (ext === 'pdf') {
            setLoading(true);
            try {
                onLoad(await extractPdfText(file));
            } catch (err) {
                console.error('PDF read error:', err);
                setError('Could not read PDF. Try a .md or .txt file instead.');
            } finally {
                setLoading(false);
            }
            return;
        }

        setError('Unsupported file type. Use .md, .txt or .pdf.');
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <input
                ref={inputRef}
                type="file"
                accept=".md,.txt,.pdf"
                className="hidden"
                onChange={onChange}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Upload className="h-3.5 w-3.5" />
                )}
                {loading ? 'Reading…' : 'Upload file'}
            </button>
            <span className="text-xs text-zinc-500">.md · .txt · .pdf</span>
            {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
    );
};

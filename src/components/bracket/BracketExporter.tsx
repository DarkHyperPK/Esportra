import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { BracketRenderer } from './BracketRenderer';
import { BracketMatch } from '@/types/bracketTypes';
import { Loader2 } from 'lucide-react';

interface BracketExporterProps {
    matches: BracketMatch[];
    triggerButton: React.ReactNode;
}

export const BracketExporter: React.FC<BracketExporterProps> = ({
    matches,
    triggerButton
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    const handleExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            // Wait for state to update and renderer to re-render (just in case)
            await new Promise(resolve => setTimeout(resolve, 100));

            if (exportRef.current) {
                const dataUrl = await toPng(exportRef.current, {
                    backgroundColor: '#09090b', // Dark background
                    style: { transform: 'scale(1)' }, // Ensure no scaling issues
                    cacheBust: true,
                    pixelRatio: 3, // High quality export
                });

                const link = document.createElement('a');
                link.download = `tournament-bracket-${Date.now()}.png`;
                link.href = dataUrl;
                link.click();
            }
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <div
                onClick={handleExport}
                className={isExporting ? "opacity-50 cursor-wait pointer-events-none" : "cursor-pointer"}
            >
                {isExporting ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm font-medium text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                    </div>
                ) : (
                    triggerButton
                )}
            </div>

            {/* Hidden Export Container */}
            <div style={{ position: 'absolute', top: -9999, left: -9999, width: 'fit-content', height: 'fit-content' }}>
                <div ref={exportRef} className="bg-[#09090b] p-8">
                    <BracketRenderer
                        matches={matches}
                        activeFilter={{ type: 'all' }}
                        disableAnimations={true}
                    />
                </div>
            </div>
        </>
    );
};

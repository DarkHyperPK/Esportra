/** Placeholder in the bracket's own shape: three columns of cards narrowing toward the final. */
export const BracketCanvasSkeleton = () => (
    <div aria-label="Loading bracket" className="flex gap-[72px] p-6">
        {[4, 2, 1].map((count, column) => (
            <div key={count} className="flex w-[248px] flex-col">
                <div className="mb-[18px] h-[38px] space-y-2">
                    <div className="h-3 w-28 animate-pulse bg-white/[0.06]" />
                    <div className="h-2 w-20 animate-pulse bg-white/[0.04]" />
                </div>
                <div className="flex flex-1 flex-col justify-around gap-6" style={{ paddingTop: column * 54 }}>
                    {Array.from({ length: count }, (_, i) => (
                        <div key={i} className="h-[84px] animate-pulse bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" />
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export default BracketCanvasSkeleton;

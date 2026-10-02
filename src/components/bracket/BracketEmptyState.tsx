import { Network } from 'lucide-react';

/** No published bracket for this stage yet. */
export const BracketEmptyState = ({ message }: { message: string }) => (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center bg-white/[0.04]">
            <Network aria-hidden className="h-5 w-5 text-zinc-500" />
        </span>
        <p className="mt-4 font-heading text-[16px] font-bold text-white">No bracket yet</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>
    </div>
);

export default BracketEmptyState;

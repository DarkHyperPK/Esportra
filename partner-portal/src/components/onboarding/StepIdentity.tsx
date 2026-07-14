import { useState, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export interface StepIdentityProps {
    data: Record<string, string | boolean> | undefined;
    sponsorId: string;
    onSave: (d: Record<string, string | boolean>) => void;
    saving: boolean;
}

const StepIdentity = ({ data, sponsorId, onSave, saving }: StepIdentityProps) => {
    const [companyName, setCompanyName] = useState(String(data?.company_name || ''));
    const [tagline, setTagline] = useState(String(data?.tagline || ''));

    useEffect(() => {
        if (!companyName && sponsorId) {
            apiClient.get<{ name: string; tagline: string }>(`/api/sponsors/me`)
                .then((sponsor) => {
                    if (sponsor) {
                        setCompanyName(sponsor.name || '');
                        setTagline(sponsor.tagline || '');
                    }
                })
                .catch(() => {});
        }
    }, [companyName, sponsorId]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                    LET'S<span className="text-rose-500">_VERIFY</span> YOUR IDENTITY
                </h2>
                <p className="text-zinc-500 text-sm">
                    Confirm your company details. These will appear across your partner dashboard.
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Company Name
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Gaming Corp."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white text-lg focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none placeholder:text-zinc-700"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Brand Tagline <span className="text-zinc-700">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Powering the next generation of esports"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none placeholder:text-zinc-700"
                    />
                </div>
            </div>

            <button
                onClick={() =>
                    onSave({
                        company_name: companyName,
                        tagline,
                        contact_confirmed: true,
                    })
                }
                disabled={!companyName.trim() || saving}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
            >
                {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        Continue <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </div>
    );
};

export default StepIdentity;

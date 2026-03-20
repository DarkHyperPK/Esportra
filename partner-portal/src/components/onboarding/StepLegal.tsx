import { useState } from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

export interface StepLegalProps {
    onComplete: () => void;
    onBack: () => void;
    saving: boolean;
}

const StepLegal = ({ onComplete, onBack, saving }: StepLegalProps) => {
    const [agreed, setAgreed] = useState(false);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                    PARTNERSHIP<span className="text-rose-500">_AGREEMENT</span>
                </h2>
                <p className="text-zinc-500 text-sm">
                    Review and accept our partnership terms to activate your account.
                </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-h-64 overflow-y-auto custom-scrollbar space-y-4 text-sm text-zinc-400 leading-relaxed">
                <h3 className="text-white font-bold text-base">Esportra Sponsorship Agreement</h3>
                <p>
                    This Sponsorship Agreement ("Agreement") is entered into by and between Esportra ("Platform")
                    and the undersigning Sponsor ("Partner"), effective as of the date of approval.
                </p>
                <h4 className="text-white font-semibold mt-4">1. Scope of Partnership</h4>
                <p>
                    The Partner shall be granted access to the Esportra Partner Portal, including branding placement,
                    analytics tracking, and performance reporting tools in accordance with their selected tier.
                </p>
                <h4 className="text-white font-semibold mt-4">2. Content Standards</h4>
                <p>
                    All branding materials submitted by the Partner must comply with Esportra's community guidelines
                    and content policies. Esportra reserves the right to remove non-compliant content.
                </p>
                <h4 className="text-white font-semibold mt-4">3. Data & Privacy</h4>
                <p>
                    Performance analytics provided through the Portal are aggregate and anonymized.
                    No personally identifiable information of platform users is shared with Partners.
                </p>
                <h4 className="text-white font-semibold mt-4">4. Term & Termination</h4>
                <p>
                    This agreement remains effective until terminated by either party with 30 days written notice.
                    Esportra may suspend access immediately for breach of terms.
                </p>
            </div>

            <label className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer bg-zinc-950/50">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500 focus:ring-offset-0 focus:ring-offset-zinc-950 cursor-pointer"
                />
                <span className="text-sm text-zinc-300">
                    I have read and agree to the <span className="text-rose-400 font-medium">Esportra Sponsorship Agreement</span> and
                    understand that my acceptance is legally binding.
                </span>
            </label>

            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
                >
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button
                    onClick={onComplete}
                    disabled={!agreed || saving}
                    className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <ShieldCheck className="w-5 h-5" /> Activate Partnership
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default StepLegal;

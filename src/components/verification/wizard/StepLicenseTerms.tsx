import React from 'react';
import { ShieldCheck, Check, ExternalLink } from 'lucide-react';
import { VerificationWizardStepProps } from '@/types/verificationWizard';

const StepLicenseTerms: React.FC<VerificationWizardStepProps> = ({ data, updateData }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
                <div className="inline-flex p-3 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
                    <ShieldCheck className="h-8 w-8 text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold font-heading mb-2 text-white">Organizer License Terms</h2>
                <p className="text-gray-400 text-sm max-w-lg mx-auto">
                    Before applying for an Organizer License, you must read and accept the Esportra Organizer License Terms &amp; Sponsorship Policy.
                </p>
            </div>

            {/* Scrollable terms summary */}
            <div className="max-w-2xl mx-auto">
                <div className="h-72 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5 text-sm text-gray-400 leading-relaxed scroll-smooth">
                    <div>
                        <p className="text-white font-semibold mb-1">1. Sponsorship Restrictions</p>
                        <p>As a Licensed Organizer, you <strong className="text-gray-200">do not have the right</strong> to independently advertise, promote, or display any third-party sponsor's branding, logos, or commercial content on your tournament pages, Esportra placement zones, or any other surface of the Esportra Platform, unless prior written approval has been obtained from Esportra.</p>
                    </div>
                    <div>
                        <p className="text-white font-semibold mb-1">2. Permitted Sponsorships (With Approval)</p>
                        <p>You may request approval to feature a third-party sponsor by submitting a written request to <span className="text-rose-400">operations@esportra.com</span> at least 7 business days in advance. Esportra reserves the right to approve or deny any request at its sole discretion.</p>
                    </div>
                    <div>
                        <p className="text-white font-semibold mb-1">3. Esportra's Rights on Your Tournament Pages</p>
                        <p>In exchange for the Organizer License, you acknowledge that Esportra may place its official partners' branding on your tournament pages hosted on esportra.com, in the designated Esportra Placement Zones, in accordance with the applicable partner tier entitlements.</p>
                    </div>
                    <div>
                        <p className="text-white font-semibold mb-1">4. Stream Partnership Program (Opt-In)</p>
                        <p>Esportra may offer an optional stream partnership program where you can voluntarily feature partner assets in your broadcasts. Participation is entirely at your discretion and may include revenue-sharing or visibility benefits.</p>
                    </div>
                    <div>
                        <p className="text-white font-semibold mb-1">5. Violations &amp; Enforcement</p>
                        <p>Any violation of these terms — including unauthorized display of third-party sponsor content — may result in <strong className="text-rose-400">immediate license termination</strong> and removal of your tournaments from the Platform without prior notice.</p>
                    </div>
                    <div>
                        <p className="text-white font-semibold mb-1">6. Commercial Integrity</p>
                        <p>You agree not to use any Platform surface as an unapproved advertising vehicle, not to misrepresent any third-party relationship as an official Esportra partnership, and to promptly disclose any commercial sponsorship arrangements upon request.</p>
                    </div>
                    <p className="text-gray-600 text-xs pt-2 border-t border-white/5">
                        This is a summary. The full legally binding document is available at{' '}
                        <a
                            href="/organizer-license-terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-400 hover:text-rose-300 underline underline-offset-2 inline-flex items-center gap-1"
                        >
                            esportra.com/organizer-license-terms <ExternalLink className="w-3 h-3" />
                        </a>
                    </p>
                </div>

                {/* Acceptance checkbox */}
                <label
                    className={`mt-5 flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${
                        data.acceptedTerms
                            ? 'border-rose-500/40 bg-rose-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                >
                    <div
                        className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                            data.acceptedTerms ? 'bg-rose-500 border-rose-500' : 'border-white/30'
                        }`}
                    >
                        {data.acceptedTerms && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={data.acceptedTerms}
                        onChange={(e) => updateData({ acceptedTerms: e.target.checked })}
                    />
                    <span className="text-sm text-gray-300 leading-relaxed">
                        I have read and agree to the{' '}
                        <a
                            href="/organizer-license-terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-rose-400 hover:text-rose-300 underline underline-offset-2"
                        >
                            Organizer License Terms &amp; Sponsorship Policy
                        </a>
                        , including all restrictions on third-party sponsorship advertising and Esportra's rights to place partner content on my tournament pages.
                    </span>
                </label>
            </div>
        </div>
    );
};

export default StepLicenseTerms;

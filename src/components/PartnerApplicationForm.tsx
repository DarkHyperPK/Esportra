import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, Handshake, Send, Check, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { usePartnerApplication, PartnerApplication } from '@/hooks/usePartnerApplication';

const STEPS = [
    { icon: Building2, label: 'Company' },
    { icon: User, label: 'Contact' },
    { icon: Handshake, label: 'Partnership' },
    { icon: Send, label: 'Submit' },
];

const COMPANY_SIZES = [
    { value: 'startup', label: 'Startup', desc: '1–10 employees' },
    { value: 'small', label: 'Small', desc: '11–50 employees' },
    { value: 'medium', label: 'Medium', desc: '51–200 employees' },
    { value: 'large', label: 'Large', desc: '201–1000 employees' },
    { value: 'enterprise', label: 'Enterprise', desc: '1000+ employees' },
];

const INDUSTRIES = [
    'Gaming Hardware', 'Gaming Peripherals', 'Gaming Software', 'Energy Drinks & Beverages',
    'Apparel & Merchandise', 'Streaming & Media', 'Telecommunications',
    'Finance & Fintech', 'Education & Training', 'Health & Wellness', 'Technology', 'Other',
];

const PARTNERSHIP_GOALS = [
    { value: 'brand_awareness', label: 'Brand Awareness', desc: 'Increase visibility in the esports community' },
    { value: 'product_showcase', label: 'Product Showcase', desc: 'Feature products to competitive gamers' },
    { value: 'community_engagement', label: 'Community Engagement', desc: 'Build loyalty with gaming audiences' },
    { value: 'tournament_sponsorship', label: 'Tournament Sponsorship', desc: 'Sponsor and brand tournaments' },
    { value: 'content_collaboration', label: 'Content Collaboration', desc: 'Co-create content and experiences' },
    { value: 'exclusive_offers', label: 'Exclusive Offers', desc: 'Provide deals to Esportra users' },
];

const BUDGET_OPTIONS = [
    { value: 'under_1k', label: 'Under $1,000', tier: 'partner' },
    { value: '1k_5k', label: '$1,000 – $5,000', tier: 'partner' },
    { value: '5k_15k', label: '$5,000 – $15,000', tier: 'ascendant' },
    { value: '15k_50k', label: '$15,000 – $50,000', tier: 'ascendant' },
    { value: '50k_plus', label: '$50,000+', tier: 'radiant' },
    { value: 'undecided', label: "Let's discuss", tier: '' },
];

const HOW_HEARD = [
    'Search Engine', 'Social Media', 'Referral', 'Event / Conference',
    'Press / Media', 'Existing Partner', 'Other',
];

const inputClass = 'w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all font-body';
const labelClass = 'block text-xs text-zinc-500 uppercase tracking-wider mb-1.5 font-medium';

const PartnerApplicationForm: React.FC = () => {
    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const { submitApplication } = usePartnerApplication();

    const [form, setForm] = useState<Partial<PartnerApplication>>({
        company_size: undefined,
        partnership_tier: 'partner',
        partnership_goals: [],
        budget_range: undefined,
    });

    const set = (key: keyof PartnerApplication, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleGoal = (goal: string) => {
        const current = form.partnership_goals || [];
        set('partnership_goals', current.includes(goal) ? current.filter(g => g !== goal) : [...current, goal]);
    };

    const canNext = () => {
        if (step === 0) return !!(form.company_name && form.company_website && form.company_size && form.industry);
        if (step === 1) return !!(form.contact_name && form.contact_email);
        if (step === 2) return !!(form.partnership_tier && (form.partnership_goals || []).length > 0);
        return true;
    };

    const handleSubmit = async () => {
        if (!canNext()) return;
        try {
            await submitApplication.mutateAsync(form as PartnerApplication);
            setSubmitted(true);
        } catch { /* toast handles errors */ }
    };

    if (submitted) {
        return (
            <motion.div
                className="text-center py-16"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-white mb-3">Application Received</h3>
                <p className="text-zinc-400 max-w-md mx-auto font-body">
                    Our partnerships team will review your application and respond within
                    <span className="text-white font-medium"> 3–5 business days</span>.
                </p>
            </motion.div>
        );
    }

    return (
        <div>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-10">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = i === step;
                    const isDone = i < step;
                    return (
                        <React.Fragment key={i}>
                            {i > 0 && (
                                <div className={`w-8 h-px transition-colors ${isDone ? 'bg-rose-500/50' : 'bg-white/10'}`} />
                            )}
                            <button
                                onClick={() => i < step && setStep(i)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer'
                                        : 'text-zinc-600 border border-white/5'
                                    }`}
                                disabled={i > step}
                            >
                                {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Step 0: Company */}
                    {step === 0 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Company Name *</label>
                                    <input className={inputClass} placeholder="e.g. Razer Inc." value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Website *</label>
                                    <input className={inputClass} placeholder="https://..." value={form.company_website || ''} onChange={e => set('company_website', e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Industry *</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {INDUSTRIES.map(ind => (
                                        <button key={ind} onClick={() => set('industry', ind)}
                                            className={`px-3 py-2 text-xs font-medium transition-all border ${form.industry === ind
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                                : 'bg-[#0a0a0c] text-zinc-500 border-white/5 hover:border-white/15'
                                                }`}
                                        >{ind}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Company Size *</label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {COMPANY_SIZES.map(cs => (
                                        <button key={cs.value} onClick={() => set('company_size', cs.value)}
                                            className={`p-3 text-center transition-all border ${form.company_size === cs.value
                                                ? 'bg-rose-500/10 border-rose-500/30'
                                                : 'bg-[#0a0a0c] border-white/5 hover:border-white/15'
                                                }`}
                                        >
                                            <p className={`text-sm font-medium ${form.company_size === cs.value ? 'text-rose-400' : 'text-white'}`}>{cs.label}</p>
                                            <p className="text-xs text-zinc-600 mt-0.5">{cs.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Contact */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Full Name *</label>
                                    <input className={inputClass} placeholder="Jane Smith" value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Job Title</label>
                                    <input className={inputClass} placeholder="Head of Partnerships" value={form.contact_title || ''} onChange={e => set('contact_title', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Email *</label>
                                    <input className={inputClass} type="email" placeholder="jane@company.com" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input className={inputClass} type="tel" placeholder="+1 (555) 000-0000" value={form.contact_phone || ''} onChange={e => set('contact_phone', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Partnership */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className={labelClass}>Partnership Tier *</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'radiant', label: 'Radiant', desc: 'All ad zones, unlimited sponsorships, full analytics', color: '#f59e0b', icon: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png' },
                                        { value: 'ascendant', label: 'Ascendant', desc: 'Banner ads, 3 sponsorships, analytics dashboard', color: '#10b981', icon: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/22/largeicon.png' },
                                        { value: 'partner', label: 'Partner', desc: 'Logo ticker placement, 1 tournament sponsorship', color: '#3b82f6', icon: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/17/largeicon.png' },
                                    ].map(t => (
                                        <button key={t.value} onClick={() => set('partnership_tier', t.value)}
                                            className={`p-4 text-center transition-all border ${form.partnership_tier === t.value
                                                ? 'border-opacity-40'
                                                : 'bg-[#0a0a0c] border-white/5 hover:border-white/15'
                                                }`}
                                            style={form.partnership_tier === t.value ? {
                                                borderColor: t.color,
                                                backgroundColor: `${t.color}10`,
                                            } : undefined}
                                        >
                                            <img src={t.icon} alt={t.label} className="w-10 h-10 mx-auto mb-2 object-contain" />
                                            <p className="text-sm font-bold" style={{ color: form.partnership_tier === t.value ? t.color : 'white' }}>
                                                {t.label}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-1">{t.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Partnership Goals * <span className="normal-case text-zinc-600">(select all that apply)</span></label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {PARTNERSHIP_GOALS.map(g => {
                                        const selected = (form.partnership_goals || []).includes(g.value);
                                        return (
                                            <button key={g.value} onClick={() => toggleGoal(g.value)}
                                                className={`p-3 text-left transition-all border ${selected
                                                    ? 'bg-rose-500/10 border-rose-500/30'
                                                    : 'bg-[#0a0a0c] border-white/5 hover:border-white/15'
                                                    }`}
                                            >
                                                <p className={`text-sm font-medium ${selected ? 'text-rose-400' : 'text-white'}`}>{g.label}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">{g.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                        </div>
                    )}

                    {/* Step 3: Submit */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <label className={labelClass}>How did you hear about Esportra?</label>
                                <div className="flex flex-wrap gap-2">
                                    {HOW_HEARD.map(h => (
                                        <button key={h} onClick={() => set('how_heard', h)}
                                            className={`px-3 py-1.5 text-xs font-medium transition-all border ${form.how_heard === h
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                                : 'bg-[#0a0a0c] text-zinc-500 border-white/5 hover:border-white/15'
                                                }`}
                                        >{h}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Message <span className="normal-case text-zinc-600">(optional)</span></label>
                                <textarea
                                    className={`${inputClass} min-h-[120px] resize-none`}
                                    placeholder="Tell us about your vision for this partnership, any specific campaigns or ideas you have in mind..."
                                    value={form.message || ''}
                                    onChange={e => set('message', e.target.value)}
                                />
                            </div>

                            {/* Summary */}
                            <div className="border border-white/5 bg-[#0a0a0c] p-4 space-y-2">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3">Application Summary</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    <div><span className="text-zinc-500">Company:</span> <span className="text-white">{form.company_name}</span></div>
                                    <div><span className="text-zinc-500">Industry:</span> <span className="text-white">{form.industry}</span></div>
                                    <div><span className="text-zinc-500">Contact:</span> <span className="text-white">{form.contact_name}</span></div>
                                    <div><span className="text-zinc-500">Tier:</span> <span className="text-white capitalize">{form.partnership_tier}</span></div>
                                    <div className="col-span-2"><span className="text-zinc-500">Goals:</span> <span className="text-white">{(form.partnership_goals || []).length} selected</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
                {step > 0 ? (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                ) : <div />}

                {step < 3 ? (
                    <button
                        onClick={() => canNext() && setStep(step + 1)}
                        disabled={!canNext()}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-mono font-bold uppercase tracking-wider transition-all ${canNext()
                            ? 'bg-white text-black border border-white'
                            : 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed'
                            }`}
                    >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={submitApplication.isPending}
                        className="flex items-center gap-2 px-8 py-3 text-sm font-mono font-bold uppercase tracking-wider bg-white text-black border border-white transition-all disabled:opacity-50"
                    >
                        {submitApplication.isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Application
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PartnerApplicationForm;

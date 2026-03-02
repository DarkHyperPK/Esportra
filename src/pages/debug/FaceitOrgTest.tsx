import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TestResult {
    label: string;
    url: string;
    status: number;
    ok: boolean;
    data: unknown;
    error?: string;
}

const statusColor = (status: number) => {
    if (status === 200 || status === 201) return 'text-emerald-400';
    if (status === 400) return 'text-amber-400';  // Auth passed, bad body
    if (status === 401) return 'text-rose-500';   // Unauthorized
    if (status === 403) return 'text-rose-500';   // Forbidden
    if (status === 404) return 'text-zinc-400';   // Not found
    if (status === 0)   return 'text-zinc-500';   // Network error
    return 'text-zinc-300';
};

const statusLabel = (status: number) => {
    if (status === 200 || status === 201) return '✅ OK — Has Access';
    if (status === 400) return '⚠️ 400 Bad Request — Auth Passed!';
    if (status === 401) return '🔴 401 Unauthorized';
    if (status === 403) return '🔴 403 Forbidden — No Scope';
    if (status === 404) return '⚪ 404 Not Found';
    if (status === 0)   return '⚫ Network Error';
    return `HTTP ${status}`;
};

export default function FaceitOrgTest() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ key_prefix: string; tests: TestResult[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runTests = async () => {
        setLoading(true);
        setError(null);
        setResults(null);
        try {
            const { data, error: fnErr } = await supabase.functions.invoke('faceit-org-test');
            if (fnErr) throw new Error(fnErr.message);
            setResults(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-orange-400" />
                    </div>
                    <h1 className="text-2xl font-bold">Faceit Organizer API Scope Test</h1>
                </div>
                <p className="text-zinc-400 text-sm">
                    Tests whether the current <code className="text-orange-400 bg-zinc-900 px-1 py-0.5 rounded">FACEIT_API_KEY</code> has
                    organizer-level permissions (match creation, hub management) in addition to read-only Data API access.
                </p>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-xs">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <span className="text-emerald-400 font-bold">200 OK</span>
                    <p className="text-zinc-500 mt-0.5">Full access to this endpoint</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <span className="text-amber-400 font-bold">400 Bad Request</span>
                    <p className="text-zinc-500 mt-0.5">Auth passed — wrong body only</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <span className="text-rose-500 font-bold">401/403</span>
                    <p className="text-zinc-500 mt-0.5">Key lacks this scope</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <span className="text-zinc-400 font-bold">404</span>
                    <p className="text-zinc-500 mt-0.5">Endpoint exists, resource not found</p>
                </div>
            </div>

            <Button
                onClick={runTests}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold mb-8 w-full h-12"
            >
                {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running tests...</>
                ) : (
                    <><Zap className="w-4 h-4 mr-2" />Run API Scope Tests</>
                )}
            </Button>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-rose-400 font-semibold">Edge function error</p>
                        <p className="text-zinc-400 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {results && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Results</p>
                        <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-mono text-xs">
                            Key: {results.key_prefix}
                        </Badge>
                    </div>

                    {results.tests.map((t, i) => (
                        <div
                            key={i}
                            className={`bg-zinc-900 border rounded-xl overflow-hidden ${
                                t.status === 200 || t.status === 201 ? 'border-emerald-500/30' :
                                t.status === 400 ? 'border-amber-500/30' :
                                t.status === 401 || t.status === 403 ? 'border-rose-500/20' :
                                'border-zinc-800'
                            }`}
                        >
                            {/* Row header */}
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    {(t.status === 200 || t.status === 201) ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    ) : t.status === 400 ? (
                                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-semibold text-sm text-white">{t.label}</p>
                                        <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate max-w-sm">{t.url}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold whitespace-nowrap ml-4 ${statusColor(t.status)}`}>
                                    {statusLabel(t.status)}
                                </span>
                            </div>

                            {/* Response body */}
                            {t.data !== null && (
                                <div className="border-t border-zinc-800 p-4 bg-black/30">
                                    <pre className="text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto">
                                        {typeof t.data === 'string' ? t.data : JSON.stringify(t.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {t.error && (
                                <div className="border-t border-zinc-800 p-4 bg-black/30">
                                    <p className="text-xs text-rose-400 font-mono">{t.error}</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Summary */}
                    <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                        <p className="text-sm font-bold text-white mb-3">Conclusion</p>
                        {(() => {
                            const organizerTests = results.tests.filter(t =>
                                t.label.toLowerCase().includes('organizer') ||
                                t.label.toLowerCase().includes('match api') ||
                                t.label.toLowerCase().includes('hub api')
                            );
                            const anyOrgAccess = organizerTests.some(t => t.status === 200 || t.status === 400);
                            const allBlocked = organizerTests.every(t => t.status === 401 || t.status === 403);

                            if (anyOrgAccess) return (
                                <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-emerald-300">
                                        <strong>API key has organizer scope.</strong> Esportra can automatically create
                                        Faceit match rooms and manage hubs. Full automation is possible.
                                    </p>
                                </div>
                            );
                            if (allBlocked) return (
                                <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                    <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-rose-300">
                                        <strong>API key is Data API only (read-only).</strong> To enable full automation,
                                        go to <strong>Faceit App Studio</strong> → your app → add Organizer permissions
                                        and link it to your Faceit organizer account.
                                    </p>
                                </div>
                            );
                            return (
                                <p className="text-sm text-zinc-400">Mixed results. Check individual endpoint statuses above.</p>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

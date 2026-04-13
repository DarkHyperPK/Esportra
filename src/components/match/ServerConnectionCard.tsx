import React from 'react';
import { Server, Copy, ExternalLink, Loader2, AlertCircle, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchServer } from '@/hooks/useMatchServer';
import { useToast } from '@/hooks/use-toast';

interface ServerConnectionCardProps {
  matchId: string;
}

const ServerConnectionCard: React.FC<ServerConnectionCardProps> = ({ matchId }) => {
  const { server, isLoading, is404, isRealError, refetch, copyToClipboard } = useMatchServer(matchId);
  const { toast } = useToast();

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    toast({ title: `${label} copied!`, description: text });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-sm text-zinc-400">Loading server info...</span>
        </div>
      </div>
    );
  }

  // Real API error (not 404)
  if (isRealError) {
    return (
      <div className="rounded-xl border border-red-500/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-semibold text-white">Game Server</h3>
        </div>
        <p className="text-xs text-red-400 mb-3">Failed to load server info. Please try again.</p>
        <Button variant="ghost" size="sm" className="text-xs text-zinc-400" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  // No server yet — still provisioning (404 or null data)
  if (is404 || !server) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-3">
          <Server className="w-5 h-5 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Game Server</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Server is being provisioned. This may take up to a minute...</span>
        </div>
      </div>
    );
  }

  const isReady = server.status === 'starting' || server.status === 'provisioned' || server.status === 'running';
  const isFailed = server.status === 'failed';
  const connectString = server.rawIp && server.port ? `${server.rawIp}:${server.port}` : null;
  const gotvString = server.rawIp && server.gotvPort ? `${server.rawIp}:${server.gotvPort}` : null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Game Server</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isFailed ? 'bg-red-500/10 text-red-400' :
          isReady ? 'bg-emerald-500/10 text-emerald-400' :
          'bg-amber-500/10 text-amber-400'
        }`}>
          {server.status === 'starting' ? 'Starting' :
           server.status === 'running' ? 'Running' :
           server.status === 'provisioned' ? 'Ready' :
           server.status === 'failed' ? 'Failed' :
           server.status}
        </span>
      </div>

      {isFailed && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Server provisioning failed. Contact the tournament organizer.</span>
        </div>
      )}

      {/* Connection Info */}
      {isReady && connectString && (
        <div className="space-y-3">
          {/* Connect IP */}
          <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Connect</p>
              <p className="text-sm font-mono text-white">{connectString}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
              onClick={() => handleCopy(`connect ${connectString}`, 'Connect command')}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* GOTV */}
          {gotvString && (
            <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">GOTV</p>
                <p className="text-sm font-mono text-zinc-300">{gotvString}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                onClick={() => handleCopy(`connect ${gotvString}`, 'GOTV command')}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Map & Region */}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {server.map && (
              <span className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                {server.map}
              </span>
            )}
            {server.region && (
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                {server.region}
              </span>
            )}
          </div>

          {/* Quick Connect Button */}
          {server.connectUrl && (
            <a
              href={server.connectUrl}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Connect via Steam
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerConnectionCard;

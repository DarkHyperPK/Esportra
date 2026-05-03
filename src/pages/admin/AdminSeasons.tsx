import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';
import type { SeasonListItem } from '@/types/season';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function AdminSeasons() {
  const [search, setSearch] = useState('');
  const [game, setGame] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  const { data: seasons, isLoading } = useQuery<SeasonListItem[]>({
    queryKey: ['adminSeasons', game, status],
    queryFn: () => apiClient.get(`/api/admin/seasons?game=${game !== 'all' ? game : ''}&status=${status !== 'all' ? status : ''}`),
  });

  const filteredSeasons = seasons?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-tight">Admin Seasons</h1>
            <p className="mt-3 text-sm text-zinc-400">Manage all seasons on the platform.</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search seasons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-white/10 bg-black/20 pl-10 text-white"
              />
            </div>
            <Select value={game} onValueChange={setGame}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white w-[180px]">
                <SelectValue placeholder="All games" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All games</SelectItem>
                <SelectItem value="valorant">Valorant</SelectItem>
                <SelectItem value="cs2">Counter-Strike 2</SelectItem>
                <SelectItem value="league-of-legends">League of Legends</SelectItem>
                <SelectItem value="dota-2">Dota 2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
              Loading seasons...
            </div>
          ) : filteredSeasons.length > 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/30 overflow-hidden">
              <table className="w-full">
                <thead className="bg-black/20">
                  <tr className="text-left text-sm text-zinc-400">
                    <th className="px-6 py-4">Season</th>
                    <th className="px-6 py-4">Game</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSeasons.map((season) => (
                    <tr key={season.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-white">{season.name}</p>
                          <p className="text-sm text-zinc-400">{season.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{season.game}</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">{season.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{season.ownerUsername || season.ownerUserId}</td>
                      <td className="px-6 py-4 text-zinc-400">{season.createdAt ? new Date(season.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4">
                        <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                          <Link to={`/admin/seasons/${season.id}`}>Manage</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
              No seasons found matching your filters.
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

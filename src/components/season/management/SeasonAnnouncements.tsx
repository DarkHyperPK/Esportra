interface Props {
  seasonId: string;
}

const SeasonAnnouncements = ({ seasonId: _seasonId }: Props) => {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
        <h2 className="font-heading text-2xl font-bold text-white">Announcements</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Post updates and notifications to season participants.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] py-16 text-center">
        <p className="text-sm font-medium text-zinc-400">Announcements coming soon</p>
        <p className="text-xs text-zinc-600">
          This feature will allow you to post updates visible to all registered participants.
        </p>
      </div>
    </div>
  );
};

export default SeasonAnnouncements;

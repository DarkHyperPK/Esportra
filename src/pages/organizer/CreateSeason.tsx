import SeasonWizard from '@/components/organizer/season/SeasonWizard';

const CreateSeason = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="relative z-10 py-8 px-4">
        <SeasonWizard />
      </div>
    </div>
  );
};

export default CreateSeason;

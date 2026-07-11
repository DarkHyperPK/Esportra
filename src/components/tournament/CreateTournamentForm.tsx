import { Loader2 } from 'lucide-react';
import TournamentBasicInfoForm from './TournamentBasicInfoForm';
import TournamentDetailsForm from './TournamentDetailsForm';
import { useTournamentCreation } from '@/hooks/useTournamentCreation';
import ErrorDisplay from '@/components/admin/ErrorDisplay';

const CreateTournamentForm = () => {
  const { 
    formData,
    handleInputChange,
    handleSelectChange,
    handleCheckboxChange,
    handleSubmit,
    error,
    loading
  } = useTournamentCreation();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Host a Tournament</h1>
      
      {error && <ErrorDisplay message={error} />}
      
      <div className="bg-[#0a0a0c] p-6 rounded-lg border border-white/10/30">
        <form onSubmit={handleSubmit} className="space-y-6">
          <TournamentBasicInfoForm 
            formData={formData}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onCheckboxChange={handleCheckboxChange}
          />

          <TournamentDetailsForm 
            formData={formData}
            onInputChange={handleInputChange}
            onCheckboxChange={handleCheckboxChange}
          />

          <button type="button" 
            type="submit" 
            className="w-full bg-gaming-purple hover:bg-gaming-purple/80"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Tournament...
              </>
            ) : 'Create Tournament'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentForm;


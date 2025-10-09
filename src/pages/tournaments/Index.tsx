import { TournamentCard } from '@/components/TournamentCard';
import { useAuth } from '@/contexts/AuthContext';

const IndexPage = () => {
  const { user } = useAuth();

  return (
    <TournamentCard
      currentUserId={user?.id}
    />
  );
};

export default IndexPage; 
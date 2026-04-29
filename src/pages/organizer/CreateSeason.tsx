import { Navigate } from 'react-router-dom';

const CreateSeason = () => {
  return <Navigate to="/tournaments/create?mode=season" replace />;
};

export default CreateSeason;


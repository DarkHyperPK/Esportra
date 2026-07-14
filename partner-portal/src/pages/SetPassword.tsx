import { Navigate, useLocation } from 'react-router-dom';

export default function SetPassword() {
  const location = useLocation();
  return <Navigate to={`/auth/recovery${location.search}${location.hash}`} replace />;
}

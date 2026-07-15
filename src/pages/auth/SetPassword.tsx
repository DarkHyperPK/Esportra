
import { Navigate, useLocation } from 'react-router-dom';

const SetPassword = () => {
    const location = useLocation();
    return <Navigate to={`/auth/recovery${location.search}${location.hash}`} replace />;
};

export default SetPassword;

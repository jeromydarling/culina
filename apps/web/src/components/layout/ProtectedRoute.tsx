import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@culina/shared';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/misc';

export function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (profile.role !== role) {
    // Send the user to their own dashboard rather than a dead end.
    const home = profile.role === 'operator' ? '/operator' : profile.role === 'admin' ? '/admin' : '/tenant';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

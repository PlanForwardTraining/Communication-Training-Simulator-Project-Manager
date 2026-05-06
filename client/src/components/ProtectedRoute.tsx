import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: { role: string } | null;
  loading: boolean;
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ user, loading, children, requireAdmin }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) navigate('/login', { replace: true });
      else if (requireAdmin && user.role !== 'admin') navigate('/', { replace: true });
    }
  }, [user, loading, requireAdmin, navigate]);

  if (loading) {
    return (
      <div className="page items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

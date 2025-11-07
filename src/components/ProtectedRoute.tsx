import { ReactNode, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate({ to: '/login' });
    }
  }, [navigate]);

  const token = localStorage.getItem('token');
  // Return children if authenticated, otherwise null (will redirect)
  return token ? <>{children}</> : null;
}

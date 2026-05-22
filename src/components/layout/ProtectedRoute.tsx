import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  role?: 'admin' | 'user' | 'hod';
}

export default function ProtectedRoute({ role }: ProtectedRouteProps) {
  const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userRole = localStorage.getItem('role');

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

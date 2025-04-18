import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    // Redirect to login selector if not authenticated
    return <Navigate to="/login-selector" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
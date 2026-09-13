import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PROTECTED ROUTE
 *
 * Wraps a route and redirects unauthenticated users to /login.
 *
 * Usage in routing:
 *   <Route path="/*" element={<ProtectedRoute><Home /></ProtectedRoute>} />
 *
 * Three states:
 * 1. loading=true:  Still checking localStorage — show nothing (prevents flash)
 * 2. isAuthenticated=true:  Show the children (the actual page)
 * 3. isAuthenticated=false: Redirect to /login
 *
 * Interview Q: "What is the 'flash of unauthenticated content'?"
 * A: On page refresh, React state resets. If we rendered children immediately
 *    before checking localStorage, the user would briefly see the protected
 *    page before being redirected. The loading state prevents this flash.
 *
 * Interview Q: "Why Navigate replace instead of redirect?"
 * A: `replace` replaces the current entry in the browser history stack
 *    instead of pushing a new one. Without it, clicking "back" from the
 *    login page would return to the protected route, triggering another
 *    redirect loop. `replace` prevents that.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Still checking localStorage — render nothing to prevent flash
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Shows a spinner while auth state is resolving
function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Requires authenticated user
export function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Requires admin role
export function RequireAdmin({ children }) {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

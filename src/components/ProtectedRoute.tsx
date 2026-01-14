interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Authentication disabled for development - all routes are public
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

/**
 * ROUTE GUARD LOGIC: ProtectedRoute
 * Logic:
 * 1. Checks global 'isAuthenticated' state.
 * 2. If 'loading', shows a placeholder to prevent flicker.
 * 3. If NOT logged in, uses <Navigate> to bounce the user to '/login'.
 * 4. This ensures only authenticated users see private pages like Dashboard.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

/**
 * ROUTE GUARD LOGIC: PublicRoute (Guest Only)
 * Logic:
 * 1. Prevents "Back-to-Login" loop.
 * 2. If an already logged-in user tries to visit '/login', they are
 *    automatically deflected back to the Dashboard ('/').
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

/**
 * MAIN APP ROUTING LOGIC:
 * Logic:
 * 1. AuthProvider: Wraps everything so context is available everywhere.
 * 2. Toaster: Global container for notification popups.
 * 3. Routes: Decides which Page component to mount based on the URL path.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Logic: Login and Register are Guest-only routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />

          {/* Logic: Root path is Protected; redirects to Login if no session */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Logic: Fallback for undefined URLs; cleans up messy navigation */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}


export default App;

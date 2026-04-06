import { useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="px-6 md:px-10 py-3 border-b border-border bg-card-bg flex items-center justify-between shadow-sm">
          <div />
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
          >
            Login
          </button>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-88px)] px-4">
          <div className="text-center max-w-xl">
            <h1 className="text-3xl font-bold text-slate mb-4">Welcome to Prama</h1>
            <p className="text-muted mb-6">Please login to access your cases and reports.</p>
            <p className="text-sm text-muted">Click the login button in the top right corner to get started.</p>
          </div>
        </div>

        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    );
  }

  return <Outlet />;
}
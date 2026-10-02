import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthLayout } from '@/user/auth/AuthLayout';
import { Login } from '@/user/auth/Login';
import { Register } from '@/user/auth/Register';
import { OtpVerification } from '@/user/auth/OtpVerification';
import { StudentVerification } from '@/user/auth/StudentVerification';

export function Routes() {
  const { session, userProfile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  // Boolean routing logic matches user request: NO SESSION -> /login, etc.
  return (
    <RouterRoutes>
      <Route element={<AuthLayout />}>
        {/* Public Routes */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/register/verify-phone" element={!session ? <OtpVerification /> : <Navigate to="/" replace />} />

        {/* Protected Registration Routes */}
        <Route path="/register/verify-student" element={
          !session ? <Navigate to="/login" replace /> :
          (userProfile?.status === 'PENDING_STUDENT_VERIFICATION' || userProfile?.status === 'STUDENT_REJECTED') 
            ? <StudentVerification /> 
            : <Navigate to="/" replace />
        } />
      </Route>

      {/* App Home */}
      <Route path="/" element={
        !session ? <Navigate to="/login" replace /> :
        (userProfile?.status === 'PENDING_STUDENT_VERIFICATION' || userProfile?.status === 'STUDENT_REJECTED') ? <Navigate to="/register/verify-student" replace /> :
        userProfile?.status === 'SUSPENDED' ? <div>Tài khoản đã bị khoá</div> :
        userProfile?.status === 'UNVERIFIED_PHONE' ? <Navigate to="/register" replace /> :
        <div>
          <h1>CoGo Home</h1>
          <p>Welcome, {userProfile?.name}!</p>
          <button onClick={async () => {
             const { supabase } = await import('@/shared/lib/supabase');
             await supabase.auth.signOut();
             window.location.reload();
          }}>Đăng xuất</button>
        </div>
      } />
    </RouterRoutes>
  );
}

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

  return (
    <RouterRoutes>
      <Route element={<AuthLayout />}>
        {/* Public Routes */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/" replace />} />
        
        {/* OTP Route (Usually handled within components, but as a separate route if needed) */}
        <Route path="/register/verify-phone" element={<OtpVerification />} />

        {/* Protected Registration Routes */}
        <Route path="/register/verify-student" element={
          session && userProfile?.status === 'PENDING_STUDENT_VERIFICATION' || userProfile?.status === 'STUDENT_REJECTED' 
            ? <StudentVerification /> 
            : <Navigate to="/" replace />
        } />
      </Route>

      {/* App Home */}
      <Route path="/" element={
        !session ? <Navigate to="/login" replace /> :
        userProfile?.status === 'PENDING_STUDENT_VERIFICATION' || userProfile?.status === 'STUDENT_REJECTED' ? <Navigate to="/register/verify-student" replace /> :
        userProfile?.status === 'SUSPENDED' ? <div>Account Suspended</div> :
        <div>
          <h1>CoGo Home</h1>
          <p>Welcome, {userProfile?.name}!</p>
          <button onClick={() => {/* logout */}}>Logout</button>
        </div>
      } />
    </RouterRoutes>
  );
}

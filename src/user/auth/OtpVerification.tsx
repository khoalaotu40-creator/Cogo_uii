import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import styles from './AuthForm.module.css';

export function OtpVerification() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();
  
  const statePhone = location.state?.phone;
  const stateType = location.state?.type;
  const stateRegisterData = location.state?.registerData;

  // Fallback to session storage if browser refreshed
  const [phone, setPhone] = useState(statePhone || sessionStorage.getItem('otpPhone'));
  const [type, setType] = useState(stateType || sessionStorage.getItem('otpType'));
  const [registerData, setRegisterData] = useState(stateRegisterData || JSON.parse(sessionStorage.getItem('otpRegisterData') || 'null'));

  useEffect(() => {
    if (!phone) {
      navigate('/login');
    }
  }, [phone, navigate]);

  if (!phone) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return setError('Vui lòng nhập đủ 6 số OTP');
    
    setError('');
    setLoading(true);

    try {
      const { session } = await api.post('/auth/otp/verify', { phone, otp });
      
      if (type === 'register' && registerData) {
        if (session?.access_token) {
          await supabase.auth.setSession(session);
        }
        await api.post('/auth/register/profile', registerData);
      } else if (session?.access_token) {
         await supabase.auth.setSession(session);
      }

      // Clear session storage on success
      sessionStorage.removeItem('otpPhone');
      sessionStorage.removeItem('otpType');
      sessionStorage.removeItem('otpRegisterData');

      await refreshProfile();
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Mã OTP không hợp lệ hoặc đã hết hạn');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/otp/request', { phone, type });
      alert('Mã OTP đã được gửi lại');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>Xác thực số điện thoại</h2>
      <p className={styles.subtitle}>Mã OTP đã gửi tới {phone}</p>

      <form onSubmit={handleVerify} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="_ _ _ _ _ _"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '20px', paddingLeft: '16px' }}
            disabled={loading}
          />
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button 
            type="button" 
            onClick={handleResend}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: 'var(--brand-sage)', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}
          >
            Gửi lại mã
          </button>
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Đang xác thực...' : 'Xác nhận'}
        </button>
      </form>
    </div>
  );
}

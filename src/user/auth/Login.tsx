import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import styles from './AuthForm.module.css';
import { Phone } from 'lucide-react';

export function Login() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic client validation
      if (!phone || phone.length < 9) {
        throw new Error('Số điện thoại không hợp lệ');
      }

      await api.post('/auth/otp/request', { phone, type: 'login' });
      navigate('/register/verify-phone', { state: { phone, type: 'login' } });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>Chào mừng bạn!</h2>
      <p className={styles.subtitle}>Đăng nhập bằng số điện thoại để tiếp tục</p>
      
      <div className={styles.tabs}>
        <div className={`${styles.tab} ${styles.tabActive}`}>Đăng nhập</div>
        <Link to="/register" className={styles.tab}>Đăng ký</Link>
      </div>

      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <Phone size={20} color="var(--text-secondary)" />
          </div>
          <input
            type="tel"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            disabled={loading}
          />
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng nhập →'}
        </button>
      </form>
    </div>
  );
}

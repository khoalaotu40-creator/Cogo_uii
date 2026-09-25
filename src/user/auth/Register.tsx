import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import styles from './AuthForm.module.css';
import { Phone, User, Building2 } from 'lucide-react';

export function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Basic mock universities, in reality fetched from backend
  const universities = [
    { id: '1', name: 'Đại học Bách Khoa Hà Nội' },
    { id: '2', name: 'Đại học Quốc gia Hà Nội' },
    { id: '3', name: 'Đại học Kinh tế Quốc dân' },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) return setError('Vui lòng nhập họ và tên');
    if (!phone || phone.length < 9) return setError('Số điện thoại không hợp lệ');
    if (!universityId) return setError('Vui lòng chọn trường học');

    setLoading(true);
    try {
      // For registration, we first verify phone number.
      await api.post('/auth/otp/request', { phone, type: 'register' });
      navigate('/register/verify-phone', { 
        state: { phone, type: 'register', registerData: { name, phone, universityId } } 
      });
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
      <h2 className={styles.title}>Tạo tài khoản mới</h2>
      <p className={styles.subtitle}>Kết nối và chia sẻ chuyến đi cùng sinh viên</p>
      
      <div className={styles.tabs}>
        <Link to="/login" className={styles.tab}>Đăng nhập</Link>
        <div className={`${styles.tab} ${styles.tabActive}`}>Đăng ký</div>
      </div>

      <form onSubmit={handleRegister} className={styles.form}>
        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}><User size={20} color="var(--text-secondary)" /></div>
          <input
            type="text"
            placeholder="Họ và tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}><Phone size={20} color="var(--text-secondary)" /></div>
          <input
            type="tel"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}><Building2 size={20} color="var(--text-secondary)" /></div>
          <select 
            value={universityId} 
            onChange={(e) => setUniversityId(e.target.value)}
            className={styles.input}
            disabled={loading}
          >
            <option value="" disabled>Trường học / Giới thiệu</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Xác thực sinh viên →'}
        </button>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import styles from './AuthForm.module.css';

interface University {
  id: string;
  name: string;
}

export function StudentVerification() {
  const { userProfile, refreshProfile } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUnis, setLoadingUnis] = useState(true);

  useEffect(() => {
    api.get('/universities')
      .then((data) => {
        setUniversities(data as University[]);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingUnis(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!['image/jpeg', 'image/png'].includes(selected.type)) {
        setError('Chỉ hỗ trợ file JPG, PNG');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setError('Dung lượng file tối đa là 5MB');
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return setError('Vui lòng chọn trường học');
    if (!studentId.trim()) return setError('Vui lòng nhập MSSV');
    if (!file) return setError('Vui lòng tải lên ảnh thẻ sinh viên');

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('universityId', universityId);
      formData.append('studentId', studentId);
      formData.append('cardImage', file);

      const { supabase } = await import('@/shared/lib/supabase');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      
      const response = await fetch('/api/student-verifications', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Lỗi khi tải lên xác thực');
      }

      setSuccess(true);
      await refreshProfile();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success || userProfile?.status === 'PENDING_STUDENT_VERIFICATION' && userProfile?.status !== 'STUDENT_REJECTED') {
    // If the profile says they are pending, we can also just show success. 
    // Wait, the status is PENDING_STUDENT_VERIFICATION when they first register, but the verification table has the 'PENDING' status.
    // If we just submitted successfully, show this:
    if (success) {
      return (
        <div className={styles.formContainer} style={{ textAlign: 'center' }}>
          <h2 className={styles.title}>Đang chờ xác thực</h2>
          <p className={styles.subtitle}>Hồ sơ của bạn đã được gửi và đang chờ ban quản trị duyệt. Quá trình này có thể mất tới 24h.</p>
        </div>
      );
    }
  }

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>Xác thực sinh viên</h2>
      <p className={styles.subtitle}>Tải lên thẻ sinh viên để hoàn tất đăng ký</p>

      {userProfile?.status === 'STUDENT_REJECTED' && (
        <div style={{ padding: '12px', background: '#FEF2F2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>Xác thực bị từ chối:</strong> Vui lòng kiểm tra lại ảnh thẻ hoặc MSSV và gửi lại.
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <select 
            value={universityId} 
            onChange={(e) => setUniversityId(e.target.value)}
            className={styles.input}
            disabled={loading || loadingUnis}
          >
            <option value="" disabled>
              {loadingUnis ? 'Đang tải danh sách trường...' : 'Chọn trường học'}
            </option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Mã số sinh viên (MSSV)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div style={{ border: '1px dashed var(--border)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          {file ? (
            <p style={{ color: 'var(--brand-dark)' }}>Đã chọn: {file.name}</p>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Chưa chọn ảnh</p>
              <input type="file" id="file" accept="image/jpeg, image/png" onChange={handleFileChange} style={{ display: 'none' }} />
              <label htmlFor="file" className={styles.button} style={{ display: 'inline-block', width: 'auto', padding: '8px 16px', cursor: 'pointer' }}>
                Tải ảnh lên
              </label>
            </>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '-8px' }}>
          Yêu cầu: ảnh rõ nét, JPG/PNG, tối đa 5MB
        </p>

        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" className={styles.button} disabled={loading || loadingUnis}>
          {loading ? 'Đang gửi...' : 'Gửi thông tin xác thực'}
        </button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import styles from './AuthForm.module.css';

export function StudentVerification() {
  const { userProfile, refreshProfile } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (userProfile?.status === 'STUDENT_REJECTED' && !success) {
    // Show rejection message
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!['image/jpeg', 'image/png'].includes(selected.type)) {
        return setError('Chỉ hỗ trợ file JPG, PNG');
      }
      if (selected.size > 5 * 1024 * 1024) {
        return setError('Dung lượng file tối đa là 5MB');
      }
      setFile(selected);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return setError('Vui lòng nhập MSSV');
    if (!file) return setError('Vui lòng tải lên ảnh thẻ sinh viên');

    setLoading(true);
    setError('');

    try {
      // Assuming backend handles multipart/form-data for file upload
      const formData = new FormData();
      formData.append('studentId', studentId);
      formData.append('cardImage', file);

      // We need to bypass `api.post` because it stringifies JSON, or we update `api.post` to handle FormData
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

  if (success) {
    return (
      <div className={styles.formContainer} style={{ textAlign: 'center' }}>
        <h2 className={styles.title}>Đang chờ xác thực</h2>
        <p className={styles.subtitle}>Hồ sơ của bạn đã được gửi và đang chờ ban quản trị duyệt. Quá trình này có thể mất tới 24h.</p>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>Xác thực sinh viên</h2>
      <p className={styles.subtitle}>Tải lên thẻ sinh viên để hoàn tất đăng ký</p>

      {userProfile?.status === 'STUDENT_REJECTED' && (
        <div style={{ padding: '12px', background: '#FEF2F2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>Xác thực bị từ chối:</strong> Vui lòng kiểm tra lại ảnh thẻ hoặc MSSV.
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
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
              <label htmlFor="file" className={styles.button} style={{ display: 'inline-block', width: 'auto', padding: '8px 16px' }}>
                Tải ảnh lên
              </label>
            </>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '-8px' }}>
          Yêu cầu: ảnh rõ nét, JPG/PNG, tối đa 5MB
        </p>

        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi thông tin xác thực'}
        </button>
      </form>
    </div>
  );
}

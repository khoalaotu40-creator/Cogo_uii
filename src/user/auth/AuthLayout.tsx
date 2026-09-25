import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

export function AuthLayout() {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <h1 className={styles.logo}>CoGo</h1>
          <span className={styles.badge}>Đi chung an toàn</span>
        </div>
        <Outlet />
        <footer className={styles.footer}>
          Bằng việc tiếp tục, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a>
        </footer>
      </div>
    </div>
  );
}

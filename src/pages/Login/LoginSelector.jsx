import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

const LoginSelector = () => {
  const navigate = useNavigate();

  const handleSelect = (role) => {
    console.log('handleSelect called with role:', role);
    // Clear auth data before navigating to login page
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('employee');

    if (role === 'admin') {
      navigate('/admin-login');
    } else if (role === 'employee') {
      navigate('/employee-login');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h2 className={styles.title}>Select Login Role</h2>
          <p className={styles.subtitle}>Please choose your login role</p>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem' }}>
            <button
              type="button"
              className={styles.loginButton}
              onClick={() => handleSelect('admin')}
              style={{ width: '120px' }}
            >
              Admin
            </button>
            <button
              type="button"
              className={styles.loginButton}
              onClick={() => handleSelect('employee')}
              style={{ width: '120px' }}
            >
              Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;

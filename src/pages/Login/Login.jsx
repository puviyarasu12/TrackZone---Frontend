import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

import { useLocation } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
  const location = useLocation();
  const roleFromState = location.state?.role || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (roleFromState === 'employee') {
        // Employee login only
        let response = await fetch('https://trackzone-backend.onrender.com/api/employee/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        let data = await response.json();

        if (response.ok) {
          const { token, employee } = data;
          const role = 'employee';
          onLoginSuccess(role, token, employee);
          navigate('/employee-dashboard');
          return;
        } else {
          throw new Error(data.message || 'Login failed');
        }
      } else if (roleFromState === 'admin') {
        // Admin login only
        let response = await fetch('https://trackzone-backend.onrender.com/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        let data = await response.json();

        if (response.ok) {
          const { token, employee } = data; // Assuming admin response uses same structure
          const role = 'admin';
          onLoginSuccess(role, token, employee);
          navigate('/admin-dashboard');
          return;
        } else {
          throw new Error(data.message || 'Login failed');
        }
      } else {
        // No role selected, show error or redirect to selector
        throw new Error('No role selected. Please select a role first.');
      }
    } catch (err) {
      setError(err.message || 'Server error during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const mapVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { duration: 1.5, ease: 'easeOut' }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <motion.div
        className={styles.mapContainer}
        initial="initial"
        animate="animate"
        variants={mapVariants}
      >
        <div className={styles.mapBackground}>
          <motion.div
            className={styles.radarPulse}
            variants={pulseVariants}
            animate="animate"
          />
          <motion.div
            className={styles.gpsPin}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className={styles.mapLines}>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className={styles.mapLine}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, delay: i * 0.3, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className={styles.loginContainer}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.div
          className={styles.loginCard}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 15 }}
        >
          <h2 className={styles.title}>Welcome to Trackzone</h2>
          <p className={styles.subtitle}>Secure Access to Your World</p>

          {error && (
            <motion.div
              className={styles.errorMessage}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <motion.div
              className={styles.inputGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </motion.div>

            <motion.div
              className={styles.inputGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <div className={styles.forgotPassword}>
                <a href="/forgot-password">Forgot Password?</a>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              className={styles.loginButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={styles.spinner}></span>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          <motion.div
            className={styles.glowEffect}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
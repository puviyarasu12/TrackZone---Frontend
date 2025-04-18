import React from 'react';
import { motion } from 'framer-motion';
import styles from './Hero.module.css';

const Hero = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroRow}>
          {/* Left Side - Hero Content */}
          <div className={styles.heroContent}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className={styles.heroTitle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                Attendance Tracking <span>Reimagined</span>
              </motion.h1>
              
              <motion.p
                className={styles.heroSubtitle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Say goodbye to clunky, outdated systems. TRACKZONE combines GPS tracking and fingerprint authentication for seamless, secure, and reliable attendance management.
              </motion.p>
              
              <motion.div
                className={styles.heroCta}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <motion.a
                  href="#demo"
                  className="btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Request Demo
                </motion.a>
                <motion.a
                  href="#features"
                  className="btn btn-outline"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Explore Features
                </motion.a>
              </motion.div>
            </motion.div>
          </div>
          
          {/* Right Side - Hero Image */}
          <div className={styles.heroImageContainer}>
            <motion.div
              className={styles.heroImage}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <div className={styles.mockup}>
                <div className={styles.phone}>
                  <div className={styles.screen}>
                    <div className={styles.appInterface}>
                      <div className={styles.appHeader}>
                        <div className={styles.appLogo}>TRACKZONE</div>
                      </div>
                      <div className={styles.appContent}>
                        <div className={styles.mapContainer}>
                          {/* GPS SVG Animation */}
                          <svg
                            className={styles.gpsSvg}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="url(#gpsGradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="6" />
                            <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" />
                            <defs>
                              <linearGradient id="gpsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#4a8cff' }} />
                                <stop offset="100%" style={{ stopColor: '#6a78fc' }} />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        <div className={styles.attendanceModule}>
                          <div className={styles.moduleTitle}>Check In</div>
                          <div className={styles.fingerprint}></div>
                          <div className={styles.statusText}>Tap to verify</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <div className={styles.heroShape1}></div>
      <div className={styles.heroShape2}></div>
    </section>
  );
};

export default Hero;
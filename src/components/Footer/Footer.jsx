import React from 'react';
import { motion } from 'framer-motion';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <div className={styles.footerColumn}>
            <motion.div 
              className={styles.footerLogo}
              whileHover={{ scale: 1.05 }}
            >
              TRACKZONE
            </motion.div>
            <p className={styles.footerDescription}>
              Revolutionizing attendance tracking with GPS and biometric technology for modern workplaces.
            </p>
            <div className={styles.socialLinks}>
              <motion.a href="#" whileHover={{ scale: 1.2 }} className={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </motion.a>
              <motion.a href="#" whileHover={{ scale: 1.2 }} className={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </motion.a>
              <motion.a href="#" whileHover={{ scale: 1.2 }} className={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </motion.a>
            </div>
          </div>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>Features</h3>
            <ul className={styles.footerLinks}>
              <li><a href="#features">GPS Tracking</a></li>
              <li><a href="#features">Fingerprint Authentication</a></li>
              <li><a href="#features">Real-time Notifications</a></li>
              <li><a href="#features">Payroll Integration</a></li>
            </ul>
          </div>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>Company</h3>
            <ul className={styles.footerLinks}>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>Contact Us</h3>
            <form className={styles.contactForm} id="contact">
              <input type="email" placeholder="Email Address" className={styles.formInput} />
              <motion.button 
                type="submit" 
                className={styles.formButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Request Demo
              </motion.button>
            </form>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} TRACKZONE. All rights reserved.
          </p>
          <div className={styles.legalLinks}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`container ${styles.headerContainer}`}>
          <motion.div
            className={styles.logo}
            whileHover={{ scale: 1.05 }}
          >
            TRACKZONE
          </motion.div>

          <div className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
            <ul>
              <motion.li whileHover={{ scale: 1.1 }}>
                <a href="#features">Features</a>
              </motion.li>
              <motion.li whileHover={{ scale: 1.1 }}>
                <a href="#how-it-works">How It Works</a>
              </motion.li>
              <motion.li whileHover={{ scale: 1.1 }}>
                <a href="#benefits">Benefits</a>
              </motion.li>
              <motion.li whileHover={{ scale: 1.1 }}>
                <a href="#contact">Contact Us</a>
              </motion.li>
              <motion.li whileHover={{ scale: 1.1 }}>
                <a

                  className="btn"
                  onClick={() => 
                     navigate('/login-selector')
                  }
                >
                  Login
                </a>
              </motion.li>
            </ul>
          </nav>
        </div>
      </motion.header>

      
    </>
  );
};

export default Header;
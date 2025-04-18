import React from 'react';
import { motion } from 'framer-motion';
import styles from './Features.module.css';

const featuresList = [
  {
    icon: '📍',
    title: 'GPS Tracking',
    description: 'Automatically mark attendance when employees enter geofenced work areas.'
  },
  {
    icon: '👆',
    title: 'Fingerprint Authentication',
    description: 'Eliminate buddy punching with biometric verification for foolproof attendance.'
  },
  {
    icon: '🔔',
    title: 'Real-time Notifications',
    description: 'Keep everyone updated with instant alerts for check-ins, reminders, and more.'
  },
  {
    icon: '💰',
    title: 'Payroll Integration',
    description: 'Seamlessly connect attendance data with your payroll system for accurate payments.'
  },
  {
    icon: '🗓️',
    title: 'Leave Management',
    description: 'Manage leave requests, approvals, and balances in one unified platform.'
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'Gain insights into attendance patterns with comprehensive reports and visualizations.'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const Features = () => {
  return (
    <section className={`section ${styles.features}`} id="features">
      <div className="container">
        <h2 className="section-title">Powerful Features</h2>
        <p className="section-subtitle">
          TRACKZONE combines cutting-edge technology with user-friendly design to revolutionize attendance tracking.
        </p>
        
        <motion.div 
          className={styles.featuresGrid}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {featuresList.map((feature, index) => (
            <motion.div 
              key={index}
              className={styles.featureCard}
              variants={itemVariants}
            >
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
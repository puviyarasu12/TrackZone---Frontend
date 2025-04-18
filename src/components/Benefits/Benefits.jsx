import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Benefits.module.css';

const benefitCategories = [
  {
    id: 'employees',
    title: 'For Employees',
    benefits: [
      'No more manual sign-ins or time-consuming check-in processes',
      'Automatic attendance tracking eliminates paperwork',
      'Real-time notifications about shifts and schedule changes',
      'Transparent leave balance and attendance records',
      'Quick fingerprint verification takes seconds'
    ]
  },
  {
    id: 'employers',
    title: 'For Employers',
    benefits: [
      'Eliminate time theft and buddy punching completely',
      'Reduce administrative overhead and paperwork',
      'Access accurate, real-time attendance data',
      'Simplify payroll processing with integrated attendance',
      'Generate comprehensive attendance reports instantly'
    ]
  },
  {
    id: 'hr',
    title: 'For HR Teams',
    benefits: [
      'Centralized system for attendance and leave management',
      'Automated compliance with labor regulations',
      'Easy identification of attendance patterns and issues',
      'Streamlined approval workflows for leave requests',
      'Digital records for auditing and documentation'
    ]
  }
];

const Benefits = () => {
  const [activeTab, setActiveTab] = useState('employees');
  
  const changeTab = (tabId) => {
    setActiveTab(tabId);
  };
  
  const activeCategory = benefitCategories.find(category => category.id === activeTab);
  
  return (
    <section className={`section ${styles.benefits}`} id="benefits">
      <div className="container">
        <h2 className="section-title">Benefits For Everyone</h2>
        <p className="section-subtitle">
          TRACKZONE creates value across your organization by making attendance tracking simple, secure, and stress-free.
        </p>
        
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {benefitCategories.map(category => (
              <motion.button
                key={category.id}
                className={`${styles.tab} ${activeTab === category.id ? styles.activeTab : ''}`}
                onClick={() => changeTab(category.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category.title}
                {activeTab === category.id && (
                  <motion.div 
                    className={styles.activeIndicator}
                    layoutId="activeIndicator"
                  />
                )}
              </motion.button>
            ))}
          </div>
          
          <div className={styles.tabContent}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={styles.benefitsList}
              >
                <ul>
                  {activeCategory.benefits.map((benefit, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {benefit}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        <motion.div 
          className={styles.statsContainer}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className={styles.stat}>
            <div className={styles.statValue}>87%</div>
            <div className={styles.statLabel}>Reduction in Time Theft</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>94%</div>
            <div className={styles.statLabel}>Accuracy Rate</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>65%</div>
            <div className={styles.statLabel}>Less Administrative Work</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Benefits;
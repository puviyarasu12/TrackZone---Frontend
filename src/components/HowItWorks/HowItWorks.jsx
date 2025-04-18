import React from 'react';
import { motion } from 'framer-motion';
import styles from './HowItWorks.module.css';

const steps = [
  {
    number: '01',
    title: 'Geofence Setup',
    description: 'Define your workplace boundaries with precision GPS geofencing technology.'
  },
  {
    number: '02',
    title: 'Employee Registration',
    description: 'Register employee fingerprints and profiles in the secure TRACKZONE system.'
  },
  {
    number: '03',
    title: 'Automated Check-in',
    description: 'Employees are detected when they enter the geofenced area and prompted to verify.'
  },
  {
    number: '04',
    title: 'Fingerprint Verification',
    description: 'A quick fingerprint scan confirms identity and marks attendance in real-time.'
  },
  {
    number: '05',
    title: 'Real-time Monitoring',
    description: 'Managers can view attendance status and receive alerts about exceptions.'
  }
];

const HowItWorks = () => {
  return (
    <section className={`section ${styles.howItWorks}`} id="how-it-works">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          TRACKZONE simplifies attendance tracking with a seamless five-step process.
        </p>
        
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              className={styles.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className={styles.stepConnector}></div>}
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          className={styles.demoButton}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <a href="#demo" className="btn">Schedule a Demo</a>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
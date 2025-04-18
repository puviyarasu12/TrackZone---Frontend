import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from './AddEmployee.module.css';

const AddEmployee = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    designation: '',
    contactNumber: '',
    photo: null,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const data = new FormData();
    for (const key in formData) {
      data.append(key, formData[key]);
    }

    try {
      const response = await fetch('https://trackzone-backend.onrender.com/api/employee/register', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to register employee');
      }

      setSuccess('Employee registered successfully! An email has been sent with fingerprint registration instructions.');
      setFormData({
        name: '',
        email: '',
        password: '',
        department: '',
        designation: '',
        contactNumber: '',
        photo: null,
      });
      e.target.reset();
      setTimeout(() => navigate('/admin-dashboard'), 2000); // Redirect after success
    } catch (err) {
      setError(err.message || 'Server error during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 1 } },
    exit: { opacity: 0, transition: { duration: 0.5 } },
  };

  const formVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 15 } },
  };

  const inputVariants = {
    initial: { y: 20, opacity: 0 },
    animate: (i) => ({
      y: 0,
      opacity: 1,
      transition: { delay: 0.1 * i, duration: 0.5 },
    }),
  };

  const fingerScanVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { duration: 1.5, ease: 'easeOut' }
    }
  };

  const pulseScanVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  return (
    <motion.div 
      className={styles.pageContainer}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div className={styles.contentContainer}>
        <motion.div
          className={styles.fingerprintContainer}
          initial="initial"
          animate="animate"
          variants={fingerScanVariants}
        >
          <div className={styles.fingerprintBackground}>
            <motion.div
              className={styles.scanPulse}
              variants={pulseScanVariants}
              animate="animate"
            />
            <motion.div
              className={styles.fingerIcon}
              animate={{ 
                boxShadow: ['0 0 10px rgba(59, 130, 246, 0.5)', '0 0 30px rgba(59, 130, 246, 0.8)', '0 0 10px rgba(59, 130, 246, 0.5)'] 
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 11c0 3.517-1.009 6-3 6s-3-2.483-3-6c0-3.517 1.009-6 3-6s3 2.483 3 6z" />
                <path d="M7 11c0 2.21-0.894 4-2 4s-2-1.79-2-4c0-2.21 0.894-4 2-4s2 1.79 2 4z" />
                <path d="M17 11c0 2.21-0.894 4-2 4s-2-1.79-2-4c0-2.21 0.894-4 2-4s2 1.79 2 4z" />
                <path d="M22 11c0 2.21-0.894 4-2 4s-2-1.79-2-4c0-2.21 0.894-4 2-4s2 1.79 2 4z" />
                <path d="M12 11v2" />
                <path d="M7 11v2" />
                <path d="M17 11v2" />
                <path d="M22 11v2" />
              </svg>
            </motion.div>
          </div>
          <div className={styles.circleLines}>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className={styles.circleLine}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1 + i * 0.2, opacity: 0.1 - i * 0.02 }}
                transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatType: 'loop' }}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          className={styles.formWrapper}
          initial="initial"
          animate="animate"
          variants={formVariants}
        >
          <motion.div className={styles.formCard}>
            <h2 className={styles.title}>Add New Employee</h2>
            <p className={styles.subtitle}>Securely register new team members</p>

            {error && (
              <motion.div
                className={styles.errorMessage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                className={styles.successMessage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {success}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} encType="multipart/form-data">
              {currentStep === 1 && (
                <motion.div
                  className={styles.formStep}
                  initial={{ x: '-100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                >
                  <motion.div 
                    className={styles.inputGroup} 
                    custom={1} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>
                  
                  <motion.div 
                    className={styles.inputGroup} 
                    custom={2} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>
                  
                  <motion.div 
                    className={styles.inputGroup} 
                    custom={3} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>
                  
                  <motion.div 
                    className={styles.inputGroup} 
                    custom={4} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>
                  
                  <motion.button
                    type="button"
                    className={styles.nextButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextStep}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Next Step <span className={styles.arrowIcon}>→</span>
                  </motion.button>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  className={styles.formStep}
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-100%', opacity: 0 }}
                >
                  <motion.div 
                    className={styles.inputGroup} 
                    custom={5} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Designation</label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>
                  
                  <motion.div 
                    className={styles.inputGroup} 
                    custom={6} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Contact Number</label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>

                  <motion.div 
                    className={styles.inputGroup} 
                    custom={7} 
                    variants={inputVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <label>Photo</label>
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      onChange={handleChange}
                      required
                      className={styles.fileInput}
                    />
                  </motion.div>
                  
                  <div className={styles.buttonGroup}>
                    <motion.button
                      type="button"
                      className={styles.backButton}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={prevStep}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <span className={styles.arrowIcon}>←</span> Back
                    </motion.button>
                    
                    <motion.button
                      type="submit"
                      className={styles.submitButton}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isLoading}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {isLoading ? (
                        <span className={styles.spinner}></span>
                      ) : (
                        'Register Employee'
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </form>

            <motion.div
              className={styles.progressIndicator}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className={styles.progressText}>
                Step {currentStep} of {totalSteps}
              </div>
              <div className={styles.progressDots}>
                {[...Array(totalSteps)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`${styles.progressDot} ${i + 1 === currentStep ? styles.activeDot : ''}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className={styles.glowEffect}
            animate={{ 
              opacity: [0.2, 0.5, 0.2], 
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: 'easeInOut'
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AddEmployee;
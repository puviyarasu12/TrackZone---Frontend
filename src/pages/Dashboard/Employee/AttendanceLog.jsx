import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import styles from './AttendanceLog.module.css';

const AttendanceLog = ({ token, employee }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'descending'
  });
  const [filter, setFilter] = useState('all'); // 'all', 'present', 'absent', 'late'

  useEffect(() => {
    if (!employee || !employee.employeeId) {
      setError('Employee ID is missing. Please ensure the employee data is provided correctly.');
      setIsLoading(false);
      console.warn('Employee data is missing or invalid:', employee);
      return;
    }

    const fetchAttendanceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://trackzone-backend.onrender.com/api/employee/attendance/${employee.employeeId}/${currentYear}/${currentMonth}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch attendance data: ${response.statusText}`);
        }

        const { days: monthData } = await response.json(); // Destructure the days array

        // Transform the data to a more usable format for our table
        const transformedData = monthData.map(day => ({
          id: day._id || `${currentYear}-${currentMonth}-${new Date(day.date).getDate()}`,
          date: new Date(day.date),
          day: format(new Date(day.date), 'EEEE'),
          status: day.status.toLowerCase() || 'unknown', // Convert to lowercase for consistency
          checkInTime: day.checkInTime ? format(new Date(day.checkInTime), 'hh:mm a') : '--:--',
          checkOutTime: day.checkOutTime ? format(new Date(day.checkOutTime), 'hh:mm a') : '--:--',
          workHours: day.checkInTime && day.checkOutTime 
            ? calculateWorkHours(new Date(day.checkInTime), new Date(day.checkOutTime))
            : '--'
        }));

        setAttendanceData(transformedData);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError(err.message || 'Error fetching attendance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [employee, token, currentMonth, currentYear]);

  const calculateWorkHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    const diffMs = checkOut - checkIn;
    const diffHrs = diffMs / (1000 * 60 * 60);
    const hours = Math.floor(diffHrs);
    const minutes = Math.floor((diffHrs - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const sortableData = [...attendanceData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    // Apply filter
    if (filter !== 'all') {
      return sortableData.filter(item => item.status === filter);
    }
    
    return sortableData;
  };

  const getMonthName = (month) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1];
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'present': return styles.statusPresent;
      case 'absent': return styles.statusAbsent;
      case 'late': return styles.statusLate;
      case 'leave': return styles.statusLeave; // Adjusted for 'Leave' case
      default: return '';
    }
  };

  const getPercentage = (status) => {
    if (!attendanceData.length) return 0;
    const count = attendanceData.filter(item => item.status === status).length;
    return Math.round((count / attendanceData.length) * 100) || 0;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const headerVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 50 } }
  };

  const emptyStateVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className={styles.attendanceLogContainer}>
      <motion.div 
        className={styles.header}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Attendance Log</h1>
        <div className={styles.breadcrumb}>
          <Link to="/employee-dashboard">Dashboard</Link> {' > '} 
          <span>Attendance Log</span>
        </div>
      </motion.div>

      <motion.div 
        className={styles.statsContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.div className={styles.statCard} whileHover={{ scale: 1.05 }}>
          <div className={styles.statIcon} data-type="present">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <h3>Present</h3>
            <div className={styles.statValue}>{getPercentage('present')}%</div>
          </div>
        </motion.div>

        <motion.div className={styles.statCard} whileHover={{ scale: 1.05 }}>
          <div className={styles.statIcon} data-type="absent">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <h3>Absent</h3>
            <div className={styles.statValue}>{getPercentage('absent')}%</div>
          </div>
        </motion.div>

        <motion.div className={styles.statCard} whileHover={{ scale: 1.05 }}>
          <div className={styles.statIcon} data-type="late">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <h3>Late</h3>
            <div className={styles.statValue}>{getPercentage('late')}%</div>
          </div>
        </motion.div>

        <motion.div className={styles.statCard} whileHover={{ scale: 1.05 }}>
          <div className={styles.statIcon} data-type="leave">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className={styles.statInfo}>
            <h3>On Leave</h3>
            <div className={styles.statValue}>{getPercentage('leave')}%</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className={styles.controlPanel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className={styles.monthSelector}>
          <button className={styles.arrowBtn} onClick={handlePreviousMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2>{getMonthName(currentMonth)} {currentYear}</h2>
          <button className={styles.arrowBtn} onClick={handleNextMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className={styles.filterContainer}>
          <label htmlFor="filter">Filter by status:</label>
          <select 
            id="filter" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="leave">Leave</option>
          </select>
        </div>
      </motion.div>

      {isLoading ? (
        <motion.div 
          className={styles.loadingContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className={styles.loader}></div>
          <p>Loading attendance data...</p>
        </motion.div>
      ) : error ? (
        <motion.div 
          className={styles.errorContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button 
            className={styles.retryBtn}
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchAttendanceData();
            }}
          >
            Retry
          </button>
        </motion.div>
      ) : getSortedData().length === 0 ? (
        <motion.div 
          className={styles.emptyState}
          variants={emptyStateVariants}
          initial="hidden"
          animate="visible"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3>No Attendance Records</h3>
          <p>No attendance records found for {getMonthName(currentMonth)} {currentYear}</p>
        </motion.div>
      ) : (
        <motion.div 
          className={styles.tableContainer}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <table className={styles.attendanceTable}>
            <thead>
              <tr>
                <motion.th variants={headerVariants} onClick={() => requestSort('date')}>
                  Date {getSortIcon('date')}
                </motion.th>
                <motion.th variants={headerVariants} onClick={() => requestSort('day')}>
                  Day {getSortIcon('day')}
                </motion.th>
                <motion.th variants={headerVariants} onClick={() => requestSort('checkInTime')}>
                  Check In {getSortIcon('checkInTime')}
                </motion.th>
                <motion.th variants={headerVariants} onClick={() => requestSort('checkOutTime')}>
                  Check Out {getSortIcon('checkOutTime')}
                </motion.th>
                <motion.th variants={headerVariants} onClick={() => requestSort('workHours')}>
                  Work Hours {getSortIcon('workHours')}
                </motion.th>
                <motion.th variants={headerVariants} onClick={() => requestSort('status')}>
                  Status {getSortIcon('status')}
                </motion.th>
              </tr>
            </thead>
            <tbody>
              {getSortedData().map((record, index) => (
                <motion.tr 
                  key={record.id || index}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, backgroundColor: 'var(--highlight-bg)' }}
                >
                  <td>{format(record.date, 'dd MMM yyyy')}</td>
                  <td>{record.day}</td>
                  <td>{record.checkInTime}</td>
                  <td>{record.checkOutTime}</td>
                  <td>{record.workHours}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default AttendanceLog;
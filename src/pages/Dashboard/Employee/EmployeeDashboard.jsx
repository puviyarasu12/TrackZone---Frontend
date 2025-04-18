import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import styles from './EmployeeDashboard.module.css';

const EmployeeDashboard = ({ onLogout, token, employee }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: employee?.name || 'Loading...',
    position: employee?.designation || 'Loading...',
    department: employee?.department || 'Loading...',
    avatar: employee?.photo || '/assets/default-avatar.png',
    checkInTime: '--:-- --',
    checkOutTime: '--:-- --',
    totalHours: '0h 0m',
    remainingLeaves: 0,
    upcomingMeetings: [],
    tasks: [],
    recentActivity: []
  });
  const [date, setDate] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [lastCheckInAttempt, setLastCheckInAttempt] = useState(null);
  const [lastCheckOutAttempt, setLastCheckOutAttempt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fingerprintFailed, setFingerprintFailed] = useState(false);

  const handleFingerprintAuth = async () => {
    if (!window.PublicKeyCredential) {
      alert("Your browser doesn't support fingerprint authentication.");
      setFingerprintFailed(true);
      return false;
    }

    try {
      const publicKey = {
        challenge: Uint8Array.from('randomChallengeString123', c => c.charCodeAt(0)),
        timeout: 60000,
        userVerification: "required"
      };

      const assertion = await navigator.credentials.get({ publicKey });
      console.log('Fingerprint verified successfully:', assertion);
      setFingerprintFailed(false);
      return true;
    } catch (err) {
      console.error('Fingerprint authentication failed:', err);
      setFingerprintFailed(true);
      return false;
    }
  };

  const handleAutoCheckIn = async () => {
    const now = new Date();
    if (lastCheckInAttempt && (now.getTime() - lastCheckInAttempt.getTime()) < 3000) {
      return; // Debounce check-in attempts
    }
    setLastCheckInAttempt(now);

    const verified = await handleFingerprintAuth();
    if (!verified) return;

    setIsLoading(true);
    try {
      const response = await fetch('https://trackzone-backend.onrender.com/api/employee/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: employee.email,
          latitude: 10.8261981,
          longitude: 77.0608064
        })
      });

      if (response.ok) {
        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setUserData(prev => ({ ...prev, checkInTime: formattedTime }));
        setIsCheckedIn(true);
        console.log('Auto check-in successful');
      } else {
        console.error('Check-in failed:', await response.json());
        alert('Failed to check in. Please try again.');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      alert('Failed to check in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    const now = new Date();
    if (lastCheckOutAttempt && (now.getTime() - lastCheckOutAttempt.getTime()) < 3000) {
      return; // Debounce check-out attempts
    }
    setLastCheckOutAttempt(now);

    setIsLoading(true);
    try {
      const response = await fetch('https://trackzone-backend.onrender.com/api/employee/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: employee.email,
          latitude: 10.8261981,
          longitude: 77.0608064
        })
      });

      if (response.ok) {
        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setUserData(prev => ({ ...prev, checkOutTime: formattedTime }));
        setIsCheckedIn(false);
        await fetchDashboardData(); // Refresh data
      } else {
        console.error('Checkout failed:', await response.json());
        alert('Failed to check out. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to check out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [checkinRes, workMetricsRes, tasksRes, meetingsRes] = await Promise.all([
        fetch(`https://trackzone-backend.onrender.com/api/employee/dashboard/${employee.employeeId}/checkin`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://trackzone-backend.onrender.com/api/employee/dashboard/${employee.employeeId}/work-metrics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://trackzone-backend.onrender.com/api/employee/dashboard/${employee.employeeId}/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://trackzone-backend.onrender.com/api/employee/dashboard/${employee.employeeId}/meetings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!checkinRes.ok) throw new Error('Failed to fetch check-in data');
      if (!workMetricsRes.ok) throw new Error('Failed to fetch work metrics');
      if (!tasksRes.ok) throw new Error('Failed to fetch tasks');
      if (!meetingsRes.ok) throw new Error('Failed to fetch meetings');

      const checkinData = await checkinRes.json();
      const workMetricsData = await workMetricsRes.json();
      const tasksData = await tasksRes.json();
      const meetingsData = await meetingsRes.json();

      const formatTime = (date) => {
        if (!date) return '--:-- --';
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      };

      setUserData(prev => ({
        ...prev,
        checkInTime: formatTime(checkinData.checkInTime),
        checkOutTime: formatTime(checkinData.checkOutTime),
        totalHours: `${Math.floor(workMetricsData.totalHours)}h ${Math.round((workMetricsData.totalHours % 1) * 60)}m`,
        remainingLeaves: workMetricsData.leaveCount,
        tasks: tasksData.map(task => ({
          id: task._id,
          title: task.title,
          priority: task.priority || 'Medium',
          status: task.status || 'To Do',
          deadline: new Date(task.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        })),
        upcomingMeetings: meetingsData.map(meeting => ({
          id: meeting._id,
          title: meeting.title,
          time: new Date(meeting.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          host: meeting.host || 'Unknown'
        })),
        recentActivity: checkinData.checkInTime ? [
          { id: 1, action: 'Checked in', time: formatTime(checkinData.checkInTime) }
        ] : []
      }));

      const checkedIn = !!checkinData.checkInTime && !checkinData.checkOutTime;
      const hasCheckedOutToday = !!checkinData.checkInTime && !!checkinData.checkOutTime;
      setIsCheckedIn(checkedIn);
      return !hasCheckedOutToday && !checkedIn;
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      alert('Failed to fetch dashboard data. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      const needsCheckIn = await fetchDashboardData();
      if (needsCheckIn && !fingerprintFailed) {
        await handleAutoCheckIn();
      }

      gsap.from('.statCard', {
        duration: 1,
        y: 20,
        opacity: 0,
        stagger: 0.2,
        ease: 'back.out(1.7)'
      });
    };

    initializeDashboard();

    const interval = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, [employee.employeeId, token, fingerprintFailed]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

  return (
    <div className={styles.dashboardContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
      <motion.div className={styles.topBar} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className={styles.dateContainer}>
          <span className={styles.dateLabel}>Date</span>
          <div className={styles.date}>{formatDate(date)}</div>
        </div>
        <div className={styles.clockContainer}>
          <span className={styles.timeLabel}>Time</span>
          <div className={styles.clock}>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div className={styles.userInfo}>
          <span>{userData.name}</span>
          <div className={styles.avatar}><img src={userData.avatar} alt="User avatar" /></div>
        </div>
      </motion.div>

      <div className={styles.mainContent}>
        <motion.div className={styles.sidebar} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className={styles.userProfile}>
            <div className={styles.avatarLarge}><img src={userData.avatar} alt="User avatar" /></div>
            <h3>{userData.name}</h3>
            <p>{userData.position}</p>
            <p className={styles.department}>{userData.department}</p>
          </div>
          <motion.div className={styles.attendanceCard} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className={styles.attendanceHeader}>
              <h3>Attendance</h3>
              <span className={isCheckedIn ? styles.statusActive : styles.statusInactive}>{isCheckedIn ? 'Active' : 'Checked Out'}</span>
            </div>
            <div className={styles.timeInfo}>
              <div className={styles.timeBlock}><span className={styles.timeLabel}>Check In</span><span className={styles.timeValue}>{userData.checkInTime}</span></div>
              <div className={styles.timeDivider}></div>
              <div className={styles.timeBlock}><span className={styles.timeLabel}>Check Out</span><span className={styles.timeValue}>{userData.checkOutTime}</span></div>
            </div>
            {isCheckedIn && (
              <motion.button 
                className={styles.checkoutBtn} 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={handleCheckOut}
                disabled={isLoading}
              >
                Check Out
              </motion.button>
            )}
          </motion.div>
          <nav className={styles.sidebarNav}>
            <Link to="/employee-dashboard" className={styles.active}>Dashboard</Link>
            <Link to="/employee-dashboard/attendance">Attendance Log</Link>
            <Link to="/employee-dashboard/tasks">Tasks & Projects</Link>
            <Link to="/employee-dashboard/leaves">Leave Management</Link>
            <Link to="/employee-dashboard/profile">My Profile</Link>
            <Link to="/employee-dashboard/settings">Settings</Link>
          </nav>
          <button onClick={handleLogout} className={styles.logoutBtn}>Log Out</button>
        </motion.div>

        <div className={styles.dashboardContent}>
          <motion.h2 className={styles.welcomeMessage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            Welcome back, {userData.name.split(' ')[0]}!
          </motion.h2>

          <div className={styles.statsContainer}>
            <motion.div className={`${styles.statCard} statCard`} whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <div className={styles.statIcon} data-type="hours">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <h3>Hours This Week</h3>
                <div className={styles.statValue}>{userData.totalHours}</div>
              </div>
            </motion.div>
            <motion.div className={`${styles.statCard} statCard`} whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <div className={styles.statIcon} data-type="leaves">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <h3>Available Leaves</h3>
                <div className={styles.statValue}>{userData.remainingLeaves}</div>
              </div>
            </motion.div>
            <motion.div className={`${styles.statCard} statCard`} whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <div className={styles.statIcon} data-type="tasks">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <h3>Tasks Completed</h3>
                <div className={styles.statValue}>
                  {userData.tasks.filter(t => t.status === 'Completed').length}/{userData.tasks.length}
                </div>
              </div>
            </motion.div>
          </div>

          <div className={styles.widgetsContainer}>
            <motion.div className={styles.widget} variants={containerVariants} initial="hidden" animate="visible">
              <div className={styles.widgetHeader}>
                <h3>My Tasks</h3>
                <Link to="/employee-dashboard/tasks" className={styles.viewAll}>View All</Link>
              </div>
              <div className={styles.tasksList}>
                {userData.tasks.map(task => (
                  <motion.div key={task.id} className={styles.taskItem} variants={itemVariants}>
                    <div className={styles.taskInfo}>
                      <h4>{task.title}</h4>
                      <div className={styles.taskMeta}>
                        <span className={`${styles.taskPriority} ${styles[`priority${task.priority}`]}`}>
                          {task.priority}
                        </span>
                        <span className={styles.taskDeadline}>{task.deadline}</span>
                      </div>
                    </div>
                    <div className={`${styles.taskStatus} ${styles[task.status.replace(/\s+/g, '')]}`}>
                      {task.status}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div className={styles.widget} variants={containerVariants} initial="hidden" animate="visible">
              <div className={styles.widgetHeader}>
                <h3>Today's Meetings</h3>
                <Link to="/employee-dashboard/calendar" className={styles.viewAll}>View Calendar</Link>
              </div>
              {userData.upcomingMeetings.length > 0 ? (
                <div className={styles.meetingsList}>
                  {userData.upcomingMeetings.map(meeting => (
                    <motion.div key={meeting.id} className={styles.meetingItem} variants={itemVariants}>
                      <div className={styles.meetingTime}>{meeting.time}</div>
                      <div className={styles.meetingInfo}>
                        <h4>{meeting.title}</h4>
                        <p>Host: {meeting.host}</p>
                      </div>
                      <button className={styles.joinBtn}>Join</button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className={styles.noData}>No meetings scheduled for today</p>
              )}
            </motion.div>
          </div>

          <motion.div className={styles.activityWidget} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
            <div className={styles.widgetHeader}>
              <h3>Recent Activity</h3>
            </div>
            <div className={styles.activityList}>
              {userData.recentActivity.map(activity => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityDot}></div>
                  <div className={styles.activityInfo}>
                    <p>{activity.action}</p>
                    <span>{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
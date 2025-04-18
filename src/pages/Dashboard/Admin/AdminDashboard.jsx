import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import { gsap } from 'gsap';
import { jwtDecode } from 'jwt-decode';

// Embedded ErrorBoundary class
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please try again later.</h1>;
    }
    return this.props.children;
  }
}

const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    averageWorkHours: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [geofenceData, setGeofenceData] = useState({
    center: { lat: 10.8261981, lng: 77.0608064 },
    radius: 500000,
    name: 'Office Headquarters',
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [activeEmployeesLoading, setActiveEmployeesLoading] = useState(true);

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    recipients: 'all',
    selectedDepartment: '',
    selectedEmployee: '',
    priority: 'normal',
  });
  const [geofenceForm, setGeofenceForm] = useState({
    name: geofenceData.name,
    latitude: geofenceData.center.lat,
    longitude: geofenceData.center.lng,
    radius: geofenceData.radius,
  });

  const API_BASE_URL = 'https://trackzone-backend.onrender.com/api/admin';

  const getToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          navigate('/login');
          return null;
        }
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
        return null;
      }
    }
    return token;
  };

  const getRole = () => localStorage.getItem('role');

  const departments = useMemo(() => {
    return [...new Set(employees.map(emp => emp.department).filter(Boolean))];
  }, [employees]);

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const role = getRole();

      if (!token || role !== 'admin') {
        setError('Unauthorized access. Please log in as an admin.');
        navigate(role === 'employee' ? '/employee-dashboard' : '/login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/dashboardadmin-overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status !== 200) {
        throw new Error(response.data.message || 'Failed to fetch admin data');
      }

      setAdminData({
        name: response.data.name,
        position: response.data.position || 'HR Administrator',
        department: response.data.department || 'Human Resources',
        avatar: response.data.photo || '/assets/admin-avatar.png',
        lastLogin: response.data.lastLogin ? new Date(response.data.lastLogin).toLocaleString() : 'N/A',
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch admin data');
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchDashboardOverview = useCallback(async () => {
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/dashboard-overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });

      if (response.status !== 200) {
        throw new Error(response.data.message || 'Failed to load dashboard overview');
      }

        setAttendanceSummary({
          totalEmployees: response.data.total || 0,
          presentToday: response.data.presentToday || 0,
          onLeave: response.data.onLeave || 0,
          averageWorkHours: response.data.avgHours || 0,
        });
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retrying dashboard overview fetch (${retryCount}/${maxRetries})`);
          setTimeout(attemptFetch, 1000 * retryCount);
        } else {
          setError('Unable to load dashboard data: ' + err.message);
          console.error('Dashboard overview fetch error:', err);
        }
      }
    };

    attemptFetch();
  }, [navigate]);

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });

      if (response.status !== 200) {
        throw new Error(response.data.message || 'Failed to fetch employees');
      }

        const mappedEmployees = response.data.map(emp => ({
          id: emp._id,
          employeeId: emp.employeeId,
          name: emp.name,
          position: emp.position || 'N/A',
          department: emp.department || 'N/A',
          avatar: emp.photoPath || '/assets/avatar.png',
          status: emp.onLeave ? 'Inactive' : 'Active',
          checkInTime: '--:-- --',
          checkOutTime: '--:-- --',
          email: emp.email,
          phone: emp.contactNumber || 'N/A',
          totalHoursThisWeek: 0,
          attendanceRate: 0,
          location: emp.location || null,
        }));
        setEmployees(mappedEmployees);
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retrying employees fetch (${retryCount}/${maxRetries})`);
          setTimeout(attemptFetch, 1000 * retryCount);
        } else {
          setError('Failed to fetch employees: ' + err.message);
          console.error('Employees fetch error:', err);
        }
      } finally {
        setEmployeesLoading(false);
      }
    };

    attemptFetch();
  }, [navigate]);

  const fetchActiveEmployees = useCallback(async () => {
    setActiveEmployeesLoading(true);
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/dashboard/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });

      if (response.status !== 200) {
        throw new Error(response.data.message || 'Failed to fetch active employees');
      }

        setEmployees(prev =>
          prev.map(emp => {
            const activeCheckin = response.data.find(
              check => check.employeeId._id === emp.id && check.active
            );
            return {
              ...emp,
              status: activeCheckin ? 'Active' : emp.status,
              checkInTime: activeCheckin
                ? new Date(activeCheckin.checkInTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : emp.checkInTime,
              location: activeCheckin?.location || emp.location,
            };
          })
        );
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retrying active employees fetch (${retryCount}/${maxRetries})`);
          setTimeout(attemptFetch, 1000 * retryCount);
        } else {
          setError('Failed to fetch active employees: ' + err.message);
          console.error('Active employees fetch error:', err);
        }
      } finally {
        setActiveEmployeesLoading(false);
      }
    };

    attemptFetch();
  }, [navigate]);

  const fetchTasks = useCallback(async () => {
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });

      if (response.status !== 200) {
        throw new Error(response.data.message || 'Failed to fetch tasks');
      }

        setTasks(
          response.data.map(task => ({
            id: task._id,
            title: task.title,
            assignedTo: task.employeeId?.name || 'Unassigned',
            priority: task.priority,
            status: task.status,
            dueDate: new Date(task.dueDate).toISOString().split('T')[0],
          }))
        );
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retrying tasks fetch (${retryCount}/${maxRetries})`);
          setTimeout(attemptFetch, 1000 * retryCount);
        } else {
          setError('Failed to fetch tasks: ' + err.message);
          console.error('Tasks fetch error:', err);
        }
      }
    };

    attemptFetch();
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await fetchAdminData();
        if (isMounted) {
          await fetchDashboardOverview();
          await fetchEmployees();
          await fetchTasks();
          await fetchActiveEmployees();
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to initialize dashboard: ' + err.message);
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [fetchAdminData, fetchDashboardOverview, fetchEmployees, fetchTasks, fetchActiveEmployees]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'overview' && attendanceSummary.totalEmployees > 0) {
      gsap.from('.statCard', {
        duration: 1,
        y: 20,
        opacity: 0,
        stagger: 0.2,
        ease: 'back.out(1.7)',
      });
    }
  }, [activeTab, attendanceSummary]);

  const handleSendNotification = async e => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/notifications`,
        {
          title: notificationForm.title,
          message: notificationForm.message,
          recipients: notificationForm.recipients,
          department: notificationForm.selectedDepartment || undefined,
          employeeId: notificationForm.selectedEmployee || undefined,
          priority: notificationForm.priority,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error(response.data.message || 'Failed to send notification');
      }

      const newNotification = {
        id: Date.now(),
        type: 'info',
        message: `Notification sent: ${notificationForm.title}`,
        time: 'Just now',
        read: false,
      };
      setNotifications([newNotification, ...notifications]);
      setRecentActivity([
        {
          id: Date.now(),
          action: `Sent notification: ${notificationForm.title}`,
          time: 'Just now',
          user: adminData?.name || 'Admin',
        },
        ...recentActivity,
      ]);
      setShowNotificationModal(false);
      setNotificationForm({
        title: '',
        message: '',
        recipients: 'all',
        selectedDepartment: '',
        selectedEmployee: '',
        priority: 'normal',
      });
    } catch (err) {
      setError(err.message || 'Failed to send notification');
      console.error('Notification send error:', err);
    }
  };

  const handleUpdateGeofence = async e => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/geofence`,
        {
          name: geofenceForm.name,
          latitude: parseFloat(geofenceForm.latitude),
          longitude: parseFloat(geofenceForm.longitude),
          radius: parseInt(geofenceForm.radius),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error(response.data.message || 'Failed to update geofence');
      }

      setGeofenceData({
        center: {
          lat: parseFloat(geofenceForm.latitude),
          lng: parseFloat(geofenceForm.longitude),
        },
        radius: parseInt(geofenceForm.radius),
        name: geofenceForm.name,
      });
      setRecentActivity([
        {
          id: Date.now(),
          action: `Updated geofence: ${geofenceForm.name}`,
          time: 'Just now',
          user: adminData?.name || 'Admin',
        },
        ...recentActivity,
      ]);
      setShowGeofenceModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update geofence');
      console.error('Geofence update error:', err);
    }
  };

  const handleTabChange = tab => {
    setActiveTab(tab);
    navigate(`/admin-dashboard/${tab}`);
  };

  const handleAddEmployee = () => {
    navigate('/admin-dashboard/add-employee');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    onLogout();
    navigate('/login');
  };

  const formatDate = date => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  };

  if (loading) {
    return (
      <div className="dashboardContainer">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="dashboardContainer">
        <style>
          {`
            .dashboardContainer {
              display: flex;
              flex-direction: column;
              height: 100vh;
              background: #1a1a1a;
              color: #fff;
              font-family: Arial, sans-serif;
            }

            .loading {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
              font-size: 1.5em;
              color: #ccc;
            }

            .topBar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 20px;
              background: #0d0d0d;
              border-bottom: 1px solid #222;
            }

            .dateContainer, .clockContainer {
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .dateLabel, .timeLabel {
              font-size: 0.8em;
              color: #bbb;
            }

            .date, .clock {
              font-size: 1.2em;
              font-weight: bold;
            }

            .notificationBell {
              position: relative;
              cursor: pointer;
            }

            .notificationCount {
              position: absolute;
              top: -5px;
              right: -5px;
              background: #ff4444;
              color: #fff;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.8em;
            }

            .userInfo {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .avatar img {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              object-fit: cover;
            }

            .mainContent {
              display: flex;
              flex: 1;
            }

            .sidebar {
              width: 250px;
              background: #0d0d0d;
              padding: 20px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }

            .userProfile {
              text-align: center;
            }

            .avatarLarge img {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              object-fit: cover;
              margin-bottom: 10px;
            }

            .userProfileInfo h3 {
              margin: 0;
              font-size: 1.2em;
            }

            .userProfileInfo p {
              margin: 5px 0;
              font-size: 0.9em;
              color: #bbb;
            }

            .lastLogin {
              text-align: center;
            }

            .lastLoginLabel {
              font-size: 0.8em;
              color: #bbb;
            }

            .lastLoginValue {
              font-size: 1em;
            }

            .sidebarNav a {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px;
              color: #bbb;
              text-decoration: none;
              border-radius: 5px;
            }

            .sidebarNav a.active, .sidebarNav a:hover {
              background: #222;
              color: #fff;
            }

            .logoutBtn {
              background: #ff4444;
              border: none;
              padding: 10px;
              color: #fff;
              cursor: pointer;
              border-radius: 5px;
              width: 100%;
            }

            .dashboardContent {
              flex: 1;
              padding: 20px;
            }

            .dashboardHeader {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }

            .welcomeMessage {
              font-size: 1.5em;
            }

            .quickActions {
              display: flex;
              gap: 10px;
            }

            .actionBtn {
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .addEmployeeBtn { background: #28a745; color: #fff; }
            .notificationBtn { background: #ff9500; color: #fff; }
            .geofenceBtn { background: #007bff; color: #fff; }

            .statsContainer {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }

            .statCard {
              background: #222;
              padding: 15px;
              border-radius: 5px;
              text-align: center;
            }

            .statIcon svg {
              width: 40px;
              height: 40px;
            }

            .statInfo h3 {
              margin: 0 0 10px;
              font-size: 1.1em;
            }

            .statValue {
              font-size: 1.5em;
              font-weight: bold;
            }

            .widgetsContainer {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }

            .widget {
              background: #222;
              border-radius: 5px;
              padding: 15px;
            }

            .widgetHeader {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }

            .viewAll {
              color: #007bff;
              text-decoration: none;
              font-size: 0.9em;
            }

            .employeesList, .tasksList, .activityList {
              max-height: 300px;
              overflow-y: auto;
            }

            .employeeCard, .taskCard, .activityItem {
              padding: 10px;
              border-bottom: 1px solid #333;
            }

            .employeeAvatar img {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              margin-right: 10px;
            }

            .statusIndicator {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              display: inline-block;
              margin-left: 5px;
            }

            .statusIndicator.active { background: #28a745; }
            .statusIndicator.inactive { background: #dc3545; }

            .taskPriority {
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 0.8em;
            }

            .taskPriority.low { background: #28a745; }
            .taskPriority.medium { background: #ff9500; }
            .taskPriority.high { background: #dc3545; }

            .taskStatus {
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 0.8em;
              margin-top: 5px;
              display: inline-block;
            }

            .taskStatus.pending { background: #ff9500; }
            .taskStatus.inprogress { background: #007bff; }
            .taskStatus.completed { background: #28a745; }

            .activityText {
              margin: 0;
            }

            .activityUser {
              font-weight: bold;
            }

            .activityTime {
              color: #bbb;
              font-size: 0.8em;
            }

            .mapContainer {
              height: 250px;
            }

            .modalOverlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
            }

            .modal {
              background: #222;
              padding: 20px;
              border-radius: 5px;
              width: 90%;
              max-width: 500px;
              position: relative;
            }

            .modalHeader {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }

            .closeBtn {
              background: none;
              border: none;
              font-size: 1.5em;
              color: #fff;
              cursor: pointer;
            }

            .formGroup {
              margin-bottom: 15px;
            }

            .formGroup label {
              display: block;
              margin-bottom: 5px;
              color: #bbb;
            }

            .formGroup input, .formGroup textarea, .formGroup select {
              width: 100%;
              padding: 8px;
              background: #333;
              border: 1px solid #444;
              border-radius: 4px;
              color: #fff;
            }

            .formRow {
              display: flex;
              gap: 10px;
            }

            .radioGroup {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }

            .radioGroup label {
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .formActions {
              display: flex;
              justify-content: flex-end;
              gap: 10px;
            }

            .cancelBtn {
              background: #666;
              border: none;
              padding: 10px 20px;
              color: #fff;
              border-radius: 5px;
              cursor: pointer;
            }

            .submitBtn {
              background: #28a745;
              border: none;
              padding: 10px 20px;
              color: #fff;
              border-radius: 5px;
              cursor: pointer;
            }

            .employeeModal {
              max-width: 600px;
            }

            .employeeDetailContent {
              padding: 20px;
            }

            .employeeProfileHeader {
              display: flex;
              align-items: center;
              gap: 20px;
              margin-bottom: 20px;
            }

            .employeeAvatarLarge img {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              object-fit: cover;
            }

            .employeeProfileInfo h2 {
              margin: 0;
              font-size: 1.5em;
            }

            .employeeDetailSection {
              margin-bottom: 20px;
            }

            .detailRow {
              display: flex;
              gap: 10px;
              margin-bottom: 5px;
            }

            .detailLabel {
              color: #bbb;
              width: 120px;
            }

            .detailValue {
              flex: 1;
            }

            .employeeModalActions {
              display: flex;
              gap: 10px;
              justify-content: flex-end;
            }

            .messageBtn { background: #007bff; }
            .editBtn { background: #ff9500; }
            .viewHistoryBtn { background: #28a745; }

            .error {
              background: #dc3545;
              color: #fff;
              padding: 10px;
              margin-bottom: 10px;
              border-radius: 5px;
              display: flex;
              align-items: center;
            }
          `}
        </style>

        {error && (
          <div className="error">
            {error}
            <button onClick={() => window.location.reload()} style={{ marginLeft: '10px', padding: '5px 10px' }}>
              Retry
            </button>
          </div>
        )}
        <motion.div
          className="topBar"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="dateContainer">
            <span className="dateLabel">Date</span>
            <div className="date">{formatDate(date)}</div>
          </div>
          <div className="clockContainer">
            <span className="timeLabel">Time</span>
            <div className="clock">
              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="notificationBell">
            <span className="notificationCount">
              {notifications.filter(n => !n.read).length}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div className="userInfo">
            <span>{adminData?.name || 'Loading...'}</span>
            <div className="avatar">
              <img
                src={adminData?.avatar || 'https://via.placeholder.com/100?text=Admin'}
                alt="Admin avatar"
                onError={e => {
                  e.target.src = 'https://via.placeholder.com/100?text=Admin';
                  console.warn('Failed to load admin avatar');
                }}
              />
            </div>
          </div>
        </motion.div>

        <div className="mainContent">
          <motion.div
            className="sidebar"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="userProfile">
              <div className="avatarLarge">
                <img
                  src={adminData?.avatar || '/assets/admin-avatar.png'}
                  alt="Admin avatar"
                  onError={e => {
                    e.target.src = '/assets/admin-avatar.png';
                    console.warn('Failed to load admin avatar');
                  }}
                />
              </div>
              <div className="userProfileInfo">
                <h3>{adminData?.name || 'Loading...'}</h3>
                <p>{adminData?.position || 'N/A'}</p>
                <p className="department">{adminData?.department || 'N/A'}</p>
              </div>
            </div>

            <div className="lastLogin">
              <span className="lastLoginLabel">Last Login</span>
              <span className="lastLoginValue">{adminData?.lastLogin || 'N/A'}</span>
            </div>

            <nav className="sidebarNav">
              <Link
                to="/admin-dashboard"
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => handleTabChange('overview')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Dashboard Overview
              </Link>
              <Link
                to="/admin-dashboard/add-employee"
                className={activeTab === 'employees' ? 'active' : ''}
                onClick={() => handleTabChange('employees')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Employee Management
              </Link>
              <Link
                to="/admin-dashboard/tasks"
                className={activeTab === 'tasks' ? 'active' : ''}
                onClick={() => handleTabChange('tasks')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                Manage Tasks
              </Link>
              <Link
                to="/admin-dashboard/attendance"
                className={activeTab === 'attendance' ? 'active' : ''}
                onClick={() => handleTabChange('attendance')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Attendance Logs
              </Link>
              <Link
                to="/admin-dashboard/geofence"
                className={activeTab === 'geofence' ? 'active' : ''}
                onClick={() => handleTabChange('geofence')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="10" r="3"></circle>
                  <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
                </svg>
                Geofence Configuration
              </Link>
              <Link
                to="/admin-dashboard/notifications"
                className={activeTab === 'notifications' ? 'active' : ''}
                onClick={() => handleTabChange('notifications')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                Notifications
              </Link>
              <Link
                to="/admin-dashboard/reports"
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => handleTabChange('reports')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Reports
              </Link>
              <Link
                to="/admin-dashboard/settings"
                className={activeTab === 'settings' ? 'active' : ''}
                onClick={() => handleTabChange('settings')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Settings
              </Link>
            </nav>

            <button onClick={handleLogout} className="logoutBtn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log Out
            </button>
          </motion.div>

          <div className="dashboardContent">
            {activeTab === 'overview' && (
              <>
                <motion.div
                  className="dashboardHeader"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="welcomeMessage">Admin Dashboard</h2>
                  <div className="quickActions">
                    <motion.button
                      className="actionBtn addEmployeeBtn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddEmployee}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                      Add Employee
                    </motion.button>
                    <motion.button
                      className="actionBtn notificationBtn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowNotificationModal(true)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      Send Notification
                    </motion.button>
                    <motion.button
                      className="actionBtn geofenceBtn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowGeofenceModal(true)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="10" r="3"></circle>
                        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
                      </svg>
                      Configure Geofence
                    </motion.button>
                  </div>
                </motion.div>

                <div className="statsContainer">
                  <motion.div
                    className="statCard"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <div className="statIcon employeesIcon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div className="statInfo">
                      <h3>Total Employees</h3>
                      <div className="statValue">{attendanceSummary.totalEmployees}</div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="statCard"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <div className="statIcon presentIcon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div className="statInfo">
                      <h3>Present Today</h3>
                      <div className="statValue">{attendanceSummary.presentToday}</div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="statCard"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <div className="statIcon leaveIcon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div className="statInfo">
                      <h3>On Leave</h3>
                      <div className="statValue">{attendanceSummary.onLeave}</div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="statCard"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <div className="statIcon hoursIcon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div className="statInfo">
                      <h3>Avg. Work Hours</h3>
                      <div className="statValue">{attendanceSummary.averageWorkHours}h</div>
                    </div>
                  </motion.div>
                </div>

                <div className="widgetsContainer">
                  <motion.div
                    className="widget employeesWidget"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="widgetHeader">
                      <h3>Active Employees</h3>
                      <Link to="/admin-dashboard/employees" className="viewAll">
                        View All
                      </Link>
                    </div>
                    <div className="employeesList">
                      {employeesLoading || activeEmployeesLoading ? (
                        <p>Loading employees...</p>
                      ) : employees.filter(emp => emp.status === 'Active').length > 0 ? (
                        employees
                          .filter(emp => emp.status === 'Active')
                          .slice(0, 5)
                          .map(employee => (
                            <motion.div
                              key={employee.id}
                              className="employeeCard"
                              variants={itemVariants}
                              onClick={() => setSelectedEmployee(employee)}
                            >
                              <div className="employeeAvatar">
                                <img
                                  src={employee.avatar}
                                  alt={`${employee.name}'s avatar`}
                                  onError={e => {
                                    e.target.src = '/assets/avatar.png';
                                    console.warn(`Failed to load image for ${employee.name}`);
                                  }}
                                />
                                <span
                                  className={`statusIndicator ${employee.status.toLowerCase()}`}
                                ></span>
                              </div>
                              <div className="employeeInfo">
                                <h4>{employee.name}</h4>
                                <p>{employee.position}</p>
                                <div className="checkInInfo">
                                  <span className="checkInLabel">Checked in:</span>
                                  <span className="checkInTime">{employee.checkInTime}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))
                      ) : (
                        <p>No active employees at the moment.</p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    className="widget tasksWidget"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="widgetHeader">
                      <h3>Recent Tasks</h3>
                      <Link to="/admin-dashboard/tasks" className="viewAll">
                        View All
                      </Link>
                    </div>
                    <div className="tasksList">
                      {tasks.slice(0, 5).map(task => (
                        <motion.div key={task.id} className="taskCard" variants={itemVariants}>
                          <div className="taskHeader">
                            <h4>{task.title}</h4>
                            <span
                              className={`taskPriority ${task.priority.toLowerCase()}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <div className="taskDetails">
                            <div className="taskAssignee">
                              <span className="taskLabel">Assigned to:</span>
                              <span>{task.assignedTo}</span>
                            </div>
                            <div className="taskDueDate">
                              <span className="taskLabel">Due:</span>
                              <span>{new Date(task.dueDate).toLocaleDateString('en-US')}</span>
                            </div>
                          </div>
                          <div
                            className={`taskStatus ${task.status.toLowerCase().replace(' ', '')}`}
                          >
                            {task.status}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    className="widget activityWidget"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="widgetHeader">
                      <h3>Recent Activity</h3>
                    </div>
                    <div className="activityList">
                      {recentActivity.slice(0, 5).map(activity => (
                        <motion.div
                          key={activity.id}
                          className="activityItem"
                          variants={itemVariants}
                        >
                          <div className="activityInfo">
                            <p className="activityText">
                              <span className="activityUser">{activity.user}</span>{' '}
                              {activity.action}
                            </p>
                            <span className="activityTime">{activity.time}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    className="widget locationWidget"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="widgetHeader">
                      <h3>Employee Locations</h3>
                      <button onClick={() => setShowGeofenceModal(true)} className="configureBtn">
                        Configure
                      </button>
                    </div>
                    <div className="mapContainer">
                      <MapContainer
                        center={geofenceData.center}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Circle
                          center={geofenceData.center}
                          radius={geofenceData.radius}
                          pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                        />
                        {employees
                          .filter(emp => emp.location)
                          .map(employee => (
                            <Marker
                              key={employee.id}
                              position={[employee.location.lat, employee.location.lng]}
                            >
                              <Popup>
                                <div className="employeePopup">
                                  <strong>{employee.name}</strong>
                                  <p>{employee.position}</p>
                                  <p>Checked in: {employee.checkInTime}</p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}
                      </MapContainer>
                    </div>
                  </motion.div>
                </div>
              </>
            )}

            {showNotificationModal && (
              <div className="modalOverlay">
                <motion.div
                  className="modal"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="modalHeader">
                    <h3>Send Notification</h3>
                    <button className="closeBtn" onClick={() => setShowNotificationModal(false)}>
                      ×
                    </button>
                  </div>
                  <form className="notificationForm" onSubmit={handleSendNotification}>
                    <div className="formGroup">
                      <label htmlFor="notificationTitle">Title</label>
                      <input
                        type="text"
                        id="notificationTitle"
                        value={notificationForm.title}
                        onChange={e =>
                          setNotificationForm({ ...notificationForm, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="notificationMessage">Message</label>
                      <textarea
                        id="notificationMessage"
                        value={notificationForm.message}
                        onChange={e =>
                          setNotificationForm({ ...notificationForm, message: e.target.value })
                        }
                        required
                      ></textarea>
                    </div>
                    <div className="formGroup">
                      <label>Recipients</label>
                      <div className="radioGroup">
                        <label>
                          <input
                            type="radio"
                            name="recipients"
                            value="all"
                            checked={notificationForm.recipients === 'all'}
                            onChange={e =>
                              setNotificationForm({
                                ...notificationForm,
                                recipients: e.target.value,
                              })
                            }
                          />
                          All Employees
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="recipients"
                            value="department"
                            checked={notificationForm.recipients === 'department'}
                            onChange={e =>
                              setNotificationForm({
                                ...notificationForm,
                                recipients: e.target.value,
                              })
                            }
                          />
                          By Department
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="recipients"
                            value="individual"
                            checked={notificationForm.recipients === 'individual'}
                            onChange={e =>
                              setNotificationForm({
                                ...notificationForm,
                                recipients: e.target.value,
                              })
                            }
                          />
                          Individual Employee
                        </label>
                      </div>
                    </div>

                    {notificationForm.recipients === 'department' && (
                      <div className="formGroup">
                        <label htmlFor="department">Select Department</label>
                        <select
                          id="department"
                          value={notificationForm.selectedDepartment}
                          onChange={e =>
                            setNotificationForm({
                              ...notificationForm,
                              selectedDepartment: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {notificationForm.recipients === 'individual' && (
                      <div className="formGroup">
                        <label htmlFor="employee">Select Employee</label>
                        <select
                          id="employee"
                          value={notificationForm.selectedEmployee}
                          onChange={e =>
                            setNotificationForm({
                              ...notificationForm,
                              selectedEmployee: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select Employee</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} - {emp.position}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="formGroup">
                      <label htmlFor="priority">Priority</label>
                      <select
                        id="priority"
                        value={notificationForm.priority}
                        onChange={e =>
                          setNotificationForm({ ...notificationForm, priority: e.target.value })
                        }
                      >
                        <option value="normal">Normal</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="formActions">
                      <button
                        type="button"
                        className="cancelBtn"
                        onClick={() => setShowNotificationModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="submitBtn">
                        Send Notification
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {showGeofenceModal && (
              <div className="modalOverlay">
                <motion.div
                  className="modal"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="modalHeader">
                    <h3>Configure Geofence</h3>
                    <button className="closeBtn" onClick={() => setShowGeofenceModal(false)}>
                      ×
                    </button>
                  </div>
                  <form className="geofenceForm" onSubmit={handleUpdateGeofence}>
                    <div className="formGroup">
                      <label htmlFor="geofenceName">Geofence Name</label>
                      <input
                        type="text"
                        id="geofenceName"
                        value={geofenceForm.name}
                        onChange={e => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="formRow">
                      <div className="formGroup">
                        <label htmlFor="latitude">Latitude</label>
                        <input
                          type="number"
                          id="latitude"
                          step="0.0001"
                          value={geofenceForm.latitude}
                          onChange={e =>
                            setGeofenceForm({ ...geofenceForm, latitude: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="formGroup">
                        <label htmlFor="longitude">Longitude</label>
                        <input
                          type="number"
                          id="longitude"
                          step="0.0001"
                          value={geofenceForm.longitude}
                          onChange={e =>
                            setGeofenceForm({ ...geofenceForm, longitude: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="formGroup">
                      <label htmlFor="radius">Radius (meters)</label>
                      <input
                        type="number"
                        id="radius"
                        min="50"
                        max="500000"
                        value={geofenceForm.radius}
                        onChange={e =>
                          setGeofenceForm({ ...geofenceForm, radius: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="formActions">
                      <button
                        type="button"
                        className="cancelBtn"
                        onClick={() => setShowGeofenceModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="submitBtn">
                        Update Geofence
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {selectedEmployee && (
              <div className="modalOverlay">
                <motion.div
                  className="modal employeeModal"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="modalHeader">
                    <h3>Employee Details</h3>
                    <button className="closeBtn" onClick={() => setSelectedEmployee(null)}>
                      ×
                    </button>
                  </div>
                  <div className="employeeDetailContent">
                    <div className="employeeProfileHeader">
                      <div className="employeeAvatarLarge">
                        <img
                          src={selectedEmployee.avatar}
                          alt={`${selectedEmployee.name}'s avatar`}
                          onError={e => {
                            e.target.src = '/assets/avatar.png';
                            console.warn(`Failed to load image for ${selectedEmployee.name}`);
                          }}
                        />
                        <span
                          className={`statusIndicator ${selectedEmployee.status.toLowerCase()}`}
                        ></span>
                      </div>
                      <div className="employeeProfileInfo">
                        <h2>{selectedEmployee.name}</h2>
                        <p className="employeePosition">{selectedEmployee.position}</p>
                        <p className="employeeDepartment">{selectedEmployee.department}</p>
                      </div>
                    </div>

                    <div className="employeeDetailSection">
                      <h4>Contact Information</h4>
                      <div className="detailRow">
                        <span className="detailLabel">Email:</span>
                        <span className="detailValue">{selectedEmployee.email}</span>
                      </div>
                      <div className="detailRow">
                        <span className="detailLabel">Phone:</span>
                        <span className="detailValue">{selectedEmployee.phone}</span>
                      </div>
                    </div>

                    <div className="employeeDetailSection">
                      <h4>Attendance Information</h4>
                      <div className="detailRow">
                        <span className="detailLabel">Status:</span>
                        <span
                          className={`detailValue status ${selectedEmployee.status.toLowerCase()}`}
                        >
                          {selectedEmployee.status}
                        </span>
                      </div>
                      <div className="detailRow">
                        <span className="detailLabel">Check-in Time:</span>
                        <span className="detailValue">{selectedEmployee.checkInTime}</span>
                      </div>
                      <div className="detailRow">
                        <span className="detailLabel">Check-out Time:</span>
                        <span className="detailValue">{selectedEmployee.checkOutTime}</span>
                      </div>
                      <div className="detailRow">
                        <span className="detailLabel">Hours This Week:</span>
                        <span className="detailValue">
                          {selectedEmployee.totalHoursThisWeek} hrs
                        </span>
                      </div>
                      <div className="detailRow">
                        <span className="detailLabel">Attendance Rate:</span>
                        <span className="detailValue">
                          {selectedEmployee.attendanceRate}%
                        </span>
                      </div>
                    </div>

                    <div className="employeeModalActions">
                      <button
                        className="actionBtn messageBtn"
                        onClick={() => alert('Messaging feature not implemented')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Message
                      </button>
                      <button
                        className="actionBtn editBtn"
                        onClick={() => alert('Edit profile feature not implemented')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit Profile
                      </button>
                      <button
                        className="actionBtn viewHistoryBtn"
                        onClick={() => alert('View history feature not implemented')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        View History
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboard;
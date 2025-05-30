import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet'; // Import Leaflet for custom icons
import { gsap } from 'gsap';
import { jwtDecode } from 'jwt-decode';// Required for react-leaflet

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

      if (response.status !== 200) {
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

      if (response.status !== 200) {
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
          /* CSS Variables for theming */
:root {
  --primary-color: #1976d2;
  --secondary-color: #388e3c;
  --danger-color: #d32f2f;
  --background-color: #f4f7fa;
  --surface-color: #ffffff;
  --text-primary: #333333;
  --text-secondary: #777777;
  --border-color: #dddddd;
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --border-radius: 8px;
  --transition: all 0.3s ease;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background-color: var(--background-color);
  color: var(--text-primary);
  line-height: 1.5;
  font-size: 16px;
}

/* Dashboard Container */
.dashboardContainer {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 1.5rem;
  gap: 1.5rem;
}

/* Loading and Error States */
.loading {
  text-align: center;
  font-size: 1.25rem;
  color: var(--text-secondary);
  padding: 2rem;
}

.error {
  background-color: #ffe6e6;
  color: var(--danger-color);
  padding: 0.75rem 1rem;
  border零部件
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Top Bar */
.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--surface-color);
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

/* Date and Clock */
.dateContainer, .clockContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.date, .clock {
  font-weight: 500;
  color: var(--text-primary);
}

/* Notification Bell */
.notificationBell {
  position: relative;
  cursor: pointer;
  transition: var(--transition);
}

.notificationBell:hover {
  transform: scale(1.1);
}

.notificationCount {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background-color: var(--danger-color);
  color: var(--surface-color);
  border-radius: 50%;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.notificationBell svg {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--text-secondary);
}

/* User Info */
.userInfo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.userInfo .avatar img {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
}

/* Main Content */
.mainContent {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  flex: 1;
}

/* Sidebar */
.sidebar {
  width: 16rem;
  background-color: var(--surface-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* User Profile */
.userProfile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatarLarge img {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  object-fit: cover;
}

.userProfileInfo h3 {
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
}

.userProfileInfo p {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.lastLogin {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.lastLoginLabel {
  font-weight: 500;
}

/* Sidebar Navigation */
.sidebarNav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebarNav a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  border-radius: 0.5rem;
  transition: var(--transition);
}

.sidebarNav a:hover {
  background-color: #f0f0f0;
}

.sidebarNav a.active {
  background-color: var(--primary-color);
  color: var(--surface-color);
}

.sidebarNav a svg {
  width: 1.25rem;
  height: 1.25rem;
}

.logoutBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--danger-color);
  color: var(--surface-color);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: var(--transition);
}

.logoutBtn:hover {
  background-color: #b71c1c;
}

.logoutBtn svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* Dashboard Content */
.dashboardContent {
  flex: 1;
  background-color: var(--surface-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

/* Dashboard Header */
.dashboardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.welcomeMessage {
  font-size: 1.5rem;
  font-weight: 600;
}

/* Quick Actions */
.quickActions {
  display: flex;
  gap: 0.75rem;
}

.actionBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition);
}

.addEmployeeBtn {
  background-color: var(--primary-color);
  color: var(--surface-color);
}

.addEmployeeBtn:hover {
  background-color: #1565c0;
}

.notificationBtn {
  background-color: var(--secondary-color);
  color: var(--surface-color);
}

.notificationBtn:hover {
  background-color: #2e7d32;
}

.geofenceBtn {
  background-color: #0288d1;
  color: var(--surface-color);
}

.geofenceBtn:hover {
  background-color: #0277bd;
}

.actionBtn svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* Stats Container */
.statsContainer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.statCard {
  background-color: var(--surface-color);
  padding: 1.25rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: var(--transition);
}

.statCard:hover {
  transform: translateY(-0.25rem);
}

.statIcon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.employeesIcon {
  background-color: #e3f2fd;
}

.presentIcon {
  background-color: #e8f5e9;
}

.leaveIcon {
  background-color: #ffebee;
}

.hoursIcon {
  background-color: #e0f7fa;
}

.statIcon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.statInfo h3 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.statValue {
  font-size: 1.5rem;
  font-weight: 600;
}

/* Widgets Container */
.widgetsContainer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.5rem;
}

/* Widget */
.widget {
  background-color: var(--surface-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.widgetHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.widgetHeader h3 {
  font-size: 1.125rem;
  font-weight: 500;
}

.viewAll, .configureBtn {
  color: var(--primary-color);
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition);
}

.viewAll:hover, .configureBtn:hover {
  text-decoration: underline;
}

/* Employees List */
.employeesList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.employeeCard {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: var(--transition);
}

.employeeCard:hover {
  background-color: #f9f9f9;
}

.employeeAvatar {
  position: relative;
}

.employeeAvatar img {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.statusIndicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  border: 2px solid var(--surface-color);
}

.statusIndicator.active {
  background-color: var(--secondary-color);
}

.statusIndicator.inactive {
  background-color: var(--danger-color);
}

.employeeInfo h4 {
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.employeeInfo p {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.checkInInfo {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.checkInLabel {
  font-weight: 500;
}

/* Tasks List */
.tasksList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.taskCard {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}

.taskHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.taskHeader h4 {
  font-size: 1rem;
}

.taskPriority {
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--surface-color);
}

.taskPriority.low {
  background-color: var(--secondary-color);
}

.taskPriority.medium {
  background-color: #ff9800;
}

.taskPriority.high {
  background-color: var(--danger-color);
}

.taskDetails {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.taskLabel {
  font-weight: 500;
  margin-right: 0.25rem;
}

.taskStatus {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  display: inline-block;
}

.taskStatus.todo {
  background-color: #e0e0e0;
  color: var(--text-primary);
}

.taskStatus.inprogress {
  background-color: #bbdefb;
  color: var(--primary-color);
}

.taskStatus.completed {
  background-color: #e8f5e9;
  color: var(--secondary-color);
}

/* Activity List */
.activityList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activityItem {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.activityInfo {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activityText {
  font-size: 0.875rem;
}

.activityUser {
  font-weight: 500;
}

.activityTime {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Map Container */
.mapContainer {
  height: 18rem;
  border-radius: var(--border-radius);
  overflow: hidden;
}

/* Employee Popup */
.employeePopup {
  font-size: 0.875rem;
}

/* Modal Styles */
.modalOverlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: var(--surface-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 32rem;
  max-height: 80vh;
  overflow-y: auto;
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modalHeader h3 {
  font-size: 1.25rem;
  font-weight: 500;
}

.closeBtn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: var(--transition);
}

.closeBtn:hover {
  color: var(--text-primary);
}

/* Forms */
.notificationForm, .geofenceForm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.formGroup label {
  font-size: 0.875rem;
  font-weight: 500;
}

.formGroup input,
.formGroup textarea,
.formGroup select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: var(--transition);
}

.formGroup input:focus,
.formGroup textarea:focus,
.formGroup select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.formGroup textarea {
  resize: vertical;
  min-height: 6rem;
}

.radioGroup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radioGroup label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.formRow {
  display: flex;
  gap: 1rem;
}

.formRow .formGroup {
  flex: 1;
}

.formActions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.cancelBtn {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: var(--transition);
}

.cancelBtn:hover {
  background-color: #e0e0e0;
}

.submitBtn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--primary-color);
  color: var(--surface-color);
  cursor: pointer;
  transition: var(--transition);
}

.submitBtn:hover {
  background-color: #1565c0;
}

/* Employee Modal */
.employeeModal {
  max-width: 40rem;
}

.employeeProfileHeader {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.employeeAvatarLarge img {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  object-fit: cover;
}

.employeeProfileInfo h2 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.employeePosition, .employeeDepartment {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.employeeDetailSection {
  margin-bottom: 1.5rem;
}

.employeeDetailSection h4 {
  font-size: 1.125rem;
  margin-bottom: 0.75rem;
}

.detailRow {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.detailLabel {
  font-weight: 500;
}

.detailValue.status.active {
  color: var(--secondary-color);
  font-weight: 500;
}

.detailValue.status.inactive {
  color: var(--danger-color);
  font-weight: 500;
}

.employeeModalActions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.employeeModalActions .actionBtn {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.messageBtn {
  background-color: var(--secondary-color);
  color: var(--surface-color);
}

.editBtn {
  background-color: var(--primary-color);
  color: var(--surface-color);
}

.viewHistoryBtn {
  background-color: #0288d1;
  color: var(--surface-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .mainContent {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .statsContainer {
    grid-template-columns: 1fr;
  }

  .widgetsContainer {
    grid-template-columns: 1fr;
  }

  .dashboardHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .quickActions {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .topBar {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .formRow {
    flex-direction: column;
  }

  .modal {
    width: 95%;
  }
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
                        <motion.div key={task.id} className="taskCard" variants bundledItems={itemVariants}>
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
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
                          <path d="M12 2v6h6" />
                          <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
                          <polyline points="12 10 12 14 14 16" />
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

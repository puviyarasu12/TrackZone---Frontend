import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import LoginSelector from './pages/Login/LoginSelector';
import AdminLogin from './pages/Login/AdminLogin';
import EmployeeLogin from './pages/Login/EmployeeLogin';
import EmployeeDashboard from './pages/Dashboard/Employee/EmployeeDashboard';
import AdminDashboard from './pages/Dashboard/Admin/AdminDashboard';
import AddEmployee from './pages/Dashboard/Admin/AddEmployee';
import AttendanceLog from './pages/Dashboard/Employee/AttendanceLog';
import EmployeeTasks from './pages/Dashboard/Employee/EmployeeTasks';
import ProtectedRoute from './pages/ProtectedRoute/ProtectedRoute';
import ManageTask from './pages/Dashboard/Admin/ManageTask';

function App() {
  // Clear invalid or missing auth data on app start
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !role) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('employee');
    }
  }, []);

  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return !!token && !!role;
  });
  const [userRole, setUserRole] = React.useState(() => {
    return localStorage.getItem('role') || '';
  });
  const [token, setToken] = React.useState(() => {
    return localStorage.getItem('token') || '';
  });
  const [employee, setEmployee] = React.useState(() => {
    const emp = localStorage.getItem('employee');
    if (!emp || emp === 'undefined' || emp === 'null') return null;
    try {
      return JSON.parse(emp);
    } catch (e) {
      console.error('Failed to parse employee from localStorage', e);
      return null;
    }
  });

  const handleLogin = (role, authToken, employeeData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('role', role);
    if (employeeData && typeof employeeData === 'object') {
      localStorage.setItem('employee', JSON.stringify(employeeData));
    } else {
      localStorage.removeItem('employee');
    }
    setIsAuthenticated(true);
    setUserRole(role);
    setToken(authToken);
    setEmployee(employeeData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('employee');
    setIsAuthenticated(false);
    setUserRole('');
    setToken('');
    setEmployee(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login-selector" element={<LoginSelector />} />
        <Route
          path="/admin-login"
          element={
            isAuthenticated ? (
              <Navigate to="/admin-dashboard" replace />
            ) : (
              <AdminLogin onLoginSuccess={handleLogin} />
            )
          }
        />
        <Route
          path="/employee-login"
          element={
            isAuthenticated ? (
              <Navigate to="/employee-dashboard" replace />
            ) : (
              <EmployeeLogin onLoginSuccess={handleLogin} />
            )
          }
        />
        <Route
          path="/employee-dashboard/*"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated && userRole === 'employee'}>
              <EmployeeDashboard onLogout={handleLogout} token={token} employee={employee} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated && userRole === 'admin'}>
              <AdminDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/add-employee"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated && userRole === 'admin'}>
              <AddEmployee />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/tasks"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated && userRole === 'admin'}>
              <ManageTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-dashboard/attendance"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated && userRole === 'employee'}>
              <AttendanceLog token={token} employee={employee} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-dashboard/tasks"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated && userRole === 'employee'}>
              <EmployeeTasks token={token} employee={employee} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);

  const login = (token, id) => {
    setAuthToken(token);
    setEmployeeId(id);
    localStorage.setItem('authToken', token);
    localStorage.setItem('employeeId', id);
  };

  const logout = () => {
    setAuthToken(null);
    setEmployeeId(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('employeeId');
  };

  // Initialize from localStorage if available
  React.useEffect(() => {
    const token = localStorage.getItem('authToken');
    const id = localStorage.getItem('employeeId');
    if (token && id) {
      setAuthToken(token);
      setEmployeeId(id);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ authToken, employeeId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

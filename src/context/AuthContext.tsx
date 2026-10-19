import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';
import { api } from '../utils/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('emp_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      if (!localStorage.getItem('emp_token')) {
        setLoading(false);
        return;
      }
      const data = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.warn('[AuthContext] Session expired or invalid.');
      localStorage.removeItem('emp_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('emp_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (regData: any) => {
    const data = await api.post('/auth/register', regData);
    localStorage.setItem('emp_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('emp_token');
    setToken(null);
    setUser(null);
  };

  // Quick switcher for seamless testing across roles
  const quickSwitchRole = async (targetRole: UserRole) => {
    setLoading(true);
    try {
      if (targetRole === 'super_admin') {
        await login('superadmin@emp.com', 'Admin@123');
      } else if (targetRole === 'company_admin') {
        await login('hr@apexglobal.com', 'Emp@123');
      } else {
        await login('rahul.sharma@apexglobal.com', 'Emp@123');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, quickSwitchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

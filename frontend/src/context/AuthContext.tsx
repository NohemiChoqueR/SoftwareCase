import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { User, AuthTokens } from '../types';

interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get<User>('/usuarios/perfil/');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    void initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthTokens>('/usuarios/auth/login/', { email, password });
    const { access, refresh } = res.data;
    localStorage.setItem('token', access);
    localStorage.setItem('refreshToken', refresh);
    setToken(access);

    const userRes = await api.get<User>('/usuarios/perfil/');
    setUser(userRes.data);
    localStorage.setItem('user', JSON.stringify(userRes.data));
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<{
      user: User;
      tokens: AuthTokens;
      detail: string;
    }>('/usuarios/auth/register/', data);

    const { access, refresh } = res.data.tokens;
    localStorage.setItem('token', access);
    localStorage.setItem('refreshToken', refresh);
    setToken(access);
    setUser(res.data.user);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

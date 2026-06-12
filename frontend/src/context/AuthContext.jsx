import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const handleResponse = async (res) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw data;
    }
    return data;
  } else {
    const text = await res.text();
    let errorMsg = '';
    const preMatch = text.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (preMatch && preMatch[1]) {
      errorMsg = preMatch[1].trim();
    } else {
      errorMsg = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    }
    throw new Error(errorMsg || `Server error ${res.status}`);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('phx_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For Gmail verification modal states
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await handleResponse(res);
      setUser(data.user);
    } catch (err) {
      console.error('Fetch user error:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });
      const data = await handleResponse(res);
      localStorage.setItem('phx_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setUnverifiedEmail(null);
      return data.user;
    } catch (err) {
      if (err && err.error) {
        if (err.is_verified === false) {
          setUnverifiedEmail(err.email);
        }
        setError(err.error);
        throw new Error(err.error);
      }
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (username, email, password, role) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role })
      });
      const data = await handleResponse(res);
      setUnverifiedEmail(data.email);
      return data;
    } catch (err) {
      if (err && err.error) {
        setError(err.error);
        throw new Error(err.error);
      }
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const verifyCode = async (email, code) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await handleResponse(res);
      localStorage.setItem('phx_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setUnverifiedEmail(null);
      return data.user;
    } catch (err) {
      if (err && err.error) {
        setError(err.error);
        throw new Error(err.error);
      }
      setError(err.message || 'Verification failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('phx_token');
    setToken(null);
    setUser(null);
    setError(null);
    setUnverifiedEmail(null);
  };

  const updatePlan = (updatedUser) => {
    setUser(updatedUser);
  };

  const updateProfile = async (username, profile_pic) => {
    try {
      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, profile_pic })
      });
      const data = await handleResponse(res);
      setUser(data.user);
      return data.user;
    } catch (err) {
      if (err && err.error) {
        throw new Error(err.error);
      }
      throw err;
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await handleResponse(res);
      return data;
    } catch (err) {
      if (err && err.error) {
        throw new Error(err.error);
      }
      throw err;
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    verifyCode,
    logout,
    updatePlan,
    updateProfile,
    changePassword,
    unverifiedEmail,
    setUnverifiedEmail,
    refreshUser: fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

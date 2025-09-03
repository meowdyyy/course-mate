// import { createContext, useContext, useState, useEffect } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';

// //Set axios defaults
// axios.defaults.baseURL = 'http://localhost:5000';

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//       fetchUser();
//     } else {
//       setLoading(false);
//     }
//   }, []);

//   const fetchUser = async () => {
//     try {
//       const response = await axios.get('/api/auth/me');
//       setUser(response.data.user);
//     } catch (error) {
//       console.error('Error fetching user:', error);
//       localStorage.removeItem('token');
//       delete axios.defaults.headers.common['Authorization'];
//     } finally {
//       setLoading(false);
//     }
//   };

//   const login = async (email, password) => {
//     try {
//       const response = await axios.post('/api/auth/login', { email, password });
//       const { token, user } = response.data;
      
//       localStorage.setItem('token', token);
//       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//       setUser(user);
      
//       toast.success('Login successful!');
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Login failed';
//       toast.error(message);
//       return { success: false, message };
//     }
//   };

//   const register = async (userData) => {
//     try {
//       const response = await axios.post('/api/auth/register', userData);
//       const { token, user, needsDocuments } = response.data;
      
//       localStorage.setItem('token', token);
//       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//       setUser(user);
      
//       toast.success('Registration successful!');
//       return { success: true, needsDocuments };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Registration failed';
//       toast.error(message);
//       return { success: false, message };
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem('token');
//     delete axios.defaults.headers.common['Authorization'];
//     setUser(null);
//     toast.success('Logged out successfully');
//     //Redirect to home page after logout
//     window.location.href = '/';
//   };

//   const refreshUser = async () => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       try {
//         const response = await axios.get('http://localhost:5000/api/auth/me');
//         setUser(response.data);
//       } catch (error) {
//         console.error('Error refreshing user data:', error);
//       }
//     }
//   };

//   const token = localStorage.getItem('token');
//   const value = { user, login, register, logout, refreshUser, loading, token };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Base URL configured globally in index.js

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token, user, needsDocuments } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success('Registration successful!');
      return { success: true, needsDocuments };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
    //Redirect to home page after logout
    window.location.href = '/';
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
  const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const token = localStorage.getItem('token');
  const value = { user, login, register, logout, refreshUser, loading, token };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

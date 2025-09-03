// import { createContext, useContext, useEffect, useRef, useState } from 'react';
// import axios from 'axios';
// import { io } from 'socket.io-client';
// import { useAuth } from './AuthContext';

// const NotificationContext = createContext();

// export const useNotifications = () => {
//   const ctx = useContext(NotificationContext);
//   if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
//   return ctx;
// };

// export const NotificationProvider = ({ children }) => {
//   const { user } = useAuth();
//   const [notifications, setNotifications] = useState([]);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const socketRef = useRef(null);

//   useEffect(() => {
//     if (!user) {
//       //Cleanup when user logs out
//       setNotifications([]);
//       setUnreadCount(0);
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//         socketRef.current = null;
//       }
//       return;
//     }
//     setLoading(true);
//     fetchNotifications();
//     //Init socket only once per user session
//     if (!socketRef.current) {
//       const token = localStorage.getItem('token');
//       if (token) {
//         socketRef.current = io('http://localhost:5000', { auth: { token: `Bearer ${token}` } });
//         socketRef.current.on('notification:new', notif => {
//           setNotifications(prev => [notif, ...prev].slice(0, 100));
//           setUnreadCount(c => c + 1);
//         });
//       }
//     }

//     // Listen for timer notifications
//     const handleTimerNotification = (event) => {
//       const timerNotif = event.detail;
//       setNotifications(prev => [timerNotif, ...prev].slice(0, 100));
//       setUnreadCount(c => c + 1);
//     };

//     window.addEventListener('addTimerNotification', handleTimerNotification);

//     return () => {
//       //not disconnecting on rerenders, only when user logs out handled above
//       window.removeEventListener('addTimerNotification', handleTimerNotification);
//     };
//   }, [user]);

//   const fetchNotifications = async () => {
//     try {
//       const res = await axios.get('/api/notifications');
//       setNotifications(res.data.notifications || []);
//       setUnreadCount(res.data.unreadCount || 0);
//     } catch (e) {
//       console.error('Fetch notifications failed:', e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const markAsRead = async (id) => {
//     try {
//       await axios.put(`/api/notifications/${id}/read`);
//       setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
//       setUnreadCount(c => Math.max(0, c - 1));
//     } catch (e) {
//       console.error('Mark as read failed:', e.message);
//     }
//   };

//   const markAllAsRead = async () => {
//     try {
//       await axios.put('/api/notifications/mark-all-read');
//       setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
//       setUnreadCount(0);
//     } catch (e) {
//       console.error('Mark all read failed:', e.message);
//     }
//   };

//   const value = { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead };
//   return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
// };
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      //Cleanup when user logs out
      setNotifications([]);
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    setLoading(true);
    fetchNotifications();
    //Init socket only once per user session
    if (!socketRef.current) {
      const token = localStorage.getItem('token');
      if (token) {
        const SOCKET_BASE = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || axios.defaults.baseURL || 'http://localhost:5000';
        socketRef.current = io(SOCKET_BASE, { auth: { token: `Bearer ${token}` } });
        socketRef.current.on('notification:new', notif => {
          setNotifications(prev => [notif, ...prev].slice(0, 100));
          setUnreadCount(c => c + 1);
        });
      }
    }

    // Listen for timer notifications
    const handleTimerNotification = (event) => {
      const timerNotif = event.detail;
      setNotifications(prev => [timerNotif, ...prev].slice(0, 100));
      setUnreadCount(c => c + 1);
    };

    window.addEventListener('addTimerNotification', handleTimerNotification);

    return () => {
      //Do not disconnect on rerenders; only when user logs out handled above
      window.removeEventListener('addTimerNotification', handleTimerNotification);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {
      console.error('Fetch notifications failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (e) {
      console.error('Mark as read failed:', e.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Mark all read failed:', e.message);
    }
  };

  const value = { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

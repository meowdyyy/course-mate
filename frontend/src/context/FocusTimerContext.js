import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { hideStickyGif } from '../utils/gamification';

const FocusTimerContext = createContext();

export const useFocusTimer = () => {
  const context = useContext(FocusTimerContext);
  if (!context) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  }
  return context;
};

export const FocusTimerProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1500); // 25 minutes default
  const [initialTime, setInitialTime] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // 'work', 'shortBreak', 'longBreak'
  const [session, setSession] = useState(1);
  const [showNotificationStrip, setShowNotificationStrip] = useState(false);
  const [isOnFocusPage, setIsOnFocusPage] = useState(false);
  
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Load state from sessionStorage on mount; only if started in this tab
  useEffect(() => {
    // Ensure any sticky pause GIF is not lingering
    try { hideStickyGif(); } catch {}
    const started = sessionStorage.getItem('focusTimerStarted') === '1';
    const savedState = sessionStorage.getItem('focusTimerState');
    if (started && savedState) {
      try {
        const state = JSON.parse(savedState);
        const now = Date.now();
        const elapsed = Math.floor((now - state.lastUpdate) / 1000);
        
        if (state.isRunning && elapsed < state.timeLeft) {
          setIsActive(true);
          setTimeLeft(Math.max(0, state.timeLeft - elapsed));
          setInitialTime(state.initialTime);
          setIsRunning(true);
          setMode(state.mode);
          setSession(state.session);
        } else if (state.isActive && !state.isRunning) {
          // Timer was paused
          setIsActive(true);
          setTimeLeft(state.timeLeft);
          setInitialTime(state.initialTime);
          setIsRunning(false);
          setMode(state.mode);
          setSession(state.session);
        }
      } catch (error) {
        console.error('Error loading timer state:', error);
      }
    }
  }, []);

  // Save state to sessionStorage whenever it changes (only during an active session)
  useEffect(() => {
    if (isActive) {
      const state = {
        isActive,
        timeLeft,
        initialTime,
        isRunning,
        mode,
        session,
        lastUpdate: Date.now()
      };
      sessionStorage.setItem('focusTimerState', JSON.stringify(state));
    } else {
      sessionStorage.removeItem('focusTimerState');
      sessionStorage.removeItem('focusTimerStarted');
    }
  }, [isActive, timeLeft, initialTime, isRunning, mode, session]);

  // Show notification strip when timer is active but not on focus page
  useEffect(() => {
    if (isActive && !isOnFocusPage) {
      setShowNotificationStrip(true);
    } else {
      setShowNotificationStrip(false);
    }
  }, [isActive, isOnFocusPage]);

  // Timer countdown logic
  useEffect(() => {
    const handleTimerComplete = () => {
      setIsRunning(false);
  setShowNotificationStrip(false); // Hide toast when timer completes
  // Ensure any sticky pause GIF is hidden
  try { hideStickyGif(); } catch {}
      
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      // Send browser notification
      if (Notification.permission === 'granted') {
        const message = mode === 'work' 
          ? 'Work session complete! Time for a break.' 
          : 'Break time over! Ready to focus?';
        
        new Notification('Focus Timer', {
          body: message,
          icon: '/favicon.ico'
        });
      }

      // Auto-advance to next session
      if (mode === 'work') {
        if (session % 4 === 0) {
          // Long break after 4 work sessions
          const duration = 900; // 15 minutes
          setIsActive(true);
          setTimeLeft(duration);
          setInitialTime(duration);
          setIsRunning(true);
          setMode('longBreak');
        } else {
          // Short break
          const duration = 300; // 5 minutes
          setIsActive(true);
          setTimeLeft(duration);
          setInitialTime(duration);
          setIsRunning(true);
          setMode('shortBreak');
        }
      } else {
        // Back to work
        setSession(prev => prev + 1);
        const duration = 1500; // 25 minutes
        setIsActive(true);
        setTimeLeft(duration);
        setInitialTime(duration);
        setIsRunning(true);
        setMode('work');
      }
    };

    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer finished
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, mode, session]);

  const startTimer = (duration, timerMode = 'work') => {
    setIsActive(true);
    setTimeLeft(duration);
    setInitialTime(duration);
    setIsRunning(true);
    setMode(timerMode);
  // Mark started for this tab session
  sessionStorage.setItem('focusTimerStarted', '1');
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const startWork = (duration = 1500) => {
    startTimer(duration, 'work');
  };

  const startBreak = (breakType = 'shortBreak') => {
    const duration = breakType === 'longBreak' ? 900 : 300; // 15 min or 5 min
    startTimer(duration, breakType);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setIsRunning(true);
  };

  const stopTimer = () => {
    setIsActive(false);
    setIsRunning(false);
    setTimeLeft(1500);
    setInitialTime(1500);
    setMode('work');
    setSession(1);
    setShowNotificationStrip(false);
  sessionStorage.removeItem('focusTimerState');
  sessionStorage.removeItem('focusTimerStarted');
  };

  const resetTimer = () => {
    setTimeLeft(initialTime);
    setIsRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (initialTime === 0) return 0;
    return ((initialTime - timeLeft) / initialTime) * 100;
  };

  const value = {
    isActive,
    timeLeft,
    initialTime,
    isRunning,
    mode,
    session,
    showNotificationStrip,
    isOnFocusPage,
    setIsOnFocusPage,
    setShowNotificationStrip,
    startTimer,
    startWork,
    startBreak,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    formatTime,
    getProgress,
    audioRef
  };

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
     
      <audio
        ref={audioRef}
        preload="auto"
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX2/LGdSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX2/LGdSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX2/LGdSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX2/LGdSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX2/LGdSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhdQE="
      />
    </FocusTimerContext.Provider>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusTimer } from '../../context/FocusTimerContext';
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const TimerNotificationStrip = () => {
  const navigate = useNavigate();
  const {
    showNotificationStrip,
    timeLeft,
    isRunning,
    mode,
    pauseTimer,
    resumeTimer,
    formatTime,
    setShowNotificationStrip
  } = useFocusTimer();

  const [isVisible, setIsVisible] = useState(true);

  if (!showNotificationStrip || !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    setShowNotificationStrip(false);
    // Add to notifications when closed
    const timerNotification = {
      _id: 'focus-timer-' + Date.now(),
      type: 'timer',
      title: 'Focus Timer Active',
      message: `${formatTime(timeLeft)} remaining in ${mode === 'work' ? 'focus' : 'break'} session`,
      isRead: false,
      createdAt: new Date().toISOString(),
      targetUrl: '/focus'
    };
    
    // Dispatch custom event to add timer notification
    window.dispatchEvent(new CustomEvent('addTimerNotification', { 
      detail: timerNotification 
    }));
  };

  const handleViewTimer = () => {
    navigate('/focus');
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work':
        return { backgroundColor: '#0A4D46', borderColor: '#2DE3D0' }; 
      case 'shortBreak':
        return { backgroundColor: '#440D7A', borderColor: '#9A49EB' }; 
      case 'longBreak':
        return { backgroundColor: '#520105', borderColor: '#520105' }; 
      default:
        return { backgroundColor: '#4b5563', borderColor: '#6b7280' }; 
    }
  };

  const getModeText = () => {
    switch (mode) {
      case 'work':
        return 'Focus Session';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      default:
        return 'Timer Active';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 transform transition-all duration-300 ease-in-out">
      <div 
        className="text-white rounded-lg shadow-xl border-2 max-w-sm"
        style={getModeColor()}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">{getModeText()}</h4>
                <p className="text-xs text-white/80">Timer running</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
              title="Close notification"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-2xl font-mono font-bold mb-1">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-white/80">
              {mode === 'work' ? 'Stay focused' : 'Enjoy your break'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Play/Pause Button */}
            <button
              onClick={isRunning ? pauseTimer : resumeTimer}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title={isRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isRunning ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </button>

            {/* View Timer Button */}
            <button
              onClick={handleViewTimer}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md transition-colors text-sm font-medium"
              title="View full timer"
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View Timer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerNotificationStrip;

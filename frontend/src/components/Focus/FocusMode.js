import { useState, useEffect } from 'react';
import { useFocusTimer } from '../../context/FocusTimerContext';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import './FocusMode.css';
import { showGifToast, showStickyGifTopRight, hideStickyGif } from '../../utils/gamification';

const FocusMode = () => {
  const {
    isActive,
    timeLeft,
    initialTime,
    isRunning,
    mode,
    session,
    setIsOnFocusPage,
    startWork,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    formatTime,
    getProgress
  } = useFocusTimer();

  const [selectedTime, setSelectedTime] = useState('25');
  const [customMinutes, setCustomMinutes] = useState(25);
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    setIsOnFocusPage(true);
    return () => setIsOnFocusPage(false);
  }, [setIsOnFocusPage]);

  const presetTimes = [
    { label: '15 minutes', value: '15', seconds: 900 },
    { label: '20 minutes', value: '20', seconds: 1200 },
    { label: '25 minutes', value: '25', seconds: 1500 },
    { label: '30 minutes', value: '30', seconds: 1800 },
    { label: '45 minutes', value: '45', seconds: 2700 },
    { label: '60 minutes', value: '60', seconds: 3600 },
    { label: 'Custom', value: 'custom', seconds: 0 }
  ];

  const handleStartTimer = () => {
    let duration;
    if (selectedTime === 'custom') {
      duration = customMinutes * 60;
    } else {
      const preset = presetTimes.find(p => p.value === selectedTime);
      duration = preset.seconds;
    }
    startWork(duration);
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'work':
        return 'Focus Time';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      default:
        return 'Focus Timer';
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work':
        return 'focus-mode-work';
      case 'shortBreak':
        return 'focus-mode-short-break';
      case 'longBreak':
        return 'focus-mode-long-break';
      default:
        return 'focus-mode-default';
    }
  };

  const getProgressColor = () => {
    switch (mode) {
      case 'work':
        return 'focus-progress-work';
      case 'shortBreak':
        return 'focus-progress-short-break';
      case 'longBreak':
        return 'focus-progress-long-break';
      default:
        return 'focus-progress-default';
    }
  };

  // Clock hand calculations
  const getClockHandRotation = () => {
    if (initialTime === 0) return 0;
    const progress = ((initialTime - timeLeft) / initialTime) * 360;
    return progress;
  };

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (getProgress() / 100) * circumference;

  return (
    <div className="focus-container">
      {/* Page Header */}
      <div className="focus-header">
        <div className="focus-header-content">
          <div className="focus-title-section">
            <h1>Focus Mode</h1>
            <p>Stay focused with the Pomodoro technique</p>
          </div>
          {isActive && (
            <div className="focus-session-info">
              <p>Session</p>
              <p>{session}</p>
            </div>
          )}
        </div>
      </div>

      <div className="focus-main-grid">
        {/* Left Column - Clock */}
        <div className="focus-clock-column">
          <div className="focus-mode-title-section">
            <h2 className={`focus-mode-title ${getModeColor()}`}>
              {getModeTitle()}
            </h2>
            {isActive && (
              <p className="focus-mode-description">
                {mode === 'work' ? 'Stay focused and avoid distractions' : 'Take a break and relax'}
              </p>
            )}
          </div>

          {/* Analog Clock */}
          <div className="focus-clock-container">
            <svg className="focus-clock-svg" viewBox="0 0 240 240">
              {/* Clock face */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="white"
                className="focus-clock-face"
              />
              
              {/* Hour markers */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30) - 90;
                const x1 = 120 + (radius - 10) * Math.cos(angle * Math.PI / 180);
                const y1 = 120 + (radius - 10) * Math.sin(angle * Math.PI / 180);
                const x2 = 120 + (radius - 20) * Math.cos(angle * Math.PI / 180);
                const y2 = 120 + (radius - 20) * Math.sin(angle * Math.PI / 180);
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="focus-hour-marker"
                  />
                );
              })}

              {/* Progress circle */}
              {isActive && (
                <circle
                  cx="120"
                  cy="120"
                  r={radius - 15}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={`focus-progress-circle ${getProgressColor()}`}
                />
              )}

              {/* Clock hand */}
              {isActive && (
                <line
                  x1="120"
                  y1="120"
                  x2={120 + (radius - 30) * Math.cos((getClockHandRotation() - 90) * Math.PI / 180)}
                  y2={120 + (radius - 30) * Math.sin((getClockHandRotation() - 90) * Math.PI / 180)}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={`focus-clock-hand ${getProgressColor()}`}
                />
              )}

              {/* Center dot */}
              <circle
                cx="120"
                cy="120"
                r="4"
                fill="currentColor"
                className={isActive ? getProgressColor() : "focus-center-dot-inactive"}
              />
            </svg>
            
            {/* Time display in center */}
            <div className="focus-time-display">
              <div className="focus-time-display-inner">
                <div className="focus-time-text">
                  {formatTime(timeLeft)}
                </div>
                <div className="focus-time-status">
                  {isActive ? 'remaining' : 'ready to start'}
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="focus-controls">
            {!isActive ? (
              <button
                onClick={handleStartTimer}
                disabled={selectedTime === 'custom' && (!customMinutes || customMinutes < 1)}
                className="focus-btn-play"
              >
                <PlayIcon className="h-8 w-8 ml-1" />
              </button>
            ) : (
              <>
                {isRunning ? (
                  <button
                    onClick={() => {
                      pauseTimer();
                      // Show failure gif top-right until resumed
                      showStickyGifTopRight('/assets/failure.gif', 'Focus paused — resume to continue');
                    }}
                    className="focus-btn-pause"
                  >
                    <PauseIcon className="h-8 w-8" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      resumeTimer();
                      hideStickyGif();
                    }}
                    className="focus-btn-resume"
                  >
                    <PlayIcon className="h-8 w-8 ml-1" />
                  </button>
                )}
                
                <button
                  onClick={() => {
                    resetTimer();
                    hideStickyGif();
                  }}
                  className="focus-btn-reset"
                >
                  <ArrowPathIcon className="h-6 w-6" />
                </button>
                
                <button
                  onClick={() => {
                    const stoppingEarly = isActive && timeLeft > 0;
                    stopTimer();
                    hideStickyGif();
                    if (stoppingEarly) {
                      // Center failure gif for 6 seconds
                      showGifToast('/assets/failure.gif', 6000, 'Focus ended early');
                    }
                  }}
                  className="focus-btn-stop"
                >
                  <StopIcon className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Settings and Info */}
        <div className="focus-settings-column">
          {/* Timer Settings */}
          <div className="focus-settings-card">
            <h3 className="focus-settings-title">Timer Settings</h3>
            
            {/* Time Dropdown */}
            <div className="focus-dropdown-section">
              <label className="focus-dropdown-label">
                Set Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  setShowCustomInput(e.target.value === 'custom');
                }}
                disabled={isActive}
                className="focus-dropdown-select"
              >
                {presetTimes.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Time Input */}
            {showCustomInput && (
              <div className="focus-custom-input-section">
                <div className="focus-custom-input-container">
                  <label className="focus-custom-input-label">
                    Custom time:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    disabled={isActive}
                    className="focus-custom-input"
                    placeholder="25"
                  />
                  <span className="focus-custom-input-unit">minutes</span>
                </div>
              </div>
            )}

            {!isActive && (
              <button
                onClick={handleStartTimer}
                disabled={selectedTime === 'custom' && (!customMinutes || customMinutes < 1)}
                className="focus-start-btn"
              >
                Start Focus Session
              </button>
            )}
          </div>

          {/* Session Info */}
          {isActive && (
            <div className="focus-progress-card">
              <h3 className="focus-progress-title">Session Progress</h3>
              <div className="focus-progress-grid">
                <div>
                  <div className="focus-progress-stat-value">{session}</div>
                  <div className="focus-progress-stat-label">Session</div>
                </div>
                <div>
                  <div className="focus-progress-stat-value elapsed">
                    {Math.floor((initialTime - timeLeft) / 60)}m
                  </div>
                  <div className="focus-progress-stat-label">Elapsed</div>
                </div>
                <div>
                  <div className="focus-progress-stat-value remaining">
                    {Math.floor(timeLeft / 60)}m
                  </div>
                  <div className="focus-progress-stat-label">Remaining</div>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="focus-tips-card">
            <h3 className="focus-tips-title">Focus Tips</h3>
            <ul className="focus-tips-list">
              <li>• Remove distractions from your workspace</li>
              <li>• Take short breaks between focus sessions</li>
              <li>• Stay hydrated and maintain good posture</li>
              <li>• Use the timer to build consistent habits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;

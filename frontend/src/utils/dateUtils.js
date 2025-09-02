//Utility functions for consistent date handling

export const formatDate = (date, options = {}) => {
  if (!date) return 'No date';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    year: 'numeric', //Always 4-digit year
    month: 'short',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

export const formatDateTime = (date) => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateLong = (date) => {
  return formatDate(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeUntilDate = (targetDate) => {
  if (!targetDate) return 'No date';
  
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else {
    return `${diffDays} days remaining`;
  }
};

export const isValidDate = (date) => {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

export const getMinDateTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return now.toISOString().slice(0, 16);
};

export const formatDateISO = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toISOString().split('T')[0];
};

//Relative time like '5m', '2h', '3d', 'now'
export const formatRelativeTimeShort = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d; // ms
  if (diff < 0) return 'now';
  const sec = Math.floor(diff/1000);
  if (sec < 10) return 'now';
  if (sec < 60) return sec + 's';
  const min = Math.floor(sec/60);
  if (min < 60) return min + 'm';
  const hr = Math.floor(min/60);
  if (hr < 24) return hr + 'h';
  const day = Math.floor(hr/24);
  if (day < 7) return day + 'd';
  const week = Math.floor(day/7);
  if (week < 4) return week + 'w';
  const month = Math.floor(day/30);
  if (month < 12) return month + 'mo';
  const year = Math.floor(day/365);
  return year + 'y';
};

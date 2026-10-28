import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function HoldCountdown({ expiresAt, onExpire, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!expiresAt || timeLeft <= 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brick-50 text-brick border border-brick-200 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        Hold Expired
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 120; // under 2 minutes

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        isUrgent
          ? 'bg-brick-50 text-brick border-brick-200 animate-pulse font-bold'
          : 'bg-brass-50 text-brass-800 border-brass font-bold'
      } ${className}`}
      title={`Hold expires at ${new Date(expiresAt).toLocaleTimeString()}`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        Hold: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </span>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  startedAt: string | null | undefined;
  duration: number;
  onExpiry?: () => void;
}

export function Timer({ startedAt, duration, onExpiry }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpiry?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, duration, onExpiry]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 30;

  return (
    <div className={`flex items-center gap-2 font-mono ${isUrgent ? 'text-red-500 animate-pulse' : 'opacity-80'}`}>
      <Clock className="w-4 h-4" />
      <span className="text-xl font-bold">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

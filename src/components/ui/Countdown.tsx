import React, { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

interface CountdownProps {
    targetDate: Date | string;
    onComplete?: () => void;
    className?: string;
    showSeconds?: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({
    targetDate,
    onComplete,
    className = "",
    showSeconds = true
}) => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        totalSeconds: number;
    } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const target = new Date(targetDate);
            const diff = differenceInSeconds(target, now);

            if (diff <= 0) {
                setTimeLeft(null);
                onComplete?.();
                return;
            }

            const days = Math.floor(diff / (3600 * 24));
            const hours = Math.floor((diff % (3600 * 24)) / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;

            setTimeLeft({ days, hours, minutes, seconds, totalSeconds: diff });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onComplete]);

    if (!timeLeft) return null;

    return (
        <span className={`font-mono tabular-nums ${className}`}>
            {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
            {timeLeft.hours > 0 && <span>{String(timeLeft.hours).padStart(2, '0')}h </span>}
            <span>{String(timeLeft.minutes).padStart(2, '0')}m </span>
            {showSeconds && <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>}
        </span>
    );
};

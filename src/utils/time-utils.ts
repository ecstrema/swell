/**
 * Formats a timestamp as a relative time string (e.g., "2 hours ago", "3 days ago")
 * Uses approximate calculations (30-day months, 365-day years) which is standard for
 * relative time displays. For exact timestamps, use formatDateTime() or check the tooltip.
 * @param timestamp ISO timestamp string
 * @returns Human-readable relative time string
 */
export function formatTimeAgo(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30); // Approximation - standard for relative time
    const years = Math.floor(days / 365); // Approximation - doesn't account for leap years
    
    if (seconds < 60) {
        return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
    } else if (minutes < 60) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else if (hours < 24) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (days < 30) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    } else if (months < 12) {
        return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
        return years === 1 ? '1 year ago' : `${years} years ago`;
    }
}

/**
 * Formats a timestamp as a human-readable date string
 * @param timestamp ISO timestamp string
 * @returns Formatted date string (e.g., "January 15, 2024, 3:45 PM")
 */
export function formatDateTime(timestamp: string): string {
    const date = new Date(timestamp);
    
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleString('en-US', options);
}

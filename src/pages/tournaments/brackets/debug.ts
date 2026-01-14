/**
 * Bracket Debug Utility
 * 
 * Provides controlled debug logging for the bracket system.
 * Disabled by default in production.
 * 
 * To enable debug mode:
 * - Set localStorage.setItem('BRACKET_DEBUG', 'true') in browser console
 * - Or set window.BRACKET_DEBUG = true
 */

// Check if debug mode is enabled
const isDebugEnabled = (): boolean => {
    // Check window flag first (for programmatic control)
    if (typeof window !== 'undefined' && (window as any).BRACKET_DEBUG === true) {
        return true;
    }

    // Check localStorage (persists across refreshes)
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('BRACKET_DEBUG') === 'true';
    }

    return false;
};

/**
 * Debug logger for bracket system
 * Only logs when debug mode is enabled
 */
export const bracketDebug = {
    /**
     * Log a debug message
     * @param message - The message prefix
     * @param args - Additional arguments to log
     */
    log: (message: string, ...args: unknown[]): void => {
        if (isDebugEnabled()) {
            console.log(`[Brackets] ${message}`, ...args);
        }
    },

    /**
     * Log a warning message (always shows)
     * @param message - The message prefix
     * @param args - Additional arguments to log
     */
    warn: (message: string, ...args: unknown[]): void => {
        console.warn(`[Brackets] ${message}`, ...args);
    },

    /**
     * Log an error message (always shows)
     * @param message - The message prefix
     * @param args - Additional arguments to log
     */
    error: (message: string, ...args: unknown[]): void => {
        console.error(`[Brackets] ${message}`, ...args);
    },

    /**
     * Enable debug mode
     */
    enable: (): void => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('BRACKET_DEBUG', 'true');
        }
        if (typeof window !== 'undefined') {
            (window as any).BRACKET_DEBUG = true;
        }
        console.log('[Brackets] Debug mode ENABLED. Refresh to see debug logs.');
    },

    /**
     * Disable debug mode
     */
    disable: (): void => {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('BRACKET_DEBUG');
        }
        if (typeof window !== 'undefined') {
            (window as any).BRACKET_DEBUG = false;
        }
        console.log('[Brackets] Debug mode DISABLED.');
    },

    /**
     * Check if debug mode is currently enabled
     */
    isEnabled: (): boolean => {
        return isDebugEnabled();
    }
};

// Export a shorter alias
export const debug = bracketDebug;

// Make available on window for easy console access
if (typeof window !== 'undefined') {
    (window as any).bracketDebug = bracketDebug;
}

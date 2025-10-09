
import '@testing-library/jest-dom';
import { vi, expect } from 'vitest';

// Extend the expect interface with jest-dom matchers
expect.extend(await import('@testing-library/jest-dom').then(mod => mod.default || mod));

// Mock browser APIs if needed
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console errors for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out specific warnings that might clutter test output
  const suppressedWarnings = [
    'Warning: ReactDOM.render is no longer supported',
    'Warning: useLayoutEffect does nothing on the server',
  ];
  
  if (!args.some(arg => typeof arg === 'string' && suppressedWarnings.some(warning => arg.includes(warning)))) {
    originalConsoleError(...args);
  }
};

// Add any other global mocks or setup needed for tests

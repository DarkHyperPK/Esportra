import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import React from 'react'

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// GLOBAL SECURITY: Silence all console logs in production
if (import.meta.env.PROD) {
  console.log = () => { };
  console.warn = () => { };
  console.debug = () => { };
  // console.error is kept for critical troubleshooting
}

const root = createRoot(rootElement)

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)

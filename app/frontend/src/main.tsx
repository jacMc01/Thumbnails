/**
 * Main entry point for the YouTube Thumbnail Generator React app
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './styles/index.css'

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long until data is considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache time - how long to keep data in cache after component unmounts
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
      
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      
      // Refetch on window focus
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Global mutation options
      retry: false, // Don't retry mutations by default
    },
  },
})

// Error handling for the app
const handleError = (error: Error, errorInfo: any) => {
  console.error('Application Error:', error, errorInfo)
  
  // In production, you might want to send this to an error reporting service
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    handleError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="card max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                We're sorry, but something unexpected happened. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Create root and render app
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(rootElement)

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        
        {/* React Query Devtools - only in development */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools 
            initialIsOpen={false}
            position="bottom-right"
          />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
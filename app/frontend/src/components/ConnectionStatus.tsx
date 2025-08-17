/**
 * Connection Status Component
 * 
 * Shows the current connection status to the backend API
 */

import React from 'react'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  isDemoMode: boolean
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  isDemoMode
}) => {
  if (isDemoMode) {
    return null // Don't show connection status in demo mode
  }

  if (isConnecting) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="spinner"></div>
              <span className="text-sm text-yellow-700">
                Connecting to server...
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="bg-red-50 border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="flex items-center justify-center space-x-2">
              <svg 
                className="w-4 h-4 text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.078 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
              <span className="text-sm text-red-700">
                Server connection lost. Please check your backend is running.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Connected - show brief success indicator
  return (
    <div className="bg-green-50 border-b border-green-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-1">
          <div className="flex items-center justify-center space-x-2">
            <svg 
              className="w-3 h-3 text-green-500" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                clipRule="evenodd" 
              />
            </svg>
            <span className="text-xs text-green-700">
              Connected to server
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConnectionStatus
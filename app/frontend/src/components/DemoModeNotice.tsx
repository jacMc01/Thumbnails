/**
 * Demo Mode Notice Component
 * 
 * Displays a banner when the app is running in demo mode
 */

import React from 'react'

const DemoModeNotice: React.FC = () => {
  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex-shrink-0">
              <svg 
                className="w-5 h-5 text-blue-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-700 text-center">
                <span className="font-medium">Demo Mode Active:</span> 
                {' '}This app is running in demo mode with simulated thumbnails. 
                No OpenAI API calls are made and images are placeholders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DemoModeNotice
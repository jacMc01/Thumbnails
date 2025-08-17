/**
 * Header Component - Navigation and branding
 */

import React from 'react'

interface HeaderProps {
  activeView: 'generate' | 'gallery'
  onViewChange: (view: 'generate' | 'gallery') => void
}

const Header: React.FC<HeaderProps> = ({ activeView, onViewChange }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-youtube-red rounded-lg flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Thumbnail Generator
              </h1>
              <p className="text-xs text-gray-500">
                AI-Powered YouTube Thumbnails
              </p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex space-x-1">
            <button
              onClick={() => onViewChange('generate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                activeView === 'generate'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Generate</span>
              </span>
            </button>
            
            <button
              onClick={() => onViewChange('gallery')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                activeView === 'gallery'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Gallery</span>
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
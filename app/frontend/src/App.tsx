/**
 * Main App Component for YouTube Thumbnail Generator
 * 
 * Handles the overall application layout, routing, and state management.
 * Includes demo mode detection and connection status monitoring.
 */

import React, { useState } from 'react'
import { useConnectionStatus } from './api/hooks'
import ThumbnailForm from './components/ThumbnailForm'
import Gallery from './components/Gallery'
import Preview from './components/Preview'
import Header from './components/Header'
import ConnectionStatus from './components/ConnectionStatus'
import DemoModeNotice from './components/DemoModeNotice'
import type { ThumbnailResponse } from './types'

function App() {
  // State for the currently generated thumbnail
  const [currentThumbnail, setCurrentThumbnail] = useState<ThumbnailResponse | null>(null)
  
  // State for active tab/view
  const [activeView, setActiveView] = useState<'generate' | 'gallery'>('generate')
  
  // Monitor connection status
  const { isConnected, isConnecting } = useConnectionStatus()
  
  // Check if we're in demo mode
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
  
  // Handle successful thumbnail generation
  const handleThumbnailGenerated = (thumbnail: ThumbnailResponse) => {
    setCurrentThumbnail(thumbnail)
    // Optionally switch to preview/gallery view
  }
  
  // Handle navigation between views
  const handleViewChange = (view: 'generate' | 'gallery') => {
    setActiveView(view)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        activeView={activeView}
        onViewChange={handleViewChange}
      />
      
      {/* Demo Mode Notice */}
      {isDemoMode && <DemoModeNotice />}
      
      {/* Connection Status */}
      <ConnectionStatus 
        isConnected={isConnected}
        isConnecting={isConnecting}
        isDemoMode={isDemoMode}
      />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'generate' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Generate Thumbnail
                </h1>
                <p className="text-gray-600">
                  Create professional YouTube thumbnails with AI-powered backgrounds 
                  and custom text overlays.
                </p>
              </div>
              
              <ThumbnailForm 
                onSuccess={handleThumbnailGenerated}
                disabled={!isConnected && !isDemoMode}
              />
            </div>
            
            {/* Right Column - Preview */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Preview
                </h2>
                <p className="text-gray-600">
                  Your generated thumbnail will appear here.
                </p>
              </div>
              
              <Preview thumbnail={currentThumbnail} />
            </div>
          </div>
        ) : (
          /* Gallery View */
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Thumbnail Gallery
              </h1>
              <p className="text-gray-600">
                Browse your recently generated thumbnails.
              </p>
            </div>
            
            <Gallery 
              onThumbnailSelect={setCurrentThumbnail}
              disabled={!isConnected && !isDemoMode}
            />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>
              YouTube Thumbnail Generator - Built with FastAPI, React, and OpenAI
            </p>
            <p className="mt-1">
              {isDemoMode ? 'Demo Mode Active' : 'Production Mode'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
/**
 * Thumbnail Form Component
 * 
 * Main form for generating thumbnails with title, topic, accent color, and logo upload
 */

import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useOptimisticThumbnail } from '../api/hooks'
import type { ThumbnailRequest, ThumbnailResponse, GenerationState } from '../types'

interface ThumbnailFormProps {
  onSuccess: (thumbnail: ThumbnailResponse) => void
  disabled?: boolean
}

interface FormData {
  title: string
  topic: string
  accent_color: string
  logo?: FileList
}

const ThumbnailForm: React.FC<ThumbnailFormProps> = ({ onSuccess, disabled = false }) => {
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    progress: 0,
    stage: 'idle'
  })
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      topic: '',
      accent_color: '#FFD000'
    }
  })
  
  // Watch accent color for live preview
  const accentColor = watch('accent_color')
  
  // Mutation hook with progress tracking
  const { generateWithProgress, isError, error } = useOptimisticThumbnail()
  
  // Handle form submission
  const onSubmit = async (data: FormData) => {
    if (disabled || generationState.isLoading) return
    
    try {
      setGenerationState({
        isLoading: true,
        progress: 0,
        stage: 'generating'
      })
      
      // Prepare request
      const request: ThumbnailRequest = {
        title: data.title.trim(),
        topic: data.topic.trim(),
        accent_color: data.accent_color,
        logo: data.logo?.[0]
      }
      
      // Generate with progress updates
      const result = await generateWithProgress(
        request,
        (progress, stage) => {
          setGenerationState(prev => ({
            ...prev,
            progress,
            stage: stage as any
          }))
        }
      )
      
      // Success
      setGenerationState({
        isLoading: false,
        progress: 100,
        stage: 'complete'
      })
      
      onSuccess(result)
      
      // Reset form after short delay
      setTimeout(() => {
        reset()
        setLogoPreview(null)
        setGenerationState({
          isLoading: false,
          progress: 0,
          stage: 'idle'
        })
      }, 2000)
      
    } catch (err) {
      setGenerationState({
        isLoading: false,
        progress: 0,
        stage: 'error',
        error: err instanceof Error ? err.message : 'Generation failed'
      })
    }
  }
  
  // Handle logo file selection
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        alert('Please select a PNG or JPEG image')
        return
      }
      
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be smaller than 2MB')
        return
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Remove logo
  const removeLogo = () => {
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  return (
    <div className="card">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="form-label">
            Thumbnail Title *
          </label>
          <input
            id="title"
            type="text"
            className={`form-input ${errors.title ? 'border-red-500' : ''}`}
            placeholder="Enter your YouTube video title..."
            disabled={disabled || generationState.isLoading}
            {...register('title', {
              required: 'Title is required',
              minLength: {
                value: 5,
                message: 'Title must be at least 5 characters'
              },
              maxLength: {
                value: 120,
                message: 'Title must be less than 120 characters'
              }
            })}
          />
          {errors.title && (
            <p className="form-error">{errors.title.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            This text will appear on your thumbnail
          </p>
        </div>
        
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="form-label">
            Background Topic *
          </label>
          <textarea
            id="topic"
            rows={3}
            className={`form-textarea ${errors.topic ? 'border-red-500' : ''}`}
            placeholder="Describe the background theme (e.g., 'gaming setup', 'nature landscape', 'tech workspace')..."
            disabled={disabled || generationState.isLoading}
            {...register('topic', {
              required: 'Topic is required',
              minLength: {
                value: 3,
                message: 'Topic must be at least 3 characters'
              },
              maxLength: {
                value: 160,
                message: 'Topic must be less than 160 characters'
              }
            })}
          />
          {errors.topic && (
            <p className="form-error">{errors.topic.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            AI will generate a background based on this description
          </p>
        </div>
        
        {/* Accent Color */}
        <div>
          <label htmlFor="accent_color" className="form-label">
            Accent Color
          </label>
          <div className="flex items-center space-x-3">
            <input
              id="accent_color"
              type="color"
              className="color-picker"
              disabled={disabled || generationState.isLoading}
              {...register('accent_color')}
            />
            <div className="flex-1">
              <input
                type="text"
                className="form-input"
                placeholder="#FFD000"
                disabled={disabled || generationState.isLoading}
                {...register('accent_color', {
                  pattern: {
                    value: /^#([0-9a-fA-F]{6})$/,
                    message: 'Please enter a valid hex color code'
                  }
                })}
              />
            </div>
            <div 
              className="w-8 h-8 rounded border border-gray-300"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          {errors.accent_color && (
            <p className="form-error">{errors.accent_color.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Color for the accent bar above your title
          </p>
        </div>
        
        {/* Logo Upload */}
        <div>
          <label className="form-label">
            Logo (Optional)
          </label>
          
          {!logoPreview ? (
            <div className="file-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="sr-only"
                disabled={disabled || generationState.isLoading}
                {...register('logo')}
                onChange={handleLogoChange}
              />
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  <button
                    type="button"
                    className="text-primary-600 hover:text-primary-500 font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload a logo
                  </button>
                  {' '}or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG or JPEG up to 2MB</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-32 h-32 object-contain mx-auto border border-gray-300 rounded"
              />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {generationState.isLoading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{generationState.stage}</span>
              <span className="text-gray-600">{generationState.progress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${generationState.progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {(isError || generationState.stage === 'error') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Generation failed
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {generationState.error || error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || generationState.isLoading}
          className="btn-primary w-full"
        >
          {generationState.isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="spinner"></div>
              <span>Generating...</span>
            </span>
          ) : (
            'Generate Thumbnail'
          )}
        </button>
        
        {generationState.stage === 'complete' && (
          <div className="text-center text-green-600 text-sm font-medium">
            ✓ Thumbnail generated successfully!
          </div>
        )}
      </form>
    </div>
  )
}

export default ThumbnailForm
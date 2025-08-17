# YouTube Thumbnail Generator

A full-stack application that generates professional YouTube thumbnails using AI-powered backgrounds and custom text overlays. Built with FastAPI, React, and OpenAI's image generation API.

## 🎯 Features

- **AI-Generated Backgrounds**: Uses OpenAI's DALL-E to create custom backgrounds based on your topic
- **Professional Text Rendering**: High-contrast text with stroke effects for maximum readability
- **Custom Branding**: Optional logo overlay with aspect ratio preservation
- **Optimized Output**: Generates 1280×720 JPEG files optimized to stay under 2MB
- **Real-time Preview**: See your thumbnail as you create it
- **Gallery Management**: Browse and download previously generated thumbnails
- **Demo Mode**: Test the interface without requiring OpenAI API access

## 🏗️ Architecture

### Backend (FastAPI)
- **FastAPI** web framework with automatic OpenAPI documentation
- **Pydantic** for data validation and settings management
- **OpenAI API** integration for background generation
- **Pillow** for image composition and text rendering
- **Uvicorn** ASGI server for development

### Frontend (React + Vite)
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **TanStack Query** for efficient API state management
- **React Hook Form** for form validation and handling
- **Tailwind CSS** for responsive styling
- **Axios** for HTTP client communication

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **OpenAI API Key** (for production mode)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Thumbnails
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd app/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../../.env.example ../../.env
# Edit .env with your OpenAI API key
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Configure environment (optional for demo mode)
cp .env.example .env.local
```

### 4. Run the Application

**Start Backend (Terminal 1):**
```bash
cd app/backend
uvicorn main:app --reload --port 8000
```

**Start Frontend (Terminal 2):**
```bash
cd app/frontend
npm run dev
```

**Access the Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🎮 Demo Mode

To try the application without an OpenAI API key:

1. Set `VITE_DEMO_MODE=true` in `app/frontend/.env.local`
2. Demo mode uses placeholder images and simulates the generation process
3. All functionality works except actual AI image generation

## 📖 Usage Guide

### 1. Generate a Thumbnail

1. **Enter Title**: Add your YouTube video title (5-120 characters)
2. **Describe Topic**: Describe the background theme for AI generation
3. **Choose Accent Color**: Pick a color for the accent bar (optional)
4. **Upload Logo**: Add your brand logo (PNG/JPEG, max 2MB, optional)
5. **Click Generate**: Wait for the AI to create your thumbnail

### 2. Preview and Download

- View your generated thumbnail in real-time
- Check file size and dimensions
- Download as high-quality JPEG
- Copy shareable URL

### 3. Browse Gallery

- View all previously generated thumbnails
- Click any thumbnail to preview
- Download previous creations
- Refresh to see latest thumbnails

## 🔧 Configuration

### Backend Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_IMAGE_SIZE=1536x864
OPENAI_MODEL=dall-e-3
OPENAI_QUALITY=standard

# Application Settings
ENVIRONMENT=development
LOG_LEVEL=INFO
DATA_DIR=./data/thumbnails

# Server Configuration
CORS_ORIGIN=http://localhost:5173
SERVER_HOST=127.0.0.1
SERVER_PORT=8000

# Image Processing
MAX_FILE_SIZE_MB=2
JPEG_QUALITY_START=92
JPEG_QUALITY_MIN=76
```

### Frontend Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Demo Mode
VITE_DEMO_MODE=false
```

## 🧪 Testing

### Backend Tests

```bash
cd app/backend
pytest
```

### Frontend Tests

```bash
cd app/frontend
npm run test
```

### Type Checking

```bash
# Backend
cd app/backend
mypy .

# Frontend
cd app/frontend
npm run typecheck
```

### Linting

```bash
# Backend
cd app/backend
ruff check .

# Frontend
cd app/frontend
npm run lint
```

## 📁 Project Structure

```
app/
├── backend/                 # FastAPI application
│   ├── main.py             # Application entry point
│   ├── models.py           # Pydantic data models
│   ├── settings.py         # Configuration management
│   ├── routes/
│   │   └── thumbnails.py   # API endpoints
│   ├── services/
│   │   ├── openai_client.py    # OpenAI integration
│   │   └── pillow_utils.py     # Image composition
│   └── requirements.txt    # Python dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/           # API client and hooks
│   │   ├── types/         # TypeScript definitions
│   │   └── styles/        # CSS and styling
│   ├── package.json       # Node.js dependencies
│   └── vite.config.ts     # Vite configuration
├── data/
│   └── thumbnails/        # Generated thumbnail storage
├── .env                   # Environment configuration
└── README.md             # This file
```

## 🎨 Customization

### Adding New Themes

1. Modify the prompt generation in `app/backend/services/openai_client.py`
2. Add theme-specific styling options in the frontend
3. Update the form component to include theme selection

### Custom Fonts

1. Add font files to `app/backend/fonts/`
2. Update font loading logic in `app/backend/services/pillow_utils.py`
3. Add font selection to the frontend form

### Extending File Formats

1. Update validation in `app/backend/models.py`
2. Modify image processing in `app/backend/services/pillow_utils.py`
3. Update frontend file upload validation

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

1. **Backend**: Deploy to any Python hosting service (Heroku, Railway, etc.)
2. **Frontend**: Build and deploy to CDN (Vercel, Netlify, etc.)
3. **Storage**: Configure persistent storage for thumbnails

### Environment Setup

1. Set production environment variables
2. Configure CORS origins for your domain
3. Set up proper logging and monitoring
4. Enable HTTPS for production

## 🔍 API Documentation

The backend automatically generates OpenAPI documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Spec**: http://localhost:8000/openapi.json

### Key Endpoints

- `POST /api/generate` - Generate thumbnail
- `GET /api/thumbnails` - List thumbnails
- `GET /api/files/{filename}` - Serve thumbnail file
- `GET /health` - Health check

## 🐛 Troubleshooting

### Common Issues

**"Module not found" errors:**
- Ensure all dependencies are installed
- Check Python/Node.js versions
- Verify virtual environment activation

**OpenAI API errors:**
- Verify API key is correct and has credits
- Check API rate limits
- Ensure model availability

**Image generation fails:**
- Check file permissions for data directory
- Verify PIL/Pillow fonts are available
- Check system memory for large images

**CORS errors:**
- Verify frontend URL in backend CORS settings
- Check API base URL in frontend configuration

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=DEBUG` in your `.env` file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for image generation API
- **FastAPI** for the excellent web framework
- **React** and **Vite** for frontend tooling
- **TanStack Query** for state management
- **Tailwind CSS** for styling

## 📞 Support

For questions or issues:

1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue on GitHub
4. Check the demo mode for testing
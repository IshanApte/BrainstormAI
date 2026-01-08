# BrainstormAI 🧠

An AI-powered brainstorming assistant that helps you explore ideas through natural conversation and automatically generates organized notes from your brainstorming sessions.

## Features

### Core Features (MVP)
- **Conversational AI**: Chat with an AI assistant that helps you develop and explore ideas, featuring a team of distinct AI personalities (Storm, Sage, Visionary, Devil's Advocate) orchestrated by LangGraph.
- **Automatic Note-Taking**: AI automatically extracts key points and organizes them into structured notes
- **Context-Aware Conversations**: The AI remembers your conversation history within each session
- **Feedback System**: Rate AI responses to help improve the system
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Technical Features
- **Real-time Chat Interface**: Smooth, responsive chat experience
- **Session Management**: Organize brainstorming sessions with categories and tags
- **Note Editing**: Edit and customize automatically generated notes
- **Modern UI**: Beautiful, intuitive interface built with React and Tailwind CSS

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Markdown** for rich text rendering
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **LangChain & LangGraph** for AI conversation management and multi-agent orchestration
- **OpenAI GPT-4** for natural language processing
- **MongoDB** for data storage
- **Mongoose** for database modeling

## Prerequisites

Before running BrainstormAI, make sure you have:

1. **Node.js** (v16 or higher)
2. **MongoDB** (local installation or MongoDB Atlas)
3. **OpenAI API Key** (from OpenAI platform)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd BrainstormAI
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (backend + frontend)
npm run install-all
```

### 3. Environment Configuration

#### Backend Configuration
1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the environment example file:
```bash
cp env.example .env
```

3. Edit `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/brainstormai
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Important**: Replace `your_openai_api_key_here` with your actual OpenAI API key.

#### Frontend Configuration (Optional)
By default, the frontend application (`frontend/src/services/api.ts`) is configured to connect to the backend API at `/api` (relative to its own host). If your backend is running on a different URL, you can create a `.env` file in the `frontend/` directory and set the `REACT_APP_API_URL` variable:
```bash
cd frontend
cp .env.example .env # If you create an .env.example in frontend
```
Then edit `frontend/.env`:
```env
REACT_APP_API_URL=http://your-backend-api-url.com
```
If you don't set this, it will default to using the same host and port as the frontend, with the API path `/api`.

### 4. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. The application will automatically create the database and collections

#### Option B: MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

### 5. Start the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000) concurrently.

#### Production Mode
To run the application in production:
1.  **Build the frontend**: Ensure you are in the root directory.
    ```bash
    # From the root directory
    npm run build
    ```
2.  **Start the backend server**: This command, when run from the root directory, typically starts the backend server, serving the built frontend assets.
    ```bash
    # From the root directory
    npm start
    ```

### 6. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## Usage Guide

### Starting a Brainstorming Session

1. **Open the Application**: Navigate to http://localhost:3000
2. **Start Chatting**: Type your idea or question in the input field
3. **Engage with AI**: The AI will respond with insights, questions, and suggestions
4. **View Notes**: Automatically generated notes appear in the Notes panel (desktop) or Notes tab (mobile)

### Features Walkthrough

#### Chat Interface
- Type your ideas in the text area at the bottom
- Press Enter to send (Shift+Enter for new lines)
- View conversation history in the chat area
- Rate AI responses with thumbs up/down buttons

#### Notes Management
- **Auto-Generated Notes**: AI creates notes after meaningful conversations
- **Edit Notes**: Click the edit icon to modify note content
- **Add Manual Notes**: Use the "Add Note" button to create custom notes
- **Delete Notes**: Remove notes you no longer need

#### Session Management
- **New Session**: Click "New Session" to start fresh
- **Session Info**: View session ID and message count in the header
- **Persistent Storage**: All conversations and notes are saved to the database

## API Endpoints

### Chat Endpoints
- `POST /api/chat` - Send a message and get AI response
- `GET /api/chat/:sessionId` - Get conversation history
- `PUT /api/chat/:sessionId` - Update session metadata
- `GET /api/chat` - Get all sessions

### Notes Endpoints
- `GET /api/notes/:sessionId` - Get notes for a session
- `PUT /api/notes/:noteId` - Update a note
- `DELETE /api/notes/:noteId` - Delete a note
- `POST /api/notes` - Create a new note

### Feedback Endpoints
- `POST /api/feedback` - Submit feedback for an AI response
- `GET /api/feedback/:sessionId` - Get feedback for a session

### Health Check
- `GET /api/health` - Check API status

## Development

### Project Structure
```
BrainstormAI/
├── backend/                 # Node.js backend
│   ├── config/             # Database configuration
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic (AI services, LangGraph orchestration, agent definitions)
│   │   ├── agents/         # Individual AI agent class definitions
│   │   ├── graphOrchestrator.js # LangGraph setup for multi-agent flow
│   │   ├── aiService.js      # Base AI functionalities (e.g. notes)
│   │   └── multiAgentService.js # Service layer for multi-agent interactions (uses graphOrchestrator)
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript definitions
│   │   └── App.tsx         # Main App component
└── package.json            # Root package.json
```

### Available Scripts

#### Root Level
- `npm run dev` - Start both backend and frontend in development mode.
- `npm run install-all` - Install dependencies for all packages (backend and frontend).
- `npm run build` - Build the frontend for production (output to `frontend/build`).
- `npm start` - Start the backend server in production mode, serving the built frontend. Assumes `npm run build` has been run.

#### Backend
- `npm run dev` - Start backend with nodemon (auto-restart)
- `npm start` - Start backend in production mode

#### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check your connection string in `.env`
   - Verify network connectivity for MongoDB Atlas

2. **OpenAI API Errors**
   - Verify your API key is correct
   - Check your OpenAI account has sufficient credits
   - Ensure the API key has proper permissions

3. **Port Already in Use**
   - Change the PORT in backend `.env` file
   - Kill processes using the ports: `lsof -ti:3000 | xargs kill -9`

4. **Dependencies Issues**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm run install-all` again

### Logs and Debugging

- Backend logs appear in the terminal running the server
- Frontend logs appear in the browser console
- Check the Network tab in browser dev tools for API request issues

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- Voice input/output for natural conversations
- Real-time collaboration for group brainstorming
- Integration with third-party tools (Notion, Google Drive)
- Advanced note organization and search
- Export functionality for notes and conversations
- Custom AI prompts and personalities

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information

---

## Attributions

- **Icons**: Idea icons created by [Good Ware](https://www.flaticon.com/authors/good-ware) - [Flaticon](https://www.flaticon.com/free-icons/idea)

---

**Happy Brainstorming! 🚀** 
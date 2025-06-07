# Quick Setup Guide

## 🚀 Get BrainstormAI Running in 5 Minutes

### 1. Set up Environment Variables
```bash
cd backend
cp env.example .env
```

Then edit `backend/.env` and add your OpenAI API key:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/brainstormai
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 2. Start MongoDB
**Option A: Local MongoDB**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or start manually
mongod
```

**Option B: Use MongoDB Atlas (Cloud)**
- Create account at https://cloud.mongodb.com
- Create a free cluster
- Get connection string and update MONGODB_URI in .env

### 3. Start the Application
```bash
# From the root directory
npm run dev
```

This starts both backend (port 5000) and frontend (port 3000).

### 4. Open in Browser
Navigate to: http://localhost:3000

### 🎉 You're Ready!
Start brainstorming by typing your first idea or question!

---

## Need Help?
- Check the main README.md for detailed instructions
- Ensure your OpenAI API key is valid and has credits
- Make sure MongoDB is running 
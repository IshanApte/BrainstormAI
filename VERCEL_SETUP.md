# Vercel Deployment Setup

This project is configured to deploy both frontend and backend on Vercel using serverless functions.

## Vercel Configuration

### Root Directory
Set the **Root Directory** to `./` (project root) in your Vercel project settings.

### Environment Variables
Add these environment variables in Vercel:

1. **MONGODB_URI** - Your MongoDB connection string (use MongoDB Atlas for production)
2. **OPENAI_API_KEY** - Your OpenAI API key
3. **CORS_ORIGIN** - Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
4. **NODE_ENV** - Set to `production`

### How It Works

1. **Frontend**: Built from `frontend/` directory and served as static files
2. **Backend**: Deployed as serverless functions in `api/` directory
3. **API Routes**: All `/api/*` requests are routed to the serverless function at `api/index.js`

### File Structure

```
/
├── api/
│   └── index.js          # Serverless function wrapper for Express app
├── backend/               # Backend code (used by serverless function)
├── frontend/             # React frontend
└── vercel.json           # Vercel configuration
```

### Testing Locally

To test the serverless function locally, you can use Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

This will start a local server that mimics Vercel's serverless environment.

### Notes

- The database connection is optimized for serverless (reuses connections)
- API routes are automatically available at `/api/*`
- Frontend is served from the `frontend/build` directory after build

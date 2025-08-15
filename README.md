# Engineer Connect Backend

This is the backend codebase for Engineer Connect, prepared for deployment on Railway.

## Setup
1. Copy `.env.example` to `.env` and fill in your secrets.
2. Run `npm install` to install dependencies.
3. Start the server with `node server.js` or use Railway deployment.

## Structure
- `server.js` - Main Express server
- `models/` - Mongoose models
- `routes/` - Express routes
- `middleware/` - Auth middleware
- `uploads/` - File uploads

## Deployment
- Push this folder to a new GitHub repo
- Connect the repo to Railway
- Set environment variables in Railway dashboard

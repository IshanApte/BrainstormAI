const mongoose = require('mongoose');

// Cache the connection to reuse in serverless environments
let cachedConnection = null;

const connectDB = async () => {
  // If we're in a serverless environment and already connected, reuse the connection
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // If connection exists but is not ready, return it (will reconnect automatically)
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error.message);
    // In serverless, don't exit the process - just throw the error
    if (process.env.VERCEL) {
      throw error;
    }
    process.exit(1);
  }
};

module.exports = connectDB;

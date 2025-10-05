const { config } = require('dotenv');
const { resolve } = require('path');

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Fallback values if .env.test doesn't exist
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27018/playevents_test';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

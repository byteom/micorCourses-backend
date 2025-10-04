const dotenv = require('dotenv');
const path = require('path');

// Try multiple paths for .env file
const envPaths = [
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  '.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.log('⚠️  Could not load .env file, trying default config');
  dotenv.config();
}

// Debug environment variables (after loading)
if (process.env.NODE_ENV !== 'production') {
  console.log('Environment Check:');
  console.log('PORT:', process.env.PORT);
  console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Missing');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
  console.log('NODE_ENV:', process.env.NODE_ENV);
}

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4001;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MicroCourses API is ready!`);
});
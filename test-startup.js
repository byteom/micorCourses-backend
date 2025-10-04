// Test script to verify environment and database setup
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🧪 Testing MicroCourses Backend Setup...\n');

// Test environment variables
console.log('1. Environment Variables:');
console.log('   PORT:', process.env.PORT || 'Not set (will use 4001)');
console.log('   MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'Not set');

// Test database connection
console.log('\n2. Testing Database Connection...');
const mongoose = require('mongoose');

async function testDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('   ✅ Database connection successful');
    
    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   📊 Found ${collections.length} collections in database`);
    
    // Check for courses
    const Course = require('./src/models/Course');
    const courseCount = await Course.countDocuments();
    console.log(`   📚 Found ${courseCount} courses`);
    
    if (courseCount === 0) {
      console.log('   💡 No courses found. Run "npm run seed" to add sample data');
    }
    
    await mongoose.disconnect();
    console.log('   🔌 Database disconnected');
    
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Make sure MongoDB is running on your system');
    }
  }
}

// Test basic server setup
console.log('\n3. Testing Server Setup...');
try {
  const app = require('./src/app');
  console.log('   ✅ Express app loaded successfully');
  console.log('   🚀 Server is ready to start');
} catch (error) {
  console.log('   ❌ Server setup failed:', error.message);
}

// Run database test
testDatabase().then(() => {
  console.log('\n🎉 Setup test completed!');
  console.log('\nNext steps:');
  console.log('1. Make sure MongoDB is running');
  console.log('2. Run "npm run seed" to add sample data');
  console.log('3. Run "npm run dev" to start the server');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Setup test failed:', error);
  process.exit(1);
});
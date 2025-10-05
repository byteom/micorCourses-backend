const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedAdmins = async () => {
  const adminUsers = [
    {
      name: 'Super Admin',
      email: 'admin@microcourses.com',
      password: 'Admin123!@#',
      role: 'admin',
      bio: 'Super Administrator with full system access',
      isActive: true,
      accountStatus: 'active'
    },
    {
      name: 'Course Manager',
      email: 'course.manager@microcourses.com',
      password: 'CourseMgr123!',
      role: 'admin',
      bio: 'Course Management Administrator',
      isActive: true,
      accountStatus: 'active'
    },
    {
      name: 'User Manager',
      email: 'user.manager@microcourses.com',
      password: 'UserMgr123!',
      role: 'admin',
      bio: 'User Management Administrator',
      isActive: true,
      accountStatus: 'active'
    }
  ];

  let createdCount = 0;
  let skippedCount = 0;
  
  for (const adminData of adminUsers) {
    try {
      const existingAdmin = await User.findOne({ email: adminData.email });
      
      if (existingAdmin) {
        console.log(`⏭️  Admin already exists: ${adminData.email}`);
        skippedCount++;
        continue;
      }
      
      const admin = await User.create(adminData);
      console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
      createdCount++;
      
    } catch (error) {
      console.error(`❌ Error creating admin ${adminData.email}:`, error.message);
    }
  }
  
  return { createdCount, skippedCount };
};

const seedSampleData = async () => {
  try {
    console.log('🌱 Starting sample data seed process...');
    
    // Connect to database
    await connectDB();
    
    // Seed admins
    console.log('\n👑 Seeding admin users...');
    const adminResult = await seedAdmins();
    
    console.log('\n📊 Seed Summary:');
    console.log(`✅ Created: ${adminResult.createdCount} admin users`);
    console.log(`⏭️  Skipped: ${adminResult.skippedCount} existing users`);
    
    console.log('\n🔐 Admin Login Credentials:');
    console.log('1. Super Admin: admin@microcourses.com / Admin123!@#');
    console.log('2. Course Manager: course.manager@microcourses.com / CourseMgr123!');
    console.log('3. User Manager: user.manager@microcourses.com / UserMgr123!');
    
    console.log('\n🎉 Sample data seed process completed!');
    
  } catch (error) {
    console.error('❌ Seed process failed:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seedSampleData();
}

module.exports = { seedSampleData, seedAdmins };

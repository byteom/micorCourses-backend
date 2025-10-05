const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Admin users to seed
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
  try {
    console.log('🌱 Starting admin seed process...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing admin users (optional - comment out if you want to keep existing admins)
    // await User.deleteMany({ role: 'admin' });
    // console.log('🗑️  Cleared existing admin users');
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const adminData of adminUsers) {
      try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        
        if (existingAdmin) {
          console.log(`⏭️  Admin already exists: ${adminData.email}`);
          skippedCount++;
          continue;
        }
        
        // Create admin user
        const admin = await User.create(adminData);
        console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating admin ${adminData.email}:`, error.message);
      }
    }
    
    console.log('\n📊 Seed Summary:');
    console.log(`✅ Created: ${createdCount} admin users`);
    console.log(`⏭️  Skipped: ${skippedCount} existing users`);
    console.log(`📧 Admin emails:`);
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.email} (Password: ${admin.password})`);
    });
    
    console.log('\n🔐 Login Credentials:');
    console.log('1. Super Admin: admin@microcourses.com / Admin123!@#');
    console.log('2. Course Manager: course.manager@microcourses.com / CourseMgr123!');
    console.log('3. User Manager: user.manager@microcourses.com / UserMgr123!');
    
    console.log('\n🎉 Admin seed process completed!');
    
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
  seedAdmins();
}

module.exports = { seedAdmins, adminUsers };

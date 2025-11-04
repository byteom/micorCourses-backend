# Database Seeding Guide

This guide explains how to seed your MicroCourses database with initial data.

## 🌱 Available Seed Commands

### Admin Users Seed
```bash
npm run seed:admins
```
Creates 3 admin users with different roles and permissions.

### Complete Data Seed
```bash
npm run seed:data
```
Runs the complete seeding process (currently includes admin users).

### Quick Seed
```bash
npm run seed
```
Alias for `npm run seed:data`.

## 👑 Admin Users Created

The seed process creates 3 admin users:

| Name | Email | Password | Role | Description |
|------|-------|----------|------|-------------|
| Super Admin | admin@microcourses.com | Admin123!@# | admin | Full system access |
| Course Manager | course.manager@microcourses.com | CourseMgr123! | admin | Course management |
| User Manager | user.manager@microcourses.com | UserMgr123! | admin | User management |

## 🔧 Usage

### Local Development
```bash
# Make sure your local MongoDB is running
npm run seed:admins
```

### Production
```bash
# Connect to your production database
# Set MONGO_URI environment variable
npm run seed:admins
```

## 🛡️ Security Notes

- **Change default passwords** after first login
- **Use strong passwords** in production
- **Limit admin access** to trusted users only
- **Monitor admin activities** regularly

## 🔄 Re-running Seeds

- Seeds are **idempotent** - safe to run multiple times
- Existing users are **skipped** (not overwritten)
- Only **new users** are created

## 📁 File Structure

```
src/utils/
├── seedAdmins.js    # Admin users only
├── seedData.js      # Complete data seed
└── SEED-README.md   # This file
```

## 🚨 Troubleshooting

### Database Connection Issues
- Ensure MongoDB is running
- Check MONGO_URI environment variable
- Verify network connectivity

### Permission Issues
- Ensure user has database write permissions
- Check MongoDB user roles

### Duplicate Users
- Seeds skip existing users by email
- This is normal behavior
- No data is overwritten

## 🎯 Next Steps

After seeding:
1. **Login** with admin credentials
2. **Change passwords** immediately
3. **Create additional users** as needed
4. **Set up course content**
5. **Configure system settings**

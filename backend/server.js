import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Import configurations
import db from './config/models.js'; // imports sequelize & models

// Import routes
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import docRoutes from './routes/docRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Base route for API verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Database Synchronization & Initial Seed
const initApp = async () => {
  try {
    console.log('Synchronizing database models...');
    await db.sequelize.sync({ alter: true });
    console.log('Database synced successfully.');

    // Seed default test user accounts if empty
    const userCount = await db.User.count();
    if (userCount === 0) {
      console.log('No users found. Seeding default student and admin accounts...');
      
      const salt = await bcrypt.genSalt(10);
      const studentHash = await bcrypt.hash('password123', salt);
      const adminHash = await bcrypt.hash('admin123', salt);

      await db.User.create({
        username: 'student',
        email: 'student@gmail.com',
        password_hash: studentHash,
        role: 'Student',
        plan: 'Free',
        is_verified: true
      });

      await db.User.create({
        username: 'admin',
        email: 'admin@gmail.com',
        password_hash: adminHash,
        role: 'Admin',
        plan: 'Free',
        is_verified: true
      });

      console.log('Seeded accounts successfully:');
      console.log(' -> Student: student@gmail.com / password123');
      console.log(' -> Admin: admin@gmail.com / admin123');
    }

    // Seed/Verify Premium account for Pranav
    const pranavUser = await db.User.findOne({ where: { email: 'sricharanpranav1@gmail.com' } });
    const salt = await bcrypt.genSalt(10);
    const pranavHash = await bcrypt.hash('Pranav@123', salt);
    if (!pranavUser) {
      console.log('Seeding Premium account for Pranav...');
      await db.User.create({
        username: 'Pranav',
        email: 'sricharanpranav1@gmail.com',
        password_hash: pranavHash,
        role: 'Student',
        plan: 'Premium',
        is_verified: true
      });
      console.log('Premium account for Pranav seeded successfully.');
    } else {
      pranavUser.plan = 'Premium';
      pranavUser.username = 'Pranav';
      pranavUser.password_hash = pranavHash;
      pranavUser.is_verified = true;
      await pranavUser.save();
      console.log('Premium account details for Pranav updated/verified.');
    }

    // Start Express listener
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`Phoenix backend server running on port: ${PORT}`);
      console.log(`Mode: ${process.env.NODE_ENV || 'production'}`);
      console.log(`===================================================`);
    });

  } catch (err) {
    console.error('Failed to bootstrap application backend:', err);
    process.exit(1);
  }
};

initApp();
export default app;

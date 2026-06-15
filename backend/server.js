import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

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

// Base route for API information
app.get('/', (req, res) => {
  res.json({
    name: 'Phoenix AI Platform API',
    status: 'operational',
    health: '/api/health',
    ai_diagnostics: '/api/health/ai-test'
  });
});

// Base route for API verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// AI Diagnostics Endpoint
app.get('/api/health/ai-test', async (req, res) => {
  const rawKey = process.env.HF_API_KEY || process.env.HF_API_TOKEN || process.env.HF_KEY || process.env.HF_TOKEN || '';
  const hfKey = rawKey.trim().replace(/^["']|["']$/g, '');
  const result = {
    apiKeyPresent: !!hfKey,
    apiKeyLength: hfKey.length,
    apiKeyPrefix: hfKey ? hfKey.substring(0, 7) + '...' : 'none',
    timestamp: new Date()
  };

  if (!hfKey) {
    return res.status(400).json({
      status: 'error',
      message: 'Hugging Face API key is missing in environment variables (HF_API_KEY, HF_API_TOKEN, HF_KEY, HF_TOKEN).',
      details: result
    });
  }

  try {
    const model = 'Qwen/Qwen2.5-Coder-7B-Instruct';
    const startTime = Date.now();
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        model: model,
        messages: [{ role: 'user', content: 'Hello, what is your name?' }],
        max_tokens: 20
      },
      {
        headers: { 
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      status: 'success',
      latency_ms: Date.now() - startTime,
      model: model,
      response: response.data,
      details: result
    });
  } catch (err) {
    res.status(500).json({
      status: 'failed',
      message: err.message,
      huggingFaceResponse: err.response ? err.response.data : null,
      details: result
    });
  }
});

// Database Synchronization & Initial Seed
const initApp = async () => {
  try {
    console.log('Synchronizing database models...');
    await db.sequelize.sync({ alter: true });
    console.log('Database synced successfully.');

    // Remove default test student and admin accounts if they exist
    await db.User.destroy({ where: { email: ['student@gmail.com', 'admin@gmail.com'] } });

    // Seed/Verify Premium Admin account for Pranav (Owner)
    const pranavUser = await db.User.findOne({ where: { email: 'sricharanpranav1@gmail.com' } });
    const salt = await bcrypt.genSalt(10);
    const pranavHash = await bcrypt.hash('Pranav@123', salt);
    
    if (!pranavUser) {
      console.log('Seeding Premium Admin account for Pranav...');
      await db.User.create({
        username: 'Pranav',
        email: 'sricharanpranav1@gmail.com',
        password_hash: pranavHash,
        role: 'Admin',
        plan: 'Premium',
        is_verified: true,
        admin_request_status: 'Approved'
      });
      console.log('Premium Admin account for Pranav seeded successfully.');
    } else {
      pranavUser.plan = 'Premium';
      pranavUser.username = 'Pranav';
      pranavUser.password_hash = pranavHash;
      pranavUser.role = 'Admin';
      pranavUser.is_verified = true;
      pranavUser.admin_request_status = 'Approved';
      await pranavUser.save();
      console.log('Premium Admin account details for Pranav updated/verified.');
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

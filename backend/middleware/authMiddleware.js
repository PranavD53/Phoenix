import jwt from 'jsonwebtoken';
import { User } from '../config/models.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'supersecurephoenixjwttokensecretkey12345';

// Authenticate JWT Token
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User no longer exists' });
    }

    // Enforce Gmail verification status
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your Gmail address to activate your account.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Check Admin Role
export const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access restricted to administrators only' });
  }
};

// Check Student Role (or generally authenticate, since admin can access too)
export const verifyStudent = (req, res, next) => {
  if (req.user && (req.user.role === 'Student' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
};

// Enforce Subscription Daily Limits for Free Users (e.g. 10 queries per day)
export const checkQueryLimit = async (req, res, next) => {
  const user = req.user;

  // Admins or Premium users have unlimited usage
  if (user.role === 'Admin' || user.plan === 'Premium') {
    return next();
  }

  const now = new Date();
  const resetIntervalMs = 24 * 60 * 60 * 1000; // 24 Hours
  const lastResetTime = new Date(user.last_query_reset);

  if (now - lastResetTime > resetIntervalMs) {
    // Over 24 hours have elapsed, reset counter
    user.daily_query_count = 1;
    user.last_query_reset = now;
    await user.save();
    next();
  } else {
    if (user.daily_query_count >= 10) {
      return res.status(429).json({
        error: 'Daily query limit reached (10 queries/day). Please upgrade to the Premium plan for unlimited access!',
        limitReached: true
      });
    } else {
      user.daily_query_count += 1;
      await user.save();
      next();
    }
  }
};

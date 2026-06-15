import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../config/models.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET ;

// Configure Nodemailer Gmail Transporter
const getTransporter = async () => {
  const user = process.env.GMAIL_USER;
  const rawPass = process.env.GMAIL_PASS;
  
  if (user && rawPass) {
    const pass = rawPass.replace(/\s+/g, '');
    
    // Resolve smtp.gmail.com to IPv4 dynamically to avoid ENETUNREACH on IPv6-unfriendly hosting environments
    let host = 'smtp.gmail.com';
    try {
      const { resolve4 } = await import('dns/promises');
      const addresses = await resolve4('smtp.gmail.com');
      if (addresses && addresses.length > 0) {
        host = addresses[0];
      }
    } catch (dnsErr) {
      console.error('[DNS SMTP Error] Failed to resolve smtp.gmail.com:', dnsErr.message);
    }

    return nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: {
        servername: 'smtp.gmail.com'
      },
      connectionTimeout: 3000, // 3 seconds
      greetingTimeout: 3000,   // 3 seconds
      socketTimeout: 5000      // 5 seconds
    });
  }
  return null;
};

// Helper to generate styled HTML email content
const getEmailHtml = (code, isLogin = false) => {
  const introText = isLogin 
    ? 'Use the code below to verify your Gmail address and log in to your account:'
    : 'Thank you for registering! Use the code below to verify your Gmail address and activate your account:';
  return `
    <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 500px;">
      <h2 style="color: #06b6d4;">Phoenix AI Platform</h2>
      <p>${introText}</p>
      <div style="font-size: 24px; font-weight: bold; background: rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 6px; display: inline-block; letter-spacing: 4px; color: #6366f1; margin: 15px 0;">
        ${code}
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">If you did not request this code, you can ignore this email.</p>
    </div>
  `;
};

// Helper to generate plain text email content
const getEmailText = (code, isLogin = false) => {
  const introText = isLogin 
    ? 'Use the code below to verify your Gmail address and log in to your account:'
    : 'Thank you for registering! Use the code below to verify your Gmail address and activate your account:';
  return `Phoenix AI Platform\n\n${introText}\n\nYour verification code is: ${code}\n\nIf you did not request this code, you can ignore this email.`;
};

// Helper to send mail with a timeout
const sendMailWithTimeout = (transporter, mailOptions, timeoutMs = 4000) => {
  return new Promise((resolve, reject) => {
    let completed = false;
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error(`Gmail SMTP timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    transporter.sendMail(mailOptions)
      .then(info => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve(info);
        }
      })
      .catch(err => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
};

// Configure Resend Fallback Mailer
const sendViaResend = async (toEmail, subject, textContent, htmlContent) => {
  const token = process.env.RESEND_API_TOKEN;
  if (!token) {
    throw new Error('Resend API token is not configured');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        from: 'Phoenix AI Platform <onboarding@resend.dev>',
        to: [toEmail],
        subject: subject,
        text: textContent,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Resend responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('[Resend] Email sent successfully via API:', data);
    return true;
  } catch (err) {
    console.error('[Resend Error] Failed to send via Resend API:', err.message);
    throw err;
  }
};

// User Registration with Gmail Verification (Real OTP + Console Fallback)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please provide username, email, and password' });
  }

  const isGmail = email.toLowerCase().endsWith('@gmail.com');
  if (!isGmail) {
    return res.status(400).json({ error: 'Only Gmail addresses (@gmail.com) are permitted for registration.' });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await User.create({
      username,
      email,
      password_hash,
      role: 'Student',
      plan: 'Free',
      is_verified: false,
      verification_code: verificationCode,
      admin_request_status: null
    });

    // Attempt to send email
    const transporter = await getTransporter();
    let emailSent = false;
    let mailErrorMsg = '';

    const mailSubject = 'Phoenix Activation Code';
    const mailText = getEmailText(verificationCode, false);
    const mailHtml = getEmailHtml(verificationCode, false);
    
    if (transporter) {
      try {
        await sendMailWithTimeout(transporter, {
          from: `"Phoenix AI Platform" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: mailSubject,
          text: mailText,
          html: mailHtml
        }, 4000);
        emailSent = true;
        console.log(`[Nodemailer] Gmail verification code dispatched to: ${email}`);
      } catch (mailErr) {
        console.error('[Nodemailer Error] Failed to send email, attempting Resend fallback:', mailErr.message);
        mailErrorMsg = `Gmail SMTP failed: ${mailErr.message}`;
      }
    } else {
      mailErrorMsg = 'Gmail SMTP credentials not configured';
    }

    // Fallback to Resend API if Gmail SMTP failed
    if (!emailSent) {
      try {
        console.log('[Resend Fallback] Dispatching activation code via Resend API to:', email);
        await sendViaResend(email, mailSubject, mailText, mailHtml);
        emailSent = true;
      } catch (resendErr) {
        console.error('[Resend Fallback Error] Resend dispatch also failed:', resendErr.message);
        mailErrorMsg += ` | Resend API failed: ${resendErr.message}`;
      }
    }

    if (!emailSent) {
      // Clean up the user so they can try again
      await newUser.destroy();
      return res.status(500).json({ 
        error: `Failed to send verification email: ${mailErrorMsg}. Please check your email configuration and try again.` 
      });
    }

    res.status(201).json({
      message: 'Registration successful! Verification code sent to your email address.',
      is_verified: false,
      email: newUser.email
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Verify 6-digit Gmail Code
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Please provide email and verification code' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.is_verified = true;
    user.verification_code = null;
    await user.save();

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Account verified successfully!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        profile_pic: user.profile_pic,
        admin_request_status: user.admin_request_status
      }
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Verification failed due to a server error' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Please provide username/email and password' });
  }

  try {
    const user = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { email: usernameOrEmail },
          { username: usernameOrEmail }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.verification_code = code;
      await user.save();

      // Attempt email dispatch
      const transporter = await getTransporter();
      let emailSent = false;
      let mailErrorMsg = '';

      const mailSubject = 'Phoenix Activation Code';
      const mailText = getEmailText(code, true);
      const mailHtml = getEmailHtml(code, true);

      if (transporter) {
        try {
          await sendMailWithTimeout(transporter, {
            from: `"Phoenix AI Platform" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: mailSubject,
            text: mailText,
            html: mailHtml
          }, 4000);
          emailSent = true;
          console.log(`[Nodemailer] Resend code dispatched to: ${user.email}`);
        } catch (mailErr) {
          console.error('[Nodemailer Error] Resend failed, trying Resend fallback:', mailErr.message);
          mailErrorMsg = `Gmail SMTP failed: ${mailErr.message}`;
        }
      } else {
        mailErrorMsg = 'Gmail SMTP credentials not configured';
      }

      // Fallback to Resend
      if (!emailSent) {
        try {
          console.log('[Resend Fallback] Dispatching code via Resend API to:', user.email);
          await sendViaResend(user.email, mailSubject, mailText, mailHtml);
          emailSent = true;
        } catch (resendErr) {
          console.error('[Resend Fallback Error] Resend dispatch also failed:', resendErr.message);
          mailErrorMsg += ` | Resend API failed: ${resendErr.message}`;
        }
      }

      if (!emailSent) {
        return res.status(500).json({
          error: `Failed to send verification code: ${mailErrorMsg}`,
          is_verified: false,
          email: user.email
        });
      }

      return res.status(403).json({
        error: 'Verification required. A new code has been sent to your email.',
        is_verified: false,
        email: user.email
      });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        profile_pic: user.profile_pic,
        daily_query_count: user.daily_query_count,
        admin_request_status: user.admin_request_status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Fetch current user details
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      plan: req.user.plan,
      profile_pic: req.user.profile_pic,
      daily_query_count: req.user.daily_query_count,
      admin_request_status: req.user.admin_request_status
    }
  });
});

// Change Password Endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Please provide old and new passwords.' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// Update Profile Details (Username / Profile Pic Base64)
router.post('/update-profile', authenticateToken, async (req, res) => {
  const { username, profile_pic } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (username) {
      // Check if username is already taken by someone else
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      user.username = username;
    }

    if (profile_pic !== undefined) {
      user.profile_pic = profile_pic;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        profile_pic: user.profile_pic,
        daily_query_count: user.daily_query_count,
        admin_request_status: user.admin_request_status
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Request Admin Access
router.post('/request-admin', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.email === 'sricharanpranav1@gmail.com') {
      return res.status(400).json({ error: 'You are the owner and already have Admin permissions.' });
    }

    user.admin_request_status = 'Pending';
    await user.save();

    res.json({
      success: true,
      message: 'Admin access request sent to owner.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        profile_pic: user.profile_pic,
        daily_query_count: user.daily_query_count,
        admin_request_status: user.admin_request_status
      }
    });
  } catch (err) {
    console.error('Request admin error:', err);
    res.status(500).json({ error: 'Failed to send admin request.' });
  }
});

// Fetch pending admin requests (Owner Only)
router.get('/admin-requests', authenticateToken, async (req, res) => {
  if (req.user.email !== 'sricharanpranav1@gmail.com') {
    return res.status(403).json({ error: 'Only the platform owner can view admin requests.' });
  }

  try {
    const requests = await User.findAll({
      where: { admin_request_status: 'Pending' },
      attributes: ['id', 'username', 'email', 'plan', 'createdAt']
    });
    res.json(requests);
  } catch (err) {
    console.error('Fetch admin requests error:', err);
    res.status(500).json({ error: 'Failed to load admin requests.' });
  }
});

// Approve admin request (Owner Only)
router.post('/approve-admin/:userId', authenticateToken, async (req, res) => {
  if (req.user.email !== 'sricharanpranav1@gmail.com') {
    return res.status(403).json({ error: 'Only the platform owner can approve admin requests.' });
  }

  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.admin_request_status = 'Approved';
    user.role = 'Admin'; // Automatically promote role
    await user.save();

    res.json({ success: true, message: `Approved admin request for ${user.username}.` });
  } catch (err) {
    console.error('Approve admin error:', err);
    res.status(500).json({ error: 'Failed to approve admin request.' });
  }
});

// Reject admin request (Owner Only)
router.post('/reject-admin/:userId', authenticateToken, async (req, res) => {
  if (req.user.email !== 'sricharanpranav1@gmail.com') {
    return res.status(403).json({ error: 'Only the platform owner can reject admin requests.' });
  }

  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.admin_request_status = 'Rejected';
    await user.save();

    res.json({ success: true, message: `Rejected admin request for ${user.username}.` });
  } catch (err) {
    console.error('Reject admin error:', err);
    res.status(500).json({ error: 'Failed to reject admin request.' });
  }
});

// Switch role (Student <-> Admin) after login
router.post('/switch-role', authenticateToken, async (req, res) => {
  const { role } = req.body;
  const userId = req.user.id;

  if (!role || !['Student', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified. Must be "Student" or "Admin".' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verification check for Admin switch
    if (role === 'Admin') {
      const isOwner = user.email === 'sricharanpranav1@gmail.com';
      const isApproved = user.admin_request_status === 'Approved';
      if (!isOwner && !isApproved) {
        return res.status(403).json({ error: 'You do not have permission to switch to Admin. Please ask the owner (sricharanpranav1@gmail.com) for permission.' });
      }
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `Successfully switched role to ${role}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        profile_pic: user.profile_pic,
        daily_query_count: user.daily_query_count,
        admin_request_status: user.admin_request_status
      }
    });
  } catch (err) {
    console.error('Switch role error:', err);
    res.status(500).json({ error: 'Failed to switch user role.' });
  }
});

// Delete User Account
router.delete('/delete-account', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Owner protection safety check
    if (user.email === 'sricharanpranav1@gmail.com') {
      return res.status(400).json({ error: 'The platform owner account cannot be deleted.' });
    }

    await user.destroy();
    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

export default router;

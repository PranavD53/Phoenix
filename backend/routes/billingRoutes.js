import express from 'express';
import { User, Transaction } from '../config/models.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mock Checkout Sandbox: Upgrade User to Premium
router.post('/subscribe', authenticateToken, async (req, res) => {
  const { planName, cardHolderName, cardNumber } = req.body;
  const user = req.user;

  if (!planName || !cardHolderName || !cardNumber) {
    return res.status(400).json({ error: 'Please provide plan, cardholder name, and card number' });
  }

  if (planName !== 'Premium') {
    return res.status(400).json({ error: 'Unsupported sandbox subscription plan' });
  }

  try {
    // 1. Simulate billing processing
    const isSuccess = !cardNumber.startsWith('4000000000000000'); // simple sandbox fail trigger
    
    if (!isSuccess) {
      // Register failed transaction
      await Transaction.create({
        amount: 29.99,
        currency: 'USD',
        status: 'failed',
        plan_name: planName,
        invoice_id: `INV-FAIL-${Math.floor(100000 + Math.random() * 900000)}`,
        user_id: user.id
      });
      return res.status(402).json({ error: 'Payment declined. Use any card number except 4000000000000000 for test sandbox.' });
    }

    // 2. Register successful transaction
    const invoiceId = `INV-PHX-${Math.floor(100000 + Math.random() * 900000)}`;
    const tx = await Transaction.create({
      amount: 29.99,
      currency: 'USD',
      status: 'succeeded',
      plan_name: planName,
      invoice_id: invoiceId,
      user_id: user.id
    });

    // 3. Upgrade user account to Premium
    user.plan = 'Premium';
    await user.save();

    res.json({
      success: true,
      message: 'Subscribed to Premium plan successfully (Sandbox Mode)!',
      transaction: tx,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    });

  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Failed to complete subscription transaction' });
  }
});

// Mock Cancel Subscription (Downgrade User to Free)
router.post('/cancel', authenticateToken, async (req, res) => {
  const user = req.user;
  try {
    user.plan = 'Free';
    user.daily_query_count = 0; // Reset count
    await user.save();
    res.json({
      success: true,
      message: 'Subscription cancelled successfully.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Fetch user subscription payments history
router.get('/transactions', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const txs = await Transaction.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(txs);
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Failed to retrieve transaction records' });
  }
});

export default router;

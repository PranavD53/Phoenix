import express from 'express';
import { User, Conversation, Message, Document, Transaction } from '../config/models.js';
import { authenticateToken, verifyAdmin } from '../middleware/authMiddleware.js';
import sequelize from '../config/db.js';

const router = express.Router();

// Apply auth + admin protections to all endpoints in this router
router.use(authenticateToken, verifyAdmin);

// Fetch admin statistics dashboard values
router.get('/stats', async (req, res) => {
  try {
    const dialect = sequelize.getDialect();

    // 1. Core counters
    const totalUsers = await User.count();
    const premiumUsers = await User.count({ where: { plan: 'Premium' } });
    const studentUsers = await User.count({ where: { role: 'Student' } });
    const adminUsers = await User.count({ where: { role: 'Admin' } });
    const totalConvs = await Conversation.count();
    const totalDocs = await Document.count();

    // 2. Average Latency calculation
    const avgLatencyResult = await Message.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('latency_ms')), 'avg_latency']
      ],
      where: { role: 'assistant' }
    });
    const avgLatency = Math.round(parseFloat(avgLatencyResult?.getDataValue('avg_latency') || 0));

    // 3. User Activity Trends (Grouped by Date)
    let trendSql = '';
    if (dialect === 'postgres') {
      trendSql = `SELECT DATE("createdAt") as date, COUNT(*) as count FROM "Conversations" GROUP BY DATE("createdAt") ORDER BY date ASC LIMIT 15`;
    } else {
      trendSql = `SELECT date(createdAt) as date, count(*) as count FROM Conversations GROUP BY date(createdAt) ORDER BY date ASC LIMIT 15`;
    }
    const [activityTrends] = await sequelize.query(trendSql);

    // 4. Popular topics (based on common words in conversation titles or simple grouping)
    let topicSql = '';
    if (dialect === 'postgres') {
      topicSql = `SELECT title, COUNT(*) as count FROM "Conversations" GROUP BY title ORDER BY count DESC LIMIT 5`;
    } else {
      topicSql = `SELECT title, count(*) as count FROM Conversations GROUP BY title ORDER BY count DESC LIMIT 5`;
    }
    const [popularTopics] = await sequelize.query(topicSql);

    // 5. Most Asked Questions
    let questionsSql = '';
    if (dialect === 'postgres') {
      questionsSql = `SELECT content, COUNT(*) as count FROM "Messages" WHERE role = 'user' GROUP BY content ORDER BY count DESC LIMIT 5`;
    } else {
      questionsSql = `SELECT content, count(*) as count FROM Messages WHERE role = 'user' GROUP BY content ORDER BY count DESC LIMIT 5`;
    }
    const [mostAskedQuestions] = await sequelize.query(questionsSql);

    // 6. Model Usage Breakdown
    let modelSql = '';
    if (dialect === 'postgres') {
      modelSql = `SELECT model, COUNT(*) as count FROM "Conversations" GROUP BY model ORDER BY count DESC`;
    } else {
      modelSql = `SELECT model, count(*) as count FROM Conversations GROUP BY model ORDER BY count DESC`;
    }
    const [modelUsage] = await sequelize.query(modelSql);

    // 7. Revenue Stats
    const totalRevenueResult = await Transaction.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
      ],
      where: { status: 'succeeded' }
    });
    const totalRevenue = parseFloat(totalRevenueResult?.getDataValue('total_revenue') || 0);

    res.json({
      metrics: {
        total_users: totalUsers,
        premium_users: premiumUsers,
        student_users: studentUsers,
        admin_users: adminUsers,
        total_conversations: totalConvs,
        total_documents: totalDocs,
        average_latency_ms: avgLatency,
        total_revenue_usd: totalRevenue
      },
      activity_trends: activityTrends,
      popular_topics: popularTopics,
      most_asked_questions: mostAskedQuestions,
      model_usage: modelUsage
    });

  } catch (err) {
    console.error('Fetch admin stats error:', err);
    res.status(500).json({ error: 'Failed to query platform usage analytics' });
  }
});

// Safe Admin Custom Raw SQL Query Executor
router.post('/query', async (req, res) => {
  const { sql } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'SQL query string required' });
  }

  // Prevent modifying queries for safety (only allow SELECT queries)
  const isSelect = sql.trim().toLowerCase().startsWith('select');
  if (!isSelect) {
    return res.status(403).json({ error: 'Only SELECT query statements are permitted in custom reports' });
  }

  try {
    const [rows, metadata] = await sequelize.query(sql);
    res.json({
      query: sql,
      rows,
      count: rows.length
    });
  } catch (err) {
    res.status(400).json({ error: `SQL Query Error: ${err.message}` });
  }
});

export default router;

import express from 'express';
import { Snippet } from '../config/models.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { runCode } from '../utils/codeRunner.js';
import { queryHuggingFace } from '../utils/aiService.js';

const router = express.Router();

// Safe Code Execution Endpoint
router.post('/run', authenticateToken, async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code body are required' });
  }

  try {
    const result = await runCode(language, code);
    res.json(result);
  } catch (err) {
    console.error('Run code endpoint error:', err);
    res.status(500).json({ error: 'Failed to run code in sandbox' });
  }
});

// AI Error Explanation Endpoint
router.post('/explain', authenticateToken, async (req, res) => {
  const { language, code, errorLog } = req.body;

  if (!language || !code || !errorLog) {
    return res.status(400).json({ error: 'Please provide language, code, and the error log' });
  }

  try {
    const prompt = `You are a professional software compiler and debugger. A student is learning coding and got a runtime/compilation error. 
Explain what is wrong with the code and how to fix it in simple terms. Offer the corrected code block.

Programming Language: ${language}

--- Student Code ---
${code}

--- Execution Error Log ---
${errorLog}
`;

    const explanation = await queryHuggingFace('Qwen/Qwen2.5-Coder-7B-Instruct', [{ role: 'user', content: prompt }]);
    res.json({ explanation: explanation.text });
  } catch (err) {
    console.error('Explain error endpoint error:', err);
    res.status(500).json({ error: 'AI failed to analyze the error log' });
  }
});

// Save a code snippet
router.post('/snippets', authenticateToken, async (req, res) => {
  const { title, language, code } = req.body;
  const userId = req.user.id;

  if (!title || !language || !code) {
    return res.status(400).json({ error: 'Snippet title, language, and code are required' });
  }

  try {
    const snippet = await Snippet.create({
      title,
      language,
      code,
      user_id: userId
    });
    res.status(201).json(snippet);
  } catch (err) {
    console.error('Save snippet error:', err);
    res.status(500).json({ error: 'Failed to save code snippet' });
  }
});

// Fetch all saved snippets for current user
router.get('/snippets', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const snippets = await Snippet.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(snippets);
  } catch (err) {
    console.error('Fetch snippets error:', err);
    res.status(500).json({ error: 'Failed to fetch code snippets' });
  }
});

// Delete a saved snippet
router.delete('/snippets/:id', authenticateToken, async (req, res) => {
  const snippetId = req.params.id;
  const userId = req.user.id;

  try {
    const deletedCount = await Snippet.destroy({
      where: { id: snippetId, user_id: userId }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Snippet not found or unauthorized' });
    }

    res.json({ success: true, message: 'Snippet deleted successfully' });
  } catch (err) {
    console.error('Delete snippet error:', err);
    res.status(500).json({ error: 'Failed to delete snippet' });
  }
});

export default router;

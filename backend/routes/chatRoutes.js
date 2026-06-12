import express from 'express';
import { Conversation, Message, Document, DocumentChunk } from '../config/models.js';
import { authenticateToken, checkQueryLimit } from '../middleware/authMiddleware.js';
import { queryOllama, queryHuggingFace, generateEmbedding, cosineSimilarity } from '../utils/aiService.js';

const router = express.Router();

// Get conversations for current user (with search filter)
router.get('/', authenticateToken, async (req, res) => {
  const { search } = req.query;
  const userId = req.user.id;

  try {
    const whereClause = { user_id: userId };
    
    // If search keyword is provided
    let includeClause = [];
    if (search) {
      // Find conversations containing search text in title OR in any messages
      whereClause[Conversation.sequelize.Op.or] = [
        { title: { [Conversation.sequelize.Op.iLike]: `%${search}%` } }
      ];
      
      // If Sequelize is using sqlite fallback in the future, we use like instead of ilike
      const dialect = Conversation.sequelize.getDialect();
      const opLike = dialect === 'postgres' ? Conversation.sequelize.Op.iLike : Conversation.sequelize.Op.like;
      whereClause[Conversation.sequelize.Op.or][0].title = { [opLike]: `%${search}%` };
    }

    const conversations = await Conversation.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']]
    });

    res.json(conversations);
  } catch (err) {
    console.error('Fetch conversations error:', err);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// Create a new conversation session
router.post('/', authenticateToken, async (req, res) => {
  const { title, model } = req.body;
  const userId = req.user.id;

  if (!title) {
    return res.status(400).json({ error: 'Conversation title required' });
  }

  try {
    const newConv = await Conversation.create({
      title,
      model: model || 'Qwen/Qwen2.5-Coder-7B-Instruct',
      user_id: userId
    });
    res.status(201).json(newConv);
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Fetch messages of a conversation
router.get('/:id/messages', authenticateToken, async (req, res) => {
  const convId = req.params.id;
  const userId = req.user.id;

  try {
    // Authenticate user owns this conversation
    const conv = await Conversation.findOne({ where: { id: convId, user_id: userId } });
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }

    const messages = await Message.findAll({
      where: { conversation_id: convId },
      order: [['createdAt', 'ASC']]
    });

    res.json({
      conversation: conv,
      messages
    });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to load message history' });
  }
});

// Submit a message to conversation (Standard AI Chat OR Document RAG)
router.post('/:id/messages', authenticateToken, checkQueryLimit, async (req, res) => {
  const convId = req.params.id;
  const userId = req.user.id;
  const { content, modelOverride, mode, activeDocId } = req.body; // mode: 'chat' | 'rag'

  if (!content) {
    return res.status(400).json({ error: 'Message content cannot be blank' });
  }

  try {
    // Authenticate user owns this conversation
    const conv = await Conversation.findOne({ where: { id: convId, user_id: userId } });
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save User message
    const userMessage = await Message.create({
      role: 'user',
      content,
      conversation_id: convId
    });

    // Determine model to use
    const activeModel = modelOverride || conv.model || 'Qwen/Qwen2.5-Coder-7B-Instruct';
    
    // Fetch prior messages in the conversation for context window
    const history = await Message.findAll({
      where: { conversation_id: convId },
      order: [['createdAt', 'ASC']],
      limit: 10 // send past 10 messages
    });

    let finalPromptContent = content;
    let sourcesUsed = [];
    let confidenceScore = 0;

    // RAG Pipeline Processing
    if (mode === 'rag') {
      // 1. Generate embedding for user query
      const queryEmbedding = await generateEmbedding(content);

      // 2. Fetch candidate chunks
      let chunkQueryWhere = {};
      if (activeDocId) {
        chunkQueryWhere.document_id = activeDocId;
      } else {
        // Find documents belonging to user
        const userDocs = await Document.findAll({ where: { user_id: userId } });
        const userDocIds = userDocs.map(d => d.id);
        chunkQueryWhere.document_id = { [Document.sequelize.Op.in]: userDocIds };
      }

      const allChunks = await DocumentChunk.findAll({
        where: chunkQueryWhere,
        include: [{ model: Document, attributes: ['filename', 'category'] }]
      });

      // 3. Score chunks using Cosine Similarity in JavaScript
      const scoredChunks = allChunks.map(chunk => {
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        return {
          chunk,
          similarity
        };
      });

      // Sort by similarity descending
      scoredChunks.sort((a, b) => b.similarity - a.similarity);

      // Top matching contexts (filter above threshold 0.15, take up to 4)
      const matches = scoredChunks
        .filter(m => m.similarity > 0.15)
        .slice(0, 4);

      if (matches.length > 0) {
        // Calculate a confidence percentage based on highest score
        confidenceScore = Math.round(matches[0].similarity * 100);
        
        // Assemble context string
        const contextStr = matches.map(m => {
          sourcesUsed.push({
            filename: m.chunk.Document.filename,
            category: m.chunk.Document.category,
            chunk_index: m.chunk.chunk_index,
            score: Math.round(m.similarity * 100)
          });
          return `[Source: ${m.chunk.Document.filename} (Category: ${m.chunk.Document.category})] ${m.chunk.content}`;
        }).join('\n\n');

        finalPromptContent = `Context extracted from user uploaded technical documents:\n${contextStr}\n\nBased ONLY on the context above, answer the following question. If the context does not contain the answer, use your pre-trained knowledge but state that it is not in the documents.\n\nQuestion: ${content}`;
      } else {
        confidenceScore = 0;
      }
    }

    // 4. Dispatch question to AI Model & Calculate response latency
    const startTime = Date.now();
    let aiResponse;

    // Build context messages structure
    const contextMessages = history.map(m => ({ role: m.role, content: m.content }));
    // Swap last message content to our injected RAG content if relevant
    if (contextMessages.length > 0) {
      contextMessages[contextMessages.length - 1].content = finalPromptContent;
    } else {
      contextMessages.push({ role: 'user', content: finalPromptContent });
    }

    aiResponse = await queryHuggingFace(activeModel, contextMessages);

    const latency_ms = Date.now() - startTime;

    // Save AI response message
    const assistantMessage = await Message.create({
      role: 'assistant',
      content: aiResponse.text,
      latency_ms: latency_ms,
      conversation_id: convId
    });

    // Update conversation updatedAt timestamp
    conv.changed('updatedAt', true);
    await conv.save();

    res.json({
      userMessage,
      assistantMessage: {
        ...assistantMessage.toJSON(),
        sources: sourcesUsed,
        confidence: confidenceScore
      }
    });

  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to process AI response' });
  }
});

// Delete a conversation
router.delete('/:id', authenticateToken, async (req, res) => {
  const convId = req.params.id;
  const userId = req.user.id;

  try {
    const deletedCount = await Conversation.destroy({ where: { id: convId, user_id: userId } });
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Multi-Model Benchmarking Endpoint (runs prompts side-by-side)
router.post('/benchmark', authenticateToken, async (req, res) => {
  const { prompt, models } = req.body; // models: Array of strings e.g. ['llama3.2', 'phi']

  if (!prompt || !models || !Array.isArray(models)) {
    return res.status(400).json({ error: 'Please provide prompt and array of model names' });
  }

  try {
    const promises = models.map(async (model) => {
      const startTime = Date.now();
      let response;
      const msgs = [{ role: 'user', content: prompt }];

      response = await queryHuggingFace(model, msgs);

      const latency = Date.now() - startTime;
      return {
        model,
        text: response.text,
        latency_ms: latency,
        char_count: response.text.length
      };
    });

    const results = await Promise.all(promises);
    res.json(results);
  } catch (err) {
    console.error('Model benchmarking error:', err);
    res.status(500).json({ error: 'Failed to complete models comparison benchmarks' });
  }
});

export default router;

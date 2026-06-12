import express from 'express';
import multer from 'multer';
import { Document, DocumentChunk } from '../config/models.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { extractTextFromPdf, splitTextIntoChunks } from '../utils/pdfParser.js';
import { generateEmbedding } from '../utils/aiService.js';

const router = express.Router();

// Configure Multer for In-Memory uploads (limit to 10MB per file)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Upload and index multiple PDF files
router.post('/upload', authenticateToken, upload.array('files'), async (req, res) => {
  const files = req.files;
  const { category } = req.body;
  const userId = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one PDF file' });
  }

  const uploadResults = [];

  try {
    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        uploadResults.push({ filename: file.originalname, status: 'error', error: 'Only PDF files are supported' });
        continue;
      }

      // 1. Extract Text from PDF buffer
      const text = await extractTextFromPdf(file.buffer);
      if (!text || text.trim().length === 0) {
        uploadResults.push({ filename: file.originalname, status: 'error', error: 'PDF file contains no readable text content' });
        continue;
      }

      // 2. Partition into chunks
      const chunks = splitTextIntoChunks(text, 800, 150);

      // 3. Register Document
      const doc = await Document.create({
        filename: file.originalname,
        category: category || 'General',
        file_size: file.size,
        user_id: userId
      });

      // 4. Ingest Chunks with Vector Embeddings
      const chunkPromises = chunks.map(async (chunkText, index) => {
        // Generate vector embedding representation
        const embedding = await generateEmbedding(chunkText);
        
        return DocumentChunk.create({
          chunk_index: index,
          content: chunkText,
          embedding: embedding, // stored directly as a JSON array [0.01, -0.42, ...]
          document_id: doc.id
        });
      });

      await Promise.all(chunkPromises);

      uploadResults.push({
        id: doc.id,
        filename: doc.filename,
        category: doc.category,
        file_size: doc.file_size,
        chunks_count: chunks.length,
        status: 'success'
      });
    }

    res.status(201).json({
      message: 'Processing complete',
      results: uploadResults
    });

  } catch (err) {
    console.error('PDF indexing error:', err);
    res.status(500).json({ error: 'Server error encountered while parsing PDF documents' });
  }
});

// List all user uploaded documents
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const docs = await Document.findAll({
      where: { user_id: userId },
      include: [{ model: DocumentChunk, attributes: ['id'] }],
      order: [['createdAt', 'DESC']]
    });

    // Format output with chunk counts
    const formattedDocs = docs.map(d => ({
      id: d.id,
      filename: d.filename,
      category: d.category,
      file_size: d.file_size,
      chunks_count: d.DocumentChunks ? d.DocumentChunks.length : 0,
      uploaded_at: d.createdAt
    }));

    res.json(formattedDocs);
  } catch (err) {
    console.error('Fetch docs error:', err);
    res.status(500).json({ error: 'Failed to retrieve uploaded documents list' });
  }
});

// Delete a document (Cascades and deletes document_chunks in db)
router.delete('/:id', authenticateToken, async (req, res) => {
  const docId = req.params.id;
  const userId = req.user.id;

  try {
    const deletedCount = await Document.destroy({
      where: { id: docId, user_id: userId }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete doc error:', err);
    res.status(500).json({ error: 'Failed to delete PDF document' });
  }
});

// Document dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const docs = await Document.findAll({
      where: { user_id: userId },
      include: [{ model: DocumentChunk, attributes: ['id'] }]
    });

    const totalDocs = docs.length;
    let totalBytes = 0;
    let totalChunks = 0;
    const categoryCounts = {};

    docs.forEach(d => {
      totalBytes += d.file_size;
      totalChunks += d.DocumentChunks ? d.DocumentChunks.length : 0;
      categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
    });

    res.json({
      total_documents: totalDocs,
      total_size_kb: Math.round(totalBytes / 1024 * 10) / 10,
      total_chunks: totalChunks,
      categories_distribution: categoryCounts
    });
  } catch (err) {
    console.error('Document stats error:', err);
    res.status(500).json({ error: 'Failed to load document dashboard statistics' });
  }
});

export default router;

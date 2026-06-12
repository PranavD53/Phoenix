import pdfParse from 'pdf-parse';

/**
 * Extracts raw string text from PDF buffer
 * @param {Buffer} fileBuffer - The PDF binary buffer
 * @returns {Promise<string>} - The extracted raw text
 */
export const extractTextFromPdf = async (fileBuffer) => {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (err) {
    console.error('PDF Parse Error:', err.message);
    throw new Error('Failed to extract text from PDF file.');
  }
};

/**
 * Splits document string into overlapping chunks for vector ingestion
 * @param {string} text - The raw document text
 * @param {number} chunkSize - Character target limit per chunk
 * @param {number} overlap - Overlapping characters between consecutive chunks
 * @returns {Array<string>} - List of text chunks
 */
export const splitTextIntoChunks = (text, chunkSize = 800, overlap = 150) => {
  if (!text) return [];
  
  // Clean extra white spaces and tabs
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  
  let index = 0;
  while (index < cleanedText.length) {
    // Slice chunk
    const chunk = cleanedText.slice(index, index + chunkSize);
    chunks.push(chunk);
    
    // Slide index forward by (chunkSize - overlap)
    index += (chunkSize - overlap);
    
    // Prevent infinite loops if parameters are bad
    if (chunkSize <= overlap) {
      break;
    }
  }
  
  return chunks;
};

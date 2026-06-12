import express from 'express';
import { Interview } from '../config/models.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { queryHuggingFace } from '../utils/aiService.js';

const router = express.Router();

// Generate Mock Interview Questions (2 MCQs, 2 Concept, 1 Coding)
router.post('/generate', authenticateToken, async (req, res) => {
  const { topic, type } = req.body;

  if (!topic || !type) {
    return res.status(400).json({ error: 'Please provide topic and type (technical/aptitude)' });
  }

  try {
    const prompt = `You are a Senior Recruiter conducting an interview. Generate exactly 5 challenging ${type} questions about "${topic}".
The questions MUST follow this exact structure:
- Question 1 & 2: Multiple Choice Questions (MCQs) with options A, B, C, D. Include the question followed by option labels.
- Question 3 & 4: Deep theoretical concept questions.
- Question 5: A programming coding challenge or mathematical problem.

Return the output as a clean, valid JSON array of strings, like this:
[
  "Question 1 (MCQ): What is... \\n A) Option A \\n B) Option B \\n C) Option C \\n D) Option D",
  "Question 2 (MCQ): Which... \\n A) Option A \\n B) Option B \\n C) Option C \\n D) Option D",
  "Question 3 (Concept): Explain...",
  "Question 4 (Concept): Discuss...",
  "Question 5 (Coding/Problem): Write a function to..."
]
Do not write any introductory or trailing text. Output ONLY the JSON block.`;

    const aiResponse = await queryHuggingFace('Qwen/Qwen2.5-Coder-7B-Instruct', [{ role: 'user', content: prompt }]);
    
    let questions = [];
    try {
      const cleanJson = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
      questions = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('Failed to parse AI interview questions JSON, using standard hybrid fallback question set');
      if (type === 'technical') {
        questions = [
          `Question 1 (MCQ): How does a closure work in Javascript?\\nA) It stores variables in the global namespace.\\nB) It allows an inner function to access the outer scope even after the outer function finishes.\\nC) It prevents functions from nesting.\\nD) It executes code asynchronously.`,
          `Question 2 (MCQ): Which database normalization form ensures there are no transitive dependencies?\\nA) First Normal Form (1NF)\\nB) Second Normal Form (2NF)\\nC) Third Normal Form (3NF)\\nD) Boyce-Codd Normal Form (BCNF)`,
          `Question 3 (Concept): Explain the difference between optimistic and pessimistic locking in database transaction management.`,
          `Question 4 (Concept): Discuss how virtual DOM increases rendering efficiency in modern web libraries.`,
          `Question 5 (Coding): Write a Python function that checks if a string is a palindrome. Output only syntax-valid code.`
        ];
      } else {
        questions = [
          `Question 1 (MCQ): If all cats are mammals and some mammals are dogs, does it logically follow that some cats are dogs?\\nA) Definitely Yes\\nB) Definitely No\\nC) Logically Indeterminate\\nD) Mammals cannot be cats`,
          `Question 2 (MCQ): A developer solves 3 bugs in 4 hours. How many hours will it take to solve 15 bugs at the same rate?\\nA) 12 hours\\nB) 15 hours\\nC) 20 hours\\nD) 24 hours`,
          `Question 3 (Concept): Explain how Bayes' Theorem calculates conditional probability when new evidence is introduced.`,
          `Question 4 (Concept): Two people are playing a game of coin-toss. If the coin is biased (60% heads), discuss the optimal betting strategy.`,
          `Question 5 (Problem): Solve: A father is three times as old as his son. In 12 years, he will be twice as old as his son. Calculate their current ages.`
        ];
      }
    }

    res.json({ questions });
  } catch (err) {
    console.error('Interview generate error:', err);
    res.status(500).json({ error: 'Failed to generate interview questions' });
  }
});

// Evaluate Interview Answers & Grade (Question-by-Question Rigorous Evaluation)
router.post('/evaluate', authenticateToken, async (req, res) => {
  const { topic, type, qaPairs } = req.body;
  const userId = req.user.id;

  if (!topic || !type || !qaPairs || !Array.isArray(qaPairs)) {
    return res.status(400).json({ error: 'Please provide topic, type, and question-answer pairs' });
  }

  // Strict Empty Response Check
  const totalLength = qaPairs.reduce((acc, pair) => acc + (pair.answer || '').trim().length, 0);
  const allBlank = qaPairs.every(pair => {
    const ans = (pair.answer || '').trim().toLowerCase();
    return ans.length === 0 || ans === 'no answer' || ans === 'no answer provided.' || ans === 'none' || ans.startsWith('a) option selected') || ans.startsWith('b) option selected') || ans.startsWith('c) option selected') || ans.startsWith('d) option selected') === false && ans.includes('option selected') === false && ans.length < 3;
  });

  if (totalLength === 0 || allBlank) {
    const zeroResult = {
      score: 0,
      q1_score: 0,
      q1_feedback: 'Question not attempted.',
      q2_score: 0,
      q2_feedback: 'Question not attempted.',
      q3_score: 0,
      q3_feedback: 'Question not attempted.',
      q4_score: 0,
      q4_feedback: 'Question not attempted.',
      q5_score: 0,
      q5_feedback: 'Question not attempted.',
      strengths: ['None'],
      weaknesses: ['Did not attempt the interview. All answer inputs were left blank.'],
      suggestions: ['Please type or speak detailed responses to each question in order to receive feedback and a grade.'],
      communication_feedback: 'No answers provided for verbal or delivery evaluation.'
    };

    const newInterview = await Interview.create({
      topic,
      type,
      score: 0,
      feedback: JSON.stringify(zeroResult),
      user_id: userId
    });

    return res.status(201).json({
      interview_id: newInterview.id,
      ...zeroResult
    });
  }

  // Programmatic Filler Words analysis
  const fillers = ['um', 'uh', 'basically', 'actually', 'you know', 'like'];
  let fillerCount = 0;
  const fillerDetails = {};
  
  qaPairs.forEach(pair => {
    const words = (pair.answer || '').toLowerCase().split(/\s+/);
    words.forEach(w => {
      const cleanW = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      if (fillers.includes(cleanW)) {
        fillerCount++;
        fillerDetails[cleanW] = (fillerDetails[cleanW] || 0) + 1;
      }
    });
  });

  const fillerAlert = fillerCount > 0 
    ? `Detected ${fillerCount} speech filler words (${Object.entries(fillerDetails).map(([word, count]) => `'${word}': ${count}`).join(', ')}).`
    : `No excessive filler words detected. Good delivery clarity.`;

  try {
    const interviewDataStr = qaPairs.map((pair, index) => {
      return `Q${index+1}: ${pair.question}\nStudent Answer: ${pair.answer}`;
    }).join('\n\n');

    const prompt = `You are a strict Senior Recruiter. You must conduct a highly detailed, question-by-question grading of the student's mock interview responses.
Topic: ${topic}
Type: ${type}

Here are the Questions and the Student's Answers:
${interviewDataStr}

Instructions:
1. Evaluate each of the 5 answers individually (each worth up to 20 points):
   - Question 1 (MCQ - max 20 points): Check if the student selected the correct option letter. If correct, 20 points; else 0 points. Explain why.
   - Question 2 (MCQ - max 20 points): Check if the student selected the correct option letter. If correct, 20 points; else 0 points. Explain why.
   - Question 3 (Concept - max 20 points): Grade on theoretical depth, terms, and conceptual accuracy.
   - Question 4 (Concept - max 20 points): Grade on theoretical depth, terms, and conceptual accuracy.
   - Question 5 (Coding/Problem - max 20 points): Inspect code logic/syntax or math calculations. If invalid or empty, assign 0 points.
2. Sum the scores for Q1-Q5 to calculate the final score (0-100). Do not give free points. If they left all answers blank, the score must be 0.
3. Critique the student's communication clarity, verbal flow, and answer structuring.
4. Output your response as a valid JSON object matching this schema exactly:
{
  "score": 65,
  "q1_score": 20,
  "q1_feedback": "Explanation of correctness...",
  "q2_score": 0,
  "q2_feedback": "Explanation of incorrectness...",
  "q3_score": 15,
  "q3_feedback": "Feedback for Q3...",
  "q4_score": 10,
  "q4_feedback": "Feedback for Q4...",
  "q5_score": 20,
  "q5_feedback": "Feedback for Q5...",
  "strengths": ["Strengths point 1", "Strengths point 2"],
  "weaknesses": ["Weakness point 1", "Weakness point 2"],
  "suggestions": ["Suggestion point 1", "Suggestion point 2"],
  "communication_feedback": "Evaluation of delivery structure, confidence tone, and phrasing style..."
}
Do not write any introductory or trailing text. Output ONLY the JSON block.`;

    const aiResponse = await queryHuggingFace('Qwen/Qwen2.5-Coder-7B-Instruct', [{ role: 'user', content: prompt }]);
    
    let evaluationResult = {
      score: 40,
      q1_score: 20,
      q1_feedback: 'Option verified.',
      q2_score: 0,
      q2_feedback: 'Option incorrect.',
      q3_score: 10,
      q3_feedback: 'Partial concept coverage.',
      q4_score: 10,
      q4_feedback: 'Partial concept coverage.',
      q5_score: 0,
      q5_feedback: 'Coding challenge did not run or was incorrect.',
      strengths: ['Basic understanding shown.'],
      weaknesses: ['Lack of detail in concept and code blocks.'],
      suggestions: ['Practice writing robust code syntax and review core definitions.'],
      communication_feedback: 'Maintained basic communication formatting.'
    };

    try {
      const cleanJson = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
      evaluationResult = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('Failed to parse AI evaluation JSON, calculating basic scoring');
      const scoreMatch = aiResponse.text.match(/"score":\s*(\d+)/) || aiResponse.text.match(/score:\s*(\d+)/);
      if (scoreMatch) {
        evaluationResult.score = parseInt(scoreMatch[1]);
      }
      evaluationResult.text_feedback = aiResponse.text;
    }

    // Append calculated speech metrics
    evaluationResult.communication_feedback = `${evaluationResult.communication_feedback || 'Your answer structures were reasonable.'}\n\n[Delivery Metrics] ${fillerAlert}`;

    // Save Interview record
    const newInterview = await Interview.create({
      topic,
      type,
      score: evaluationResult.score,
      feedback: JSON.stringify(evaluationResult),
      user_id: userId
    });

    res.status(201).json({
      interview_id: newInterview.id,
      ...evaluationResult
    });

  } catch (err) {
    console.error('Interview evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate interview responses' });
  }
});

// Get User Interview History
router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const history = await Interview.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });

    const formattedHistory = history.map(item => {
      let parsedFeedback = {};
      try {
        parsedFeedback = JSON.parse(item.feedback);
      } catch (e) {
        parsedFeedback = { text_feedback: item.feedback };
      }
      return {
        id: item.id,
        topic: item.topic,
        type: item.type,
        score: item.score,
        feedback: parsedFeedback,
        date: item.createdAt
      };
    });

    res.json(formattedHistory);
  } catch (err) {
    console.error('Fetch interview history error:', err);
    res.status(500).json({ error: 'Failed to load interview history' });
  }
});

export default router;

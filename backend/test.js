import sequelize from './config/db.js';
import { User, Conversation } from './config/models.js';
import { queryOllama } from './utils/aiService.js';

async function runTests() {
  console.log('--- STARTING PHOENIX BACKEND INTEGRATION TESTS ---');
  
  // Test 1: Connect to Database
  try {
    await sequelize.authenticate();
    console.log('✅ DATABASE: Successfully authenticated database connection.');
  } catch (err) {
    console.error('❌ DATABASE: Connection failed:', err.message);
    process.exit(1);
  }

  // Test 2: Synchronize Tables
  try {
    await sequelize.sync({ force: false });
    console.log('✅ DATABASE: Models synchronized successfully.');
  } catch (err) {
    console.error('❌ DATABASE: Model synchronization failed:', err.message);
    process.exit(1);
  }

  // Test 3: Check Seeding / User count
  try {
    const userCount = await User.count();
    console.log(`✅ DATABASE: Found ${userCount} registered users in the database.`);
  } catch (err) {
    console.error('❌ DATABASE: Failed to query User table:', err.message);
    process.exit(1);
  }

  // Test 4: Query Ollama Service Status
  try {
    console.log('Testing Ollama API connection...');
    const result = await queryOllama('llama3.2', [{ role: 'user', content: 'Say hello in 3 words.' }]);
    console.log(`✅ OLLAMA: API call succeeded. Response model: ${result.model}. Text: "${result.text.trim()}"`);
  } catch (err) {
    console.error('❌ OLLAMA: Connection or execution test failed:', err.message);
  }

  console.log('--- BACKEND INTEGRATION TESTS COMPLETED ---');
  process.exit(0);
}

runTests();

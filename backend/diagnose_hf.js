import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const HF_KEY = process.env.HF_API_KEY;
console.log('Using HF Key:', HF_KEY ? 'Present (starts with ' + HF_KEY.slice(0, 7) + ')' : 'MISSING');

const models = [
  'Qwen/Qwen2.5-Coder-7B-Instruct',
  'Qwen/Qwen2.5-7B-Instruct',
  'meta-llama/Llama-3.2-3B-Instruct',
  'meta-llama/Llama-3.3-70B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3'
];

async function diagnose() {
  console.log('\n--- Hugging Face API Diagnostics ---');
  for (const model of models) {
    console.log(`\nTesting Model: ${model}...`);
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        { inputs: 'Hello, what is your name?', parameters: { max_new_tokens: 30 } },
        {
          headers: { Authorization: `Bearer ${HF_KEY}` },
          timeout: 15000
        }
      );
      console.log(`✅ Success (Status ${response.status})`);
      console.log(`   Response Preview:`, JSON.stringify(response.data).slice(0, 150) + '...');
    } catch (err) {
      console.log(`❌ Failed:`, err.message);
      if (err.response) {
        console.log(`   Status:`, err.response.status);
        console.log(`   Details:`, JSON.stringify(err.response.data));
      }
    }
  }
  console.log('\n-------------------------------------');
}

diagnose();

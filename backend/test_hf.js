import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const HF_KEY = process.env.HF_API_KEY;
console.log('HF KEY:', HF_KEY);

async function test() {
  try {
    const model = 'meta-llama/Llama-3.2-3B-Instruct';
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: 'User: Explain arrays in programming\nAssistant:', parameters: { max_new_tokens: 200 } },
      {
        headers: { Authorization: `Bearer ${HF_KEY}` },
        timeout: 20000
      }
    );
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Error data:', err.response.data);
    }
  }
}

test();

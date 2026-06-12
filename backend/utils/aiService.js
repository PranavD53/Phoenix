import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OLLAMA_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const HF_KEY = process.env.HF_API_KEY || '';

// System Prompts for Chat, Interviews, and Explanations
const SYSTEM_PROMPT = `You are Phoenix, a helpful, intelligent coding assistant and learning tutor. 
Respond in helpful and informative markdown. Keep your code snippets accurate.`;

// Call Local Ollama Model
export const queryOllama = async (modelName, messages, systemPrompt = SYSTEM_PROMPT) => {
  const model = modelName || 'llama3.2';
  try {
    const ollamaMessages = [];
    if (systemPrompt) {
      ollamaMessages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.forEach(msg => {
      ollamaMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });

    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model: model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: 0.7
      }
    }, { timeout: 30000 });

    return {
      text: response.data.message.content,
      model: model,
      latency_ms: 0
    };
  } catch (err) {
    console.warn(`Ollama error (${model}):`, err.message);
    if (HF_KEY) {
      try {
        console.log(`[Ollama Fallback] Attempting Hugging Face API fallback...`);
        return await queryHuggingFace('Qwen/Qwen2.5-Coder-7B-Instruct', messages);
      } catch (hfErr) {
        console.warn(`[Ollama Fallback] Hugging Face fallback failed:`, hfErr.message);
      }
    }
    return getMockResponse(model, messages);
  }
};

// Generate Embeddings using Ollama (or fallback to local custom math embedding vector)
export const generateEmbedding = async (text) => {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: 'llama3.2',
      prompt: text
    }, { timeout: 10000 });

    if (response.data && response.data.embedding) {
      return response.data.embedding;
    }
    throw new Error('No embedding returned from Ollama');
  } catch (err) {
    const vector = [];
    let sum = 0;
    for (let i = 0; i < 384; i++) {
      const val = Math.sin(text.charCodeAt(i % text.length) * (i + 1));
      vector.push(val);
      sum += val * val;
    }
    const magnitude = Math.sqrt(sum);
    return vector.map(v => v / (magnitude || 1));
  }
};

// Call Hugging Face Serverless API
export const queryHuggingFace = async (modelName, messages) => {
  const model = modelName || 'Qwen/Qwen2.5-Coder-7B-Instruct';
  try {
    if (!HF_KEY) {
      return getMockResponse(model, messages);
    }

    const formattedPrompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\nAssistant:';

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: formattedPrompt, parameters: { max_new_tokens: 500, temperature: 0.7 } },
      {
        headers: { Authorization: `Bearer ${HF_KEY}` },
        timeout: 20000
      }
    );

    let outputText = '';
    if (Array.isArray(response.data) && response.data[0] && response.data[0].generated_text) {
      outputText = response.data[0].generated_text.replace(formattedPrompt, '').trim();
    } else if (response.data && response.data.generated_text) {
      outputText = response.data.generated_text.trim();
    } else {
      outputText = JSON.stringify(response.data);
    }

    return {
      text: outputText,
      model: model,
      latency_ms: 0
    };
  } catch (err) {
    console.warn(`Hugging Face error (${model}):`, err.message);
    if (err.response) {
      console.warn(`Hugging Face response details:`, JSON.stringify(err.response.data));
    }
    return getMockResponse(model, messages);
  }
};

// Utility to calculate Cosine Similarity between two vector arrays
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// High-fidelity fallback simulated response generator
function getMockResponse(model, messages) {
  const lastMessage = messages[messages.length - 1].content;
  const lowerMessage = lastMessage.toLowerCase();
  let text = '';

  // 1. Check for specific NameError: name 'Hello' is not defined
  if (lowerMessage.includes('nameerror') || (lowerMessage.includes('hello') && (lowerMessage.includes('not defined') || lowerMessage.includes('error')))) {
    text = `### Error Analysis: NameError

**Error:** \`NameError: name 'Hello' is not defined\`

**Cause:** 
In Python, writing \`print(Hello)\` tells the interpreter to look for a variable named \`Hello\`. Since you haven't defined a variable named \`Hello\` prior to this line, it raises a \`NameError\`.

**How to Fix:**
If you wanted to print the text \`"Hello"\`, you need to enclose it in single or double quotes:
\`\`\`python
for i in range(10):
    print("Hello")
\`\`\`
If you wanted to reference a variable, make sure to initialize it beforehand:
\`\`\`python
Hello = "Hello World"
for i in range(10):
    print(Hello)
\`\`\``;
  }
  // 2. Check for general compilation/runtime errors or traceback request
  else if (
    lowerMessage.includes('traceback') || 
    lowerMessage.includes('errorlog') || 
    lowerMessage.includes('exception') || 
    lowerMessage.includes('compile') || 
    lowerMessage.includes('compilation error') || 
    lowerMessage.includes('runtime error') || 
    lowerMessage.includes('uncaught') || 
    lowerMessage.includes('typeerror') || 
    lowerMessage.includes('referenceerror') || 
    lowerMessage.includes('syntaxerror') || 
    (lowerMessage.includes('explain') && lowerMessage.includes('error'))
  ) {
    text = `### Code Error Explanation
The error occurs because you are trying to reference a variable or function that has not been initialized, is out of scope, or has syntax violations. 

**Resolution:**
1. Check the line number indicated in the runtime log.
2. Verify that the variable/constant is declared and initialized (e.g., using \`let\`, \`const\`, or \`var\` in JavaScript, or direct assignment in Python) before it is used.
3. Ensure there are no typos, and all spelling matches.`;
  }
  // 3. Check for DP / Dynamic Programming requests
  else if (lowerMessage.includes('dp') || lowerMessage.includes('dynamic programming')) {
    text = `### Dynamic Programming (DP)

**Dynamic Programming (DP)** is an algorithmic technique used to solve complex problems by breaking them down into simpler subproblems. It is particularly useful when the subproblems overlap (i.e., we need to solve the same subproblem multiple times).

Key concepts:
1. **Optimal Substructure**: An optimal solution to the problem contains optimal solutions to its subproblems.
2. **Overlapping Subproblems**: The problem can be broken down into subproblems which are reused several times.

**Approaches:**
- **Memoization (Top-Down):** Solve the problem recursively and store the results of subproblems in a table/memo to avoid redundant computation.
- **Tabulation (Bottom-Up):** Solve the subproblems iteratively, starting from the smallest ones, and build up to the main problem.

**Classic Example: Fibonacci Sequence**
\`\`\`python
def fib(n, memo={}):
    if n in memo: return memo[n]
    if n <= 1: return n
    memo[n] = fib(n-1, memo) + fib(n-2, memo)
    return memo[n]
\`\`\``;
  }
  // 3a. Check for Linked List requests
  else if (lowerMessage.includes('linked list') || lowerMessage.includes('linkedlist')) {
    text = `### Linked List in Programming

A **Linked List** is a linear data structure where elements are not stored at contiguous memory locations. Instead, each element (node) points to the next node using a pointer or reference.

**Structure of a Node:**
1. **Data**: The value stored in the node.
2. **Next**: A reference/pointer to the next node in the list.

**Advantages:**
- Dynamic size (easy to grow or shrink).
- Efficient insertion and deletion ($O(1)$ time if pointer is known).

**JavaScript Implementation:**
\`\`\`javascript
class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
  }

  append(data) {
    const newNode = new Node(data);
    if (!this.head) {
      this.head = newNode;
      return;
    }
    let current = this.head;
    while (current.next) {
      current = current.next;
    }
    current.next = newNode;
  }
}
\`\`\``;
  }
  // 3b. Check for Array requests
  else if (lowerMessage.includes('array') || lowerMessage.includes('arrays')) {
    text = `### Arrays in Computer Science

An **Array** is a linear data structure that stores a collection of elements of the same type in contiguous memory locations.

**Key Features:**
- **Index-based access**: Elements can be accessed directly using an index (e.g., \`arr[0]\`).
- **Constant time lookup**: Accessing any element takes $O(1)$ time.
- **Fixed size**: In standard compiled languages, arrays have a static size.

**JavaScript Example:**
\`\`\`javascript
// Declaring and traversing an array
const fruits = ['Apple', 'Banana', 'Cherry'];
fruits.forEach((fruit, index) => {
  console.log(\`\${index}: \${fruit}\`);
});
\`\`\``;
  }
  // 3c. Check for Binary Search Tree requests
  else if (lowerMessage.includes('tree') || lowerMessage.includes('bst') || lowerMessage.includes('binary tree')) {
    text = `### Binary Search Tree (BST)

A **Binary Search Tree** is a node-based binary tree data structure which has the following properties:
- The left subtree of a node contains only nodes with keys lesser than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both left and right subtrees must also be binary search trees.

**Python Node Structure:**
\`\`\`python
class Node:
    def __init__(self, key):
        self.left = None
        self.right = None
        self.val = key
\`\`\``;
  }
  // 4. Check for Javascript/JS Bubble Sort
  else if ((lowerMessage.includes('bubble sort') || lowerMessage.includes('bubblesort')) && (lowerMessage.includes('javascript') || lowerMessage.includes('js'))) {
    text = `Here is a fully functional implementation of the **Bubble Sort** algorithm in JavaScript:

\`\`\`javascript
// Bubble Sort algorithm in JavaScript
function bubbleSort(arr) {
  let len = arr.length;
  let swapped;
  do {
    swapped = false;
    for (let i = 0; i < len - 1; i++) {
      if (arr[i] > arr[i + 1]) {
        // Swap elements
        let temp = arr[i];
        arr[i] = arr[i + 1];
        arr[i + 1] = temp;
        swapped = true;
      }
    }
  } while (swapped);
  return arr;
}

// Example usage:
const array = [64, 34, 25, 12, 22, 11, 90];
console.log("Original Array:", array);
console.log("Sorted Array:", bubbleSort(array));
\`\`\`

### Complexity
- **Time Complexity:** $O(n^2)$ worst and average cases.
- **Space Complexity:** $O(1)$ auxiliary space.`;
  }
  // 5. Check for Python Bubble Sort
  else if ((lowerMessage.includes('bubble sort') || lowerMessage.includes('bubblesort')) && lowerMessage.includes('python')) {
    text = `Here is a clean implementation of the **Bubble Sort** algorithm in Python:

\`\`\`python
# Bubble Sort algorithm in Python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

# Example usage:
if __name__ == "__main__":
    array = [64, 34, 25, 12, 22, 11, 90]
    print("Original Array:", array)
    print("Sorted Array:", bubble_sort(array))
\`\`\`

### Complexity
- **Time Complexity:** $O(n^2)$ worst-case.
- **Space Complexity:** $O(1)$ auxiliary.`;
  }
  // 6. Check for general Bubble Sort
  else if (lowerMessage.includes('bubble sort') || lowerMessage.includes('bubblesort')) {
    text = `Here is a generic implementation of **Bubble Sort**:

\`\`\`javascript
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
\`\`\``;
  }
  // 7. Other python code requests
  else if (lowerMessage.includes('python') && (lowerMessage.includes('code') || lowerMessage.includes('write'))) {
    text = `Here is a Python code example for your request:
\`\`\`python
# Python implementation
def solve_problem():
    # Simulated implementation based on your prompt
    print("Executing custom python routine...")
    return True

solve_problem()
\`\`\``;
  }
  // 8. Other javascript code requests
  else if ((lowerMessage.includes('javascript') || lowerMessage.includes('js')) && (lowerMessage.includes('code') || lowerMessage.includes('write'))) {
    text = `Here is a JavaScript code example for your request:
\`\`\`javascript
// JavaScript implementation
function solveProblem() {
  // Simulated implementation based on your prompt
  console.log("Executing custom JavaScript routine...");
  return true;
}

solveProblem();
\`\`\``;
  }
  // 9. C++ / C / general code requests
  else if ((lowerMessage.includes('c++') || lowerMessage.includes('cpp') || lowerMessage.includes('c ')) && (lowerMessage.includes('code') || lowerMessage.includes('write'))) {
    text = `Here is a C++ code snippet matching your request:
\`\`\`cpp
#include <iostream>

int main() {
    std::cout << "Executing simulated C++ routine..." << std::endl;
    return 0;
}
\`\`\``;
  }
  // 10. General hello / hi
  else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    text = `Hello! I am your AI Learning Mentor. How can I assist you with your coding, interview prep, or documents today?`;
  }
  // 11. General fallback
  else {
    text = `I am **Phoenix**, your AI learning assistant. 

It looks like you are asking a question about a programming concept. For real-time customized explanations, please make sure your local **Ollama** container is running with model \`llama3.2\` active, or supply a valid Hugging Face API key in your \`.env\` file.

**Common Topics to Explore:**
- **Data Structures**: Try asking about *Arrays*, *Linked Lists*, or *Binary Trees*.
- **Algorithms**: Try asking about *Bubble Sort*, *Dynamic Programming (DP)*, or *Binary Search*.
- **Code Debugging**: Paste a traceback log and click **"Ask AI to Explain Error"**.

Let me know if you would like me to explain any of these topics in detail!`;
  }

  return {
    text: text,
    model: `${model} (Simulated)`,
    latency_ms: 250
  };
}

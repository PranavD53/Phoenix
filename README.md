# Phoenix AI Learning Assistant Platform (Capstone Project)

Phoenix is a premium, glassmorphic, dark-mode single-page application built for students and debuggers. It integrates local AI models, database storage, coding playgrounds, document search pipelines, voice integration, and SaaS sandbox capabilities into a single cohesive workspace.

---

## Setup & Running the Platform

### 1. Enable Docker Database
Ensure **Docker Desktop** is open and active on your machine.

### 2. Run the Dev Server
From your host terminal inside the project root folder (`c:\Users\srich\OneDrive\Desktop\Phoenix`), execute:
```bash
npm run install:all
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## Gmail Verification Flow

To secure user accounts, registration now enforces **Gmail verification**:
1. When registering a new account, the email address must end with **`@gmail.com`**.
2. Upon submitting registration, the backend server creates a **6-digit activation code** and prints it to your backend console terminal window:
   ```text
   ==================================================
   [SMTP Sandbox] Verification email sent to: user@gmail.com
   Verification Code: 582194
   ==================================================
   ```
3. Copy the 6-digit code and enter it on the frontend verification screen to activate your account and log in.

---

## Seed Accounts (Instant Login)

Default accounts are seeded automatically on backend startup. These seed accounts are **pre-verified** and do not require code entry:

| Role | Username / Email | Password | Plan / Verification |
| :--- | :--- | :--- | :--- |
| **Student** | `student@gmail.com` | `password123` | Free (Pre-verified) |
| **Admin** | `admin@gmail.com` | `admin123` | Free (Pre-verified, Admin controls) |

---

## LLM Model Selection & Premium Caging

We support local and web-based models. Selection is now locked by subscription tier:

*   **Free Models (Accessible to all)**:
    *   `Ollama Llama 3.2` (Local lightweight completion model)
    *   `Ollama Phi` (Local conversational model)
*   **Premium Models (Locked for Free tier, unlocked on upgrade)**:
    *   `Ollama Llava` (Multimodal engine)
    *   `HF Llama 3.2 3B` (Web inference completion)
    *   `HF Qwen 2.5 Coder` (Web inference coding helper)

If a Free user selects a Premium model, the UI prompts them to upgrade inside the **Subscription Hub**.

---

## Mock Interview Formats & Grading

Mock interviews (Technical & Aptitude) generate a structured mix of questions:
*   **Questions 1 & 2**: Multiple Choice Questions (MCQs). The UI renders these as interactive selectable choice buttons.
*   **Questions 3 & 4**: Theoretical concept questions (answered via text or speech recognition).
*   **Question 5**: A programming code challenge or math problem.

**Strict Evaluation**: If answers are left empty or not attempted, the AI Recruiter evaluates the interview with a score of **`0%`** and requests detailed responses.

---

## Billing Sandbox

You can test subscription upgrades in the **Subscription Hub**:
*   To test a **successful payment**: Enter any credit card details.
*   To test a **declined payment error**: Enter a card number starting with `4000000000000000`.
*   Succeeded upgrades unlock all **Premium models** and grant unlimited chat queries.

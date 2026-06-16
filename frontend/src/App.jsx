import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useChat } from './context/ChatContext';
import Editor from '@monaco-editor/react';
import {
  MessageSquare,
  Code2,
  Mic,
  MicOff,
  GraduationCap,
  CreditCard,
  BarChart3,
  LogOut,
  Search,
  Trash2,
  Upload,
  FileText,
  Play,
  HelpCircle,
  Save,
  Sparkles,
  Database,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Copy,
  ChevronRight,
  User,
  Key,
  Camera,
  UploadCloud,
  Volume2,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Menu,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Markdown Inline Parser Helper
const parseInline = (text) => {
  if (!text) return '';
  const boldParts = text.split(/\*\*([\s\S]*?)\*\*/g);
  
  return boldParts.map((part, index) => {
    const isBold = index % 2 === 1;
    const codeParts = part.split(/`([\s\S]*?)`/g);
    
    const renderedSubParts = codeParts.map((subPart, subIdx) => {
      const isCode = subIdx % 2 === 1;
      if (isCode) {
        return (
          <code key={subIdx} className="code-block-inline">
            {subPart}
          </code>
        );
      }
      return subPart;
    });

    if (isBold) {
      return <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{renderedSubParts}</strong>;
    }
    return <React.Fragment key={index}>{renderedSubParts}</React.Fragment>;
  });
};

// Markdown Text Section Helper
const TextSection = ({ text }) => {
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    if (line.startsWith('### ')) {
      return <h4 key={idx} style={{ margin: '1.2rem 0 0.6rem 0', color: 'var(--text-primary)', fontWeight: '600' }}>{parseInline(line.substring(4))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={idx} style={{ margin: '1.5rem 0 0.8rem 0', color: 'var(--text-primary)', fontWeight: '600' }}>{parseInline(line.substring(3))}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={idx} style={{ margin: '1.8rem 0 1rem 0', color: 'var(--text-primary)', fontWeight: '700' }}>{parseInline(line.substring(2))}</h2>;
    }

    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const cleanLine = line.trim().substring(2);
      return (
        <ul key={idx} style={{ margin: '0.25rem 0 0.25rem 1.5rem', listStyleType: 'disc' }}>
          <li style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{parseInline(cleanLine)}</li>
        </ul>
      );
    }

    const matchOrdered = line.trim().match(/^(\d+)\.\s(.*)/);
    if (matchOrdered) {
      return (
        <ol key={idx} style={{ margin: '0.25rem 0 0.25rem 1.5rem', listStyleType: 'decimal' }}>
          <li style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{parseInline(matchOrdered[2])}</li>
        </ol>
      );
    }

    if (line.trim() === '===' || line.trim() === '---' || line.trim() === '=====' || line.trim() === '-----') {
      return <hr key={idx} style={{ border: 'none', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />;
    }

    if (line.trim() === '') {
      return <div key={idx} style={{ height: '0.5rem' }} />;
    }

    return (
      <p key={idx} style={{ margin: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'left' }}>
        {parseInline(line)}
      </p>
    );
  });
};

// Monaco-like styled CodeBlock with Copy button
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span>{language}</span>
        <button 
          onClick={handleCopy}
          className={`code-block-copy-btn ${copied ? 'copied' : ''}`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="code-block-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Central Markdown Parser
const MarkdownRenderer = ({ content }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && window.renderMathInElement) {
      try {
        window.renderMathInElement(containerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
      }
    }
  }, [content]);

  if (!content) return null;
  const parts = content.split(/```/);

  return (
    <div className="markdown-body" ref={containerRef}>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const lines = part.split('\n');
          const firstLine = lines[0].trim();
          const lang = ['javascript', 'js', 'python', 'py', 'html', 'css', 'sql', 'json', 'bash', 'sh', 'cpp', 'c++', 'c', 'php', 'ruby', 'rb'].includes(firstLine.toLowerCase()) ? firstLine : '';
          const codeLines = lang ? lines.slice(1) : lines;
          const code = codeLines.join('\n').trim();

          return <CodeBlock key={index} code={code} language={lang || 'code'} />;
        } else {
          return <TextSection key={index} text={part} />;
        }
      })}
    </div>
  );
};

export default function App() {
  const { 
    user, 
    token, 
    loading: authLoading, 
    login, 
    register, 
    logout, 
    updatePlan, 
    updateProfile, 
    changePassword, 
    requestAdminAccess, 
    switchRole, 
    fetchAdminRequests, 
    approveAdminRequest, 
    rejectAdminRequest, 
    deleteAccount,
    unverifiedEmail, 
    verifyCode 
  } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    searchQuery,
    setSearchQuery,
    selectedModel,
    setSelectedModel,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage
  } = useChat();

  // Navigation state
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [billingStep, setBillingStep] = useState('none'); // none -> checkout

  // Auth form states
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'Student' });
  const [authError, setAuthError] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showConfirmAuthPassword, setShowConfirmAuthPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Main UI References & States
  const chatBottomRef = useRef(null);
  const [chatInput, setChatInput] = useState('');
  const [isRAGMode, setIsRAGMode] = useState(false);

  // Document Management States
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [docStats, setDocStats] = useState({ total_documents: 0, total_size_kb: 0, total_chunks: 0, categories_distribution: {} });
  const [uploadCategory, setUploadCategory] = useState('General');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Coding Playground States
  const [editorLang, setEditorLang] = useState('javascript');
  const [editorCode, setEditorCode] = useState('// Write your code here\nconsole.log("Hello, World!");');
  const [codeOutput, setCodeOutput] = useState({ stdout: '', stderr: '', isTimeout: false, isCompilationError: false });
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [errorExplanation, setErrorExplanation] = useState('');
  const [isExplainingError, setIsExplainingError] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState('');
  const [savedSnippets, setSavedSnippets] = useState([]);

  // Voice Mentor States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLog, setVoiceLog] = useState([]);
  const [voiceLatency, setVoiceLatency] = useState(0);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Interview Prep States
  const [interviewTopic, setInterviewTopic] = useState('Data Structures');
  const [interviewType, setInterviewType] = useState('technical');
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState(['', '', '', '', '']);
  const [interviewStep, setInterviewStep] = useState('setup'); // setup -> active -> scoring
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const [isEvaluatingInterview, setIsEvaluatingInterview] = useState(false);
  const [interviewResult, setInterviewResult] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);

  // Billing states
  const [billingPlan, setBillingPlan] = useState('Premium');
  const [billingForm, setBillingForm] = useState({ cardHolderName: '', cardNumber: '', expiry: '', cvv: '' });
  const [billingError, setBillingError] = useState('');
  const [billingMessage, setBillingMessage] = useState('');
  const [transactions, setTransactions] = useState([]);

  // Model Benchmarking States
  const [benchmarkPrompt, setBenchmarkPrompt] = useState('');
  const [modelA, setModelA] = useState('Qwen/Qwen2.5-Coder-7B-Instruct');
  const [modelB, setModelB] = useState('meta-llama/Llama-3.2-3B-Instruct');
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState(null);
  const [adminQuery, setAdminQuery] = useState('SELECT * FROM "Users" LIMIT 5;');
  const [adminQueryOutput, setAdminQueryOutput] = useState(null);
  const [adminQueryError, setAdminQueryError] = useState('');

  // Voice Assistant Memory & Speaking controls
  const [voiceConversationId, setVoiceConversationId] = useState(null);
  const isSpeakingRef = useRef(false);

  // User Dashboard Page States
  const [dashboardStatus, setDashboardStatus] = useState({ success: '', error: '' });
  const [profilePicLoading, setProfilePicLoading] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [adminRequests, setAdminRequests] = useState([]);
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);

  const loadAdminRequests = async () => {
    try {
      setLoadingAdminRequests(true);
      const data = await fetchAdminRequests();
      setAdminRequests(data);
    } catch (err) {
      console.error('Failed to load admin requests:', err);
    } finally {
      setLoadingAdminRequests(false);
    }
  };

  const handleRequestAdminAccess = async () => {
    setDashboardStatus({ success: '', error: '' });
    try {
      await requestAdminAccess();
      setDashboardStatus({ success: 'Admin access requested successfully! Pending owner approval.', error: '' });
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    }
  };

  const handleSwitchRole = async (targetRole) => {
    setDashboardStatus({ success: '', error: '' });
    try {
      await switchRole(targetRole);
      setDashboardStatus({ success: `Switched role to ${targetRole} successfully!`, error: '' });
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    }
  };

  const handleApproveAdmin = async (userId) => {
    setDashboardStatus({ success: '', error: '' });
    try {
      const res = await approveAdminRequest(userId);
      setDashboardStatus({ success: res.message, error: '' });
      loadAdminRequests();
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    }
  };

  const handleRejectAdmin = async (userId) => {
    setDashboardStatus({ success: '', error: '' });
    try {
      const res = await rejectAdminRequest(userId);
      setDashboardStatus({ success: res.message, error: '' });
      loadAdminRequests();
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    }
  };
  
  // Interview voice input dictation
  const [isInterviewVoiceActive, setIsInterviewVoiceActive] = useState(false);
  const interviewRecRef = useRef(null);

  // Synchronize dashboard editing name when user object resolves
  useEffect(() => {
    if (user) {
      setProfileUsername(user.username || '');
    }
  }, [user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingMessage]);

  // Load document list & stats
  useEffect(() => {
    if (token && activeTab === 'chat' && isRAGMode) {
      loadDocs();
    }
  }, [token, activeTab, isRAGMode]);

  // Load code snippets
  useEffect(() => {
    if (token && activeTab === 'playground') {
      loadSnippets();
    }
  }, [token, activeTab]);

  // Load interview history
  useEffect(() => {
    if (token && activeTab === 'interview') {
      loadInterviewHistory();
    }
  }, [token, activeTab]);

  // Load billing transactions
  useEffect(() => {
    if (token && activeTab === 'billing') {
      loadTransactions();
    }
  }, [token, activeTab]);

  // Load admin stats
  useEffect(() => {
    if (token && activeTab === 'analytics' && user?.role === 'Admin') {
      loadAdminStats();
    }
  }, [token, activeTab, user]);

  // Load admin requests if owner is on profile tab
  useEffect(() => {
    if (token && activeTab === 'profile' && user?.email === 'sricharanpranav1@gmail.com') {
      loadAdminRequests();
    }
  }, [token, activeTab, user]);

  // Sync templates in editor
  useEffect(() => {
    if (editorLang === 'javascript') {
      setEditorCode('// Write your Javascript code here\nconsole.log("Hello, World!");');
    } else if (editorLang === 'python') {
      setEditorCode('# Write your Python code here\nprint("Hello, World!")');
    } else if (editorLang === 'java') {
      setEditorCode('// Write your Java code here\nSystem.out.println("Hello, World!");');
    } else if (editorLang === 'cpp' || editorLang === 'c++') {
      setEditorCode('// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}');
    } else if (editorLang === 'c') {
      setEditorCode('// Write your C code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}');
    } else if (editorLang === 'php') {
      setEditorCode('<?php\n// Write your PHP code here\necho "Hello, World!\\n";');
    } else if (editorLang === 'ruby' || editorLang === 'rb') {
      setEditorCode('# Write your Ruby code here\nputs "Hello, World!"');
    }
  }, [editorLang]);

  // Speech Recognition Initialization (STT)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        if (text.trim().length > 0) {
          await handleVoiceMsgSend(text);
        }
      };

      rec.onend = () => {
        // Keep listening unless user turned it off or is currently speaking
        if (isVoiceActive && !isSpeakingRef.current) {
          try { rec.start(); } catch(e) {}
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      synthRef.current.cancel();
    };
  }, [isVoiceActive]);

  // Trigger browser audio response (TTS)
  const speakText = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // Mute active sounds
    
    // Clean markdown tags out of audio speech output
    const cleanText = text.replace(/[#*`_\\-]/g, ' ').replace(/\[source:[^\]]+\]/gi, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    
    // Temporary pause recognition while speaking to avoid echo loop
    utterance.onstart = () => {
      isSpeakingRef.current = true;
      if (recognitionRef.current && isVoiceActive) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (recognitionRef.current && isVoiceActive) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
    };

    synthRef.current.speak(utterance);
  };

  // Auth actions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await login(authForm.email || authForm.username, authForm.password);
      } else {
        if (authForm.password !== authForm.confirmPassword) {
          setAuthError("Passwords do not match.");
          return;
        }
        await register(authForm.username, authForm.email, authForm.password, authForm.role);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Chat message send
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingMessage) return;

    const query = chatInput;
    setChatInput('');

    if (!activeConversation) {
      // Auto-create chat session
      try {
        const newConv = await createConversation(`Chat: ${query.substring(0, 25)}`, selectedModel);
        await sendMessage(query, isRAGMode ? 'rag' : 'chat', selectedDocId, newConv.id);
      } catch (err) {
        alert(err.message);
      }
    } else {
      try {
        await sendMessage(query, isRAGMode ? 'rag' : 'chat', selectedDocId);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleModelChange = (e) => {
    const val = e.target.value;
    const premiumModels = [
      'meta-llama/Llama-3.2-3B-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3'
    ];
    if (premiumModels.includes(val) && user.plan !== 'Premium' && user.role !== 'Admin') {
      alert('This is a Premium model. Upgrading to the Premium plan in the Subscription Hub unlocks access to Llama 3.2, Llama 3.3, and Mistral on Hugging Face!');
      return;
    }
    setSelectedModel(val);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerificationError('');
    try {
      await verifyCode(unverifiedEmail, verificationCode);
      setVerificationCode('');
    } catch (err) {
      setVerificationError(err.message);
    }
  };

  // Voice chat message dispatcher
  const handleVoiceMsgSend = async (text) => {
    const startTime = Date.now();
    try {
      let targetConvId = voiceConversationId;
      if (!targetConvId) {
        const res = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ title: `Voice: ${text.substring(0, 15)}...`, model: 'Qwen/Qwen2.5-Coder-7B-Instruct' })
        });
        const conv = await res.json();
        targetConvId = conv.id;
        setVoiceConversationId(conv.id);
      }
      
      const resMsg = await fetch(`${API_URL}/chat/${targetConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: text, mode: 'chat' })
      });
      const data = await resMsg.json();
      const latency = Date.now() - startTime;
      setVoiceLatency(latency);

      // Append to local voice history logs
      setVoiceLog(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.assistantMessage.content, latency_ms: latency }
      ]);

      // Speak response out loud
      speakText(data.assistantMessage.content);
    } catch (err) {
      console.error('Voice message dispatch error:', err);
    }
  };

  const toggleVoiceMode = () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
      isSpeakingRef.current = false;
    } else {
      setIsVoiceActive(true);
      setVoiceTranscript('Listening... Speak now.');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error('STT activation error:', e);
      }
    }
  };

  // Document Management Methods
  const loadDocs = async () => {
    try {
      const res = await fetch(`${API_URL}/docs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUploadedDocs(data);

      const statsRes = await fetch(`${API_URL}/docs/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setDocStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('category', uploadCategory);

    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/docs/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert('PDF Documents uploaded and vector chunks successfully generated!');
        loadDocs();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document? All associated chunks will be lost.')) return;
    try {
      const res = await fetch(`${API_URL}/docs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUploadedDocs(prev => prev.filter(d => d.id !== id));
        loadDocs();
        if (selectedDocId === id) setSelectedDocId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Code Sandbox Runner
  const handleRunCode = async () => {
    setIsRunningCode(true);
    setCodeOutput({ stdout: '', stderr: '', isTimeout: false, isCompilationError: false });
    setErrorExplanation('');

    try {
      const res = await fetch(`${API_URL}/code/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: editorLang, code: editorCode })
      });
      const data = await res.json();
      if (res.ok) {
        setCodeOutput(data);
      } else {
        setCodeOutput({ stdout: '', stderr: data.error, isCompilationError: true });
      }
    } catch (err) {
      setCodeOutput({ stdout: '', stderr: err.message, isCompilationError: true });
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleExplainError = async () => {
    if (!codeOutput.stderr) return;
    setIsExplainingError(true);
    try {
      const res = await fetch(`${API_URL}/code/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          language: editorLang,
          code: editorCode,
          errorLog: codeOutput.stderr
        })
      });
      const data = await res.json();
      if (res.ok) {
        setErrorExplanation(data.explanation);
      } else {
        setErrorExplanation('Failed to explain error.');
      }
    } catch (err) {
      setErrorExplanation(err.message);
    } finally {
      setIsExplainingError(false);
    }
  };

  const handleSaveSnippet = async () => {
    if (!snippetTitle.trim()) return alert('Snippet title required');
    try {
      const res = await fetch(`${API_URL}/code/snippets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: snippetTitle, language: editorLang, code: editorCode })
      });
      if (res.ok) {
        alert('Snippet saved successfully.');
        setSnippetTitle('');
        loadSnippets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSnippets = async () => {
    try {
      const res = await fetch(`${API_URL}/code/snippets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSavedSnippets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSnippetDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/code/snippets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedSnippets(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mock Interview Guides
  const handleStartInterview = async () => {
    setIsGeneratingInterview(true);
    setInterviewQuestions([]);
    setCurrentQuestionIndex(0);
    setInterviewAnswers(['', '', '', '', '']);
    setInterviewResult(null);

    try {
      const res = await fetch(`${API_URL}/interview/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: interviewTopic, type: interviewType })
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setInterviewQuestions(data.questions);
        setInterviewStep('active');
      } else {
        alert(data.error || 'Failed to initialize interview questions');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingInterview(false);
    }
  };

  const handleInterviewAnswerSubmit = async () => {
    if (isInterviewVoiceActive) {
      setIsInterviewVoiceActive(false);
      interviewRecRef.current?.stop();
    }
    setIsEvaluatingInterview(true);
    const qaPairs = interviewQuestions.map((q, idx) => ({
      question: q,
      answer: interviewAnswers[idx] || 'No answer provided.'
    }));

    try {
      const res = await fetch(`${API_URL}/interview/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: interviewTopic, type: interviewType, qaPairs })
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewResult(data);
        setInterviewStep('scoring');
        loadInterviewHistory();
      } else {
        alert(data.error || 'Failed to score interview');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsEvaluatingInterview(false);
    }
  };

  const toggleInterviewVoice = () => {
    if (isInterviewVoiceActive) {
      setIsInterviewVoiceActive(false);
      interviewRecRef.current?.stop();
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      setIsInterviewVoiceActive(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const latestTranscript = event.results[event.results.length - 1][0].transcript;
        setInterviewAnswers(prev => {
          const updated = [...prev];
          const currentText = updated[currentQuestionIndex] || '';
          updated[currentQuestionIndex] = (currentText ? currentText.trim() + ' ' : '') + latestTranscript.trim();
          return updated;
        });
      };

      rec.onend = () => {
        setIsInterviewVoiceActive(false);
      };

      rec.onerror = (err) => {
        console.error('Interview dictation error:', err);
        setIsInterviewVoiceActive(false);
      };

      interviewRecRef.current = rec;
      rec.start();
    }
  };

  const loadInterviewHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/interview/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setInterviewHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintInterviewReport = () => {
    window.print();
  };

  // Profile & Personal Dashboard Actions
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setDashboardStatus({ success: '', error: '' });
    if (!profileUsername.trim()) {
      setDashboardStatus({ success: '', error: 'Username cannot be blank.' });
      return;
    }
    try {
      await updateProfile(profileUsername, undefined);
      setDashboardStatus({ success: 'Username updated successfully!', error: '' });
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1500000) {
      alert('Image size exceeds 1.5MB limit. Please choose a smaller profile image.');
      return;
    }

    setProfilePicLoading(true);
    setDashboardStatus({ success: '', error: '' });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Image = reader.result;
        await updateProfile(undefined, base64Image);
        setDashboardStatus({ success: 'Profile picture uploaded successfully!', error: '' });
      } catch (err) {
        setDashboardStatus({ success: '', error: err.message });
      } finally {
        setProfilePicLoading(false);
      }
    };
    reader.onerror = () => {
      setDashboardStatus({ success: '', error: 'Failed to read image file.' });
      setProfilePicLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProfilePic = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) return;
    setProfilePicLoading(true);
    setDashboardStatus({ success: '', error: '' });
    try {
      await updateProfile(undefined, null);
      setDashboardStatus({ success: 'Profile picture removed successfully!', error: '' });
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    } finally {
      setProfilePicLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      "WARNING: Are you absolutely sure you want to delete your account? This action is permanent and will instantly erase all your profile data, chat sessions, saved code snippets, uploaded documents, and mock interview reports."
    );
    if (!confirmation) return;

    const doubleConfirmation = window.prompt(
      'To confirm deletion, please type "DELETE" below:'
    );
    if (doubleConfirmation !== 'DELETE') {
      alert('Account deletion cancelled (incorrect confirmation text).');
      return;
    }

    try {
      await deleteAccount();
      alert('Your account has been successfully deleted. Thank you for using Phoenix.');
    } catch (err) {
      alert(`Failed to delete account: ${err.message}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setDashboardStatus({ success: '', error: '' });
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setDashboardStatus({ success: '', error: 'All password fields are required.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setDashboardStatus({ success: '', error: 'New passwords do not match.' });
      return;
    }
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setDashboardStatus({ success: 'Password changed successfully!', error: '' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setDashboardStatus({ success: '', error: err.message });
    }
  };

  // Subscriptions management sandbox
  const handleSubscribe = async (e) => {
    e.preventDefault();
    setBillingError('');
    setBillingMessage('');

    try {
      const res = await fetch(`${API_URL}/billing/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planName: billingPlan,
          cardHolderName: billingForm.cardHolderName,
          cardNumber: billingForm.cardNumber
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingMessage(data.message);
        updatePlan(data.user);
        loadTransactions();
      } else {
        setBillingError(data.error);
      }
    } catch (err) {
      setBillingError(err.message);
    }
  };

  const handleCancelSub = async () => {
    if (!confirm('Are you sure you want to cancel your Premium subscription?')) return;
    try {
      const res = await fetch(`${API_URL}/billing/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        updatePlan(data.user);
        loadTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/billing/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Benchmarking runner
  const handleRunBenchmark = async () => {
    if (!benchmarkPrompt.trim()) return alert('Please enter a benchmark prompt.');
    setIsBenchmarking(true);
    setBenchmarkResults(null);
    try {
      const res = await fetch(`${API_URL}/chat/benchmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: benchmarkPrompt, models: [modelA, modelB] })
      });
      const data = await res.json();
      if (res.ok) {
        setBenchmarkResults(data);
      } else {
        alert(data.error || 'Failed to complete benchmark comparison');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsBenchmarking(false);
    }
  };

  // Admin dashboard metrics
  const loadAdminStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAdminStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteAdminQuery = async () => {
    setAdminQueryError('');
    setAdminQueryOutput(null);
    try {
      const res = await fetch(`${API_URL}/admin/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sql: adminQuery })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminQueryOutput(data);
      } else {
        setAdminQueryError(data.error);
      }
    } catch (err) {
      setAdminQueryError(err.message);
    }
  };

  // Drawing dynamic visual graph to Canvas on dashboard load
  const canvasRef = useRef(null);
  useEffect(() => {
    if (activeTab === 'analytics' && adminStats && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 500, 300);
      
      // Paint grid background
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const y = 30 + i * 40;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(450, y);
        ctx.stroke();
      }

      const trends = adminStats.activity_trends || [];
      if (trends.length > 0) {
        const maxVal = Math.max(...trends.map(t => parseInt(t.count || t.count)), 5);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();

        trends.forEach((t, index) => {
          const x = 70 + index * (350 / Math.max(trends.length - 1, 1));
          const y = 230 - (parseInt(t.count || t.count) / maxVal) * 180;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          
          // Draw dot
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText('Conversations Activity Timeline (Trends)', 50, 15);
      }
    }
  }, [adminStats, activeTab]);


  const renderQuestionCardContent = (qText) => {
    if (!qText) return null;
    const isMcq = qText.toLowerCase().includes('mcq') || qText.includes('A)') || qText.includes('A\n') || qText.includes('A.');
    
    if (isMcq) {
      const parts = qText.split(/\\n|\n/);
      const questionTitle = parts[0];
      const options = parts.slice(1).filter(p => p.trim().length > 0);
      
      if (options.length > 0) {
        return (
          <div>
            <h4 style={{ marginBottom: '1.25rem', lineHeight: '1.5' }}>{questionTitle}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
              {options.map((opt, oIdx) => {
                const matchLetter = opt.match(/^\s*([A-D])\)/) || opt.match(/^\s*([A-D])\./) || opt.match(/^\s*([A-D])\s/);
                const letter = matchLetter ? matchLetter[1] : '';
                const isSelected = (interviewAnswers[currentQuestionIndex] || '').trim().startsWith(letter) && letter;
                
                return (
                  <button
                    key={oIdx}
                    type="button"
                    className="nav-item"
                    style={{
                      background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--glass-border)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      padding: '0.75rem 1rem',
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      cursor: 'pointer',
                      borderRadius: '8px'
                    }}
                    onClick={() => {
                      if (letter) {
                        setInterviewAnswers(prev => {
                          const updated = [...prev];
                          updated[currentQuestionIndex] = `${letter}) Option Selected: ${opt.trim()}`;
                          return updated;
                        });
                      } else {
                        setInterviewAnswers(prev => {
                          const updated = [...prev];
                          updated[currentQuestionIndex] = opt.trim();
                          return updated;
                        });
                      }
                    }}
                  >
                    {opt.trim()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
    }
    
    return <h4 style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{qText}</h4>;
  };


  // Rendering Auth View
  if (authLoading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center' }}>
          <div className="auth-logo">PHOENIX</div>
          <p className="auth-subtitle">Initializing Security Layer...</p>
        </div>
      </div>
    );
  }

  if (unverifiedEmail) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">Verify Gmail</div>
            <p className="auth-subtitle">We have sent a 6-digit activation code to <strong>{unverifiedEmail}</strong>.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              💡 Enter the activation code to verify your account.
            </p>
          </div>
          <form onSubmit={handleVerifySubmit}>
            <div className="form-group">
              <label className="form-label">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                className="form-input"
                required
                placeholder="123456"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
              />
            </div>
            {verificationError && <div className="badge-alert" style={{ marginBottom: '1rem' }}>{verificationError}</div>}
            <button type="submit" className="btn-primary">Verify & Log In</button>
          </form>
          <div className="auth-toggle">
            <button className="auth-toggle-btn" onClick={logout}>Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">Phoenix AI</div>
            <div className="auth-subtitle">Smart Student Workspace & Coding Sandbox</div>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {!isLoginMode && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Enter Username"
                  value={authForm.username}
                  onChange={e => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                required
                placeholder="Enter Email"
                value={authForm.email}
                onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  type={showAuthPassword ? "text" : "password"}
                  className="form-input"
                  required
                  placeholder="Enter Password"
                  value={authForm.password}
                  onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                >
                  {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLoginMode && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    type={showConfirmAuthPassword ? "text" : "password"}
                    className="form-input"
                    required
                    placeholder="Confirm Password"
                    value={authForm.confirmPassword}
                    onChange={e => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmAuthPassword(!showConfirmAuthPassword)}
                  >
                    {showConfirmAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isLoginMode && (
              <div className="form-group">
                <label className="form-label">Select Workspace Role</label>
                <select
                  className="form-input form-select"
                  value={authForm.role}
                  onChange={e => setAuthForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="Student">Student (General Access)</option>
                  <option value="Admin">Administrator (Stats & SQL access)</option>
                </select>
              </div>
            )}

            {authError && <div className="badge-alert" style={{ marginBottom: '1rem' }}>{authError}</div>}

            <button type="submit" className="btn-primary">
              {isLoginMode ? 'Login' : 'Register Account'}
            </button>
          </form>

          <div className="auth-toggle">
            {isLoginMode ? "Don't have an account?" : "Already registered?"}
            <button className="auth-toggle-btn" onClick={() => {
              setIsLoginMode(!isLoginMode);
              setAuthForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
              setAuthError('');
              setShowAuthPassword(false);
              setShowConfirmAuthPassword(false);
            }}>
              {isLoginMode ? 'Sign up' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rendering Dashboard Shell
  return (
    <div className="app-container">
      {/* Sidebar Mobile Overlay Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Sidebar Panel */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">Phoenix AI</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user.plan === 'Free' && (
              <span className="plan-pill" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>Free</span>
            )}
            {user.plan === 'Premium' && (
              <span className="plan-pill">Premium</span>
            )}
            <button className="sidebar-close-btn-mobile" onClick={() => setSidebarOpen(false)} title="Close Menu">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global Navigation links */}
        <div className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => { setActiveTab('chat'); setSidebarOpen(false); }}>
            <MessageSquare size={18} />
            <span>AI RAG Chat</span>
          </div>
          <div className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`} onClick={() => { setActiveTab('playground'); setSidebarOpen(false); }}>
            <Code2 size={18} />
            <span>Coding Playground</span>
          </div>
          <div className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`} onClick={() => { setActiveTab('voice'); setSidebarOpen(false); }}>
            <Mic size={18} />
            <span>Voice Mentor</span>
          </div>
          <div className={`nav-item ${activeTab === 'interview' ? 'active' : ''}`} onClick={() => { setActiveTab('interview'); setSidebarOpen(false); }}>
            <GraduationCap size={18} />
            <span>Mock Interviews</span>
          </div>
          <div className={`nav-item ${activeTab === 'benchmark' ? 'active' : ''}`} onClick={() => { setActiveTab('benchmark'); setSidebarOpen(false); }}>
            <Sparkles size={18} />
            <span>Models Benchmark</span>
          </div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}>
            <User size={18} />
            <span>My Profile</span>
          </div>
          <div className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSidebarOpen(false); }}>
            <CreditCard size={18} />
            <span>Subscription Hub</span>
          </div>
          {user.role === 'Admin' && (
            <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}>
              <BarChart3 size={18} />
              <span>Admin Analytics</span>
            </div>
          )}
        </div>

        {/* Sidebar History list for Chat tab */}
        {activeTab === 'chat' && (
          <div className="sidebar-history">
            <div className="history-title-row">
              <span>Chat Sessions</span>
              <button 
                onClick={() => { createConversation('New Conversation', selectedModel); setSidebarOpen(false); }} 
                className="chat-action-btn"
                style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--primary-gradient)', color: '#fff', border: 'none', borderRadius: '4px' }}
              >
                + NEW
              </button>
            </div>
            
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search chats..."
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', paddingRight: '1rem', fontSize: '0.8rem', height: '32px' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {loadingConversations ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading history...</p>
            ) : conversations.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No conversations found</p>
            ) : (
              conversations.map(c => (
                <div
                  key={c.id}
                  className={`history-item ${activeConversation?.id === c.id ? 'active' : ''}`}
                  onClick={() => { selectConversation(c); setSidebarOpen(false); }}
                >
                  <div className="history-details">
                    <span className="history-name">{c.title}</span>
                    <span className="history-time">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    className="history-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sidebar footer badge */}
        <div className="sidebar-footer">
          <div className="user-badge">
            <span className="user-name">{user.username}</span>
            <div className="user-role-row">
              <span className={`role-pill ${user.role.toLowerCase()}`}>{user.role}</span>
              <span className="plan-pill">{user.plan}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main viewport */}
      <div className="main-viewport">
        {/* Header bar */}
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)} title="Open Menu">
              <Menu size={20} />
            </button>
            <h2 className="panel-title">
              {activeTab === 'chat' && 'AI Chat & RAG Knowledge Tutor'}
              {activeTab === 'playground' && 'AI Coding Playground'}
              {activeTab === 'voice' && 'AI Voice Coding Mentor'}
              {activeTab === 'interview' && 'AI Interview Preparation Platform'}
              {activeTab === 'benchmark' && 'AI Models Benchmarking'}
              {activeTab === 'profile' && 'My Personal Dashboard'}
              {activeTab === 'billing' && 'Billing & Subscription Sandbox'}
              {activeTab === 'analytics' && 'Platform Analytics & SQL Reporting'}
            </h2>
          </div>

          {activeTab === 'chat' && (
            <div className="flex-row-gap" style={{ alignItems: 'center' }}>
              <label className="align-center" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRAGMode}
                  onChange={e => setIsRAGMode(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Enable PDF context (RAG)
              </label>

              <select
                className="form-input"
                style={{ width: '180px', height: '36px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                value={selectedModel}
                onChange={handleModelChange}
              >
                <option value="Qwen/Qwen2.5-Coder-7B-Instruct">Qwen 2.5 Coder 7B (Free)</option>
                <option value="Qwen/Qwen2.5-7B-Instruct">Qwen 2.5 General 7B (Free)</option>
                <option value="meta-llama/Llama-3.2-3B-Instruct">Llama 3.2 Instruct (Premium)</option>
                <option value="meta-llama/Llama-3.3-70B-Instruct">Llama 3.3 Large 70B (Premium)</option>
                <option value="mistralai/Mistral-7B-Instruct-v0.3">Mistral 7B v0.3 (Premium)</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab content router */}
        <div className="panel-content">
          {/* TAB 1: CHAT & RAG */}
          {activeTab === 'chat' && (
            <div className="split-layout">
              <div className="main-chat-area">
                <div className="chat-frame">
                  <div className="chat-messages-container">
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                        <Sparkles size={48} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
                        <h3>Welcome to Phoenix AI Assistant</h3>
                        <p style={{ marginTop: '0.5rem' }}>Ask a programming question, or toggle PDF context to upload documents for RAG tutoring.</p>
                      </div>
                    ) : (
                      messages.map(m => (
                        <div key={m.id} className={`message-bubble-row ${m.role}`}>
                          <div className="message-bubble">
                            <div className="message-header">
                              <span>{m.role === 'user' ? 'Student' : 'Assistant'}</span>
                              {m.latency_ms > 0 && (
                                <span className="latency-indicator">{m.latency_ms} ms</span>
                              )}
                            </div>
                            <div className="message-content">
                              {m.role === 'user' ? (
                                <p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p>
                              ) : (
                                <MarkdownRenderer content={m.content} />
                              )}
                              
                              {/* RAG Source reference tags */}
                              {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                                <div className="sources-panel">
                                  <div className="sources-header">
                                    <FileText size={12} />
                                    <span>Retrieved Context Sources:</span>
                                    {m.confidence > 0 && (
                                      <span className="confidence-badge">Confidence: {m.confidence}%</span>
                                    )}
                                  </div>
                                  <div className="sources-list">
                                    {m.sources.map((s, sIdx) => (
                                      <span key={sIdx} className="source-tag" title={`Match Score: ${s.score}%`}>
                                        {s.filename} (Ch. {s.chunk_index}) - {s.score}%
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {sendingMessage && (
                      <div className="message-bubble-row assistant">
                        <div className="message-bubble">
                          <div className="message-header">Assistant</div>
                          <p style={{ color: 'var(--text-muted)' }}>Generating answer...</p>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleChatSend} className="chat-controls-row">
                    <textarea
                      placeholder={isRAGMode ? "Ask a question about your uploaded documents..." : "Type your coding question here..."}
                      className="chat-input-textarea"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChatSend(e);
                        }
                      }}
                    />
                    <button type="submit" className="chat-action-btn send" disabled={sendingMessage}>
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              </div>

              {/* RAG Sidebar Drawer */}
              {isRAGMode && (
                <div className="doc-manager-panel">
                  <h3>Document Tutor (RAG)</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Upload technical PDFs. The AI splits them into chunks and searches them to respond to your queries.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value)}
                    />
                  </div>

                  <div className="doc-upload-zone" onClick={() => document.getElementById('file-upload-input').click()}>
                    <Upload size={24} style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Click to upload PDFs</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Multi-file uploads supported</p>
                    <input
                      type="file"
                      id="file-upload-input"
                      multiple
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </div>

                  {isUploading && <p style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>Indexing files...</p>}

                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Indexed Files ({uploadedDocs.length})
                    </div>
                    <div className="doc-list">
                      {uploadedDocs.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No documents uploaded</p>
                      ) : (
                        uploadedDocs.map(d => (
                          <div
                            key={d.id}
                            className={`doc-item ${selectedDocId === d.id ? 'active' : ''}`}
                            style={{ cursor: 'pointer', borderLeft: selectedDocId === d.id ? '3px solid var(--accent-cyan)' : 'none' }}
                            onClick={() => setSelectedDocId(selectedDocId === d.id ? null : d.id)}
                          >
                            <div className="doc-icon-title">
                              <FileText size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                              <div style={{ overflow: 'hidden' }}>
                                <div className="doc-name" title={d.filename}>{d.filename}</div>
                                <div className="doc-meta">
                                  {d.category} • {Math.round(d.file_size / 1024)} KB
                                </div>
                              </div>
                            </div>
                            <button
                              className="history-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocDelete(d.id);
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Doc Stats */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                    <strong>Workspace Index Metrics:</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span>Size indexed:</span>
                      <span>{docStats.total_size_kb} KB</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Indexed Vector Chunks:</span>
                      <span>{docStats.total_chunks}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CODING PLAYGROUND */}
          {activeTab === 'playground' && (
            <div className="playground-grid">
              <div className="editor-pane">
                <div className="pane-header">
                  <div className="flex-row-gap" style={{ alignItems: 'center' }}>
                    <select
                      className="form-input"
                      style={{ width: '120px', height: '32px', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}
                      value={editorLang}
                      onChange={e => setEditorLang(e.target.value)}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                      <option value="php">PHP</option>
                      <option value="ruby">Ruby</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Snippet Title..."
                      className="form-input"
                      style={{ width: '180px', height: '32px', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}
                      value={snippetTitle}
                      onChange={e => setSnippetTitle(e.target.value)}
                    />

                    <button className="chat-action-btn" onClick={handleSaveSnippet} title="Save Snippet" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                      <Save size={16} />
                    </button>
                  </div>

                  <button
                    className="btn-primary align-center"
                    style={{ width: 'auto', padding: '0.35rem 1rem', fontSize: '0.85rem' }}
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                  >
                    <Play size={14} />
                    <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                  </button>
                </div>

                <div className="editor-viewport">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={editorLang === 'js' ? 'javascript' : editorLang}
                    value={editorCode}
                    onChange={val => setEditorCode(val)}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      automaticLayout: true
                    }}
                  />
                </div>
              </div>

              {/* Console & Debugger Right Pane */}
              <div className="console-pane">
                <div style={{ display: 'flex', flexDirection: 'column', height: '50%' }}>
                  <h4>Console Output</h4>
                  <div className={`console-box ${codeOutput.stderr ? 'error' : ''}`} style={{ marginTop: '0.5rem' }}>
                    {isRunningCode ? (
                      'Running compiler execution execution...'
                    ) : codeOutput.stdout || codeOutput.stderr ? (
                      <>
                        {codeOutput.stdout}
                        {codeOutput.stderr}
                      </>
                    ) : (
                      'Console is empty. Click RUN to compile/execute code.'
                    )}
                  </div>
                  {codeOutput.stderr && (
                    <button
                      className="btn-primary"
                      style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--accent-purple)' }}
                      onClick={handleExplainError}
                      disabled={isExplainingError}
                    >
                      {isExplainingError ? 'Analyzing error log...' : 'Ask AI to Explain Error'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', height: '50%', overflow: 'hidden' }}>
                  <h4>AI Compiler Explanation</h4>
                  <div className="explain-pane" style={{ marginTop: '0.5rem' }}>
                    {isExplainingError ? (
                      <p style={{ color: 'var(--text-muted)' }}>Debugging error log logs...</p>
                    ) : errorExplanation ? (
                      <MarkdownRenderer content={errorExplanation} />
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>AI explanation will output here after clicking Explain Error.</p>
                    )}
                  </div>
                </div>

                {/* Library of saved snippets */}
                <div style={{ height: '150px', display: 'flex', flexDirection: 'column' }}>
                  <strong>Saved Snippets Library ({savedSnippets.length})</strong>
                  <div className="doc-list" style={{ marginTop: '0.5rem', maxHeight: '110px' }}>
                    {savedSnippets.map(snip => (
                      <div
                        key={snip.id}
                        className="doc-item"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        <div
                          style={{ cursor: 'pointer', overflow: 'hidden', flexGrow: 1 }}
                          onClick={() => {
                            setEditorLang(snip.language);
                            setEditorCode(snip.code);
                          }}
                        >
                          <strong>{snip.title}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({snip.language})</span>
                        </div>
                        <button className="history-delete-btn" onClick={() => handleSnippetDelete(snip.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE MENTOR */}
          {activeTab === 'voice' && (
            <div style={{ maxWidth: '600px', margin: '2rem auto', width: '100%', textAlign: 'center' }}>
              <div className="question-card" style={{ padding: '3rem' }}>
                <Sparkles size={40} style={{ color: 'var(--accent-cyan)', marginBottom: '1.5rem' }} />
                <h3>AI Voice Coding Mentor</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                  Speak with the AI mentor. The system transcribes your words, queries Llama 3.2, and speaks the response out loud.
                </p>

                <div className={`voice-wave-container ${isVoiceActive ? 'listening' : ''}`} style={{ margin: '2rem 0' }}>
                  <div className="voice-wave-bar" />
                  <div className="voice-wave-bar" />
                  <div className="voice-wave-bar" />
                  <div className="voice-wave-bar" />
                  <div className="voice-wave-bar" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <button
                    onClick={toggleVoiceMode}
                    className="btn-primary"
                    style={{
                      width: 'auto',
                      padding: '0.75rem 2rem',
                      background: isVoiceActive ? 'var(--status-error)' : 'var(--primary-gradient)',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isVoiceActive ? <MicOff size={16} /> : <Mic size={16} />}
                    <span>{isVoiceActive ? 'Mute Mic' : 'Unmute Mic'}</span>
                  </button>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', minHeight: '80px', textAlign: 'left' }}>
                  <strong>Real-time Transcription:</strong>
                  <p style={{ marginTop: '0.5rem', color: isVoiceActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {voiceTranscript || 'Speech transcription will display here.'}
                  </p>
                </div>

                {voiceLatency > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '1rem' }}>
                    Mentor Response Latency: <strong>{voiceLatency} ms</strong>
                  </div>
                )}
              </div>

              {/* Voice history log */}
              <div style={{ textAlign: 'left', marginTop: '2rem' }}>
                <h4>Voice Interactions Transcript</h4>
                <div className="doc-list" style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {voiceLog.map((log, idx) => (
                    <div
                      key={idx}
                      className="doc-item"
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        background: log.role === 'user' ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                        borderLeft: log.role === 'user' ? '3px solid var(--accent-purple)' : '3px solid var(--accent-cyan)'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {log.role === 'user' ? 'You' : 'Mentor'}
                      </div>
                      <p style={{ marginTop: '0.2rem', fontSize: '0.85rem' }}>{log.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MOCK INTERVIEWS */}
          {activeTab === 'interview' && (
            <div className="interview-active-box">
              {/* STEP 1: Setup */}
              {interviewStep === 'setup' && (
                <div className="interview-guide-box">
                  <GraduationCap size={48} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
                  <h3>Mock Interview Preparation</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>
                    Select a topic and type. The AI generates 5 challenging mock questions, scores your answers, and compiles a performance report.
                  </p>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label className="form-label">Interview Topic</label>
                    <input
                      type="text"
                      className="form-input"
                      value={interviewTopic}
                      onChange={e => setInterviewTopic(e.target.value)}
                      placeholder="e.g. React, Python OOP, Database Joins"
                    />
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label className="form-label">Question Category Type</label>
                    <select
                      className="form-input form-select"
                      value={interviewType}
                      onChange={e => setInterviewType(e.target.value)}
                    >
                      <option value="technical">Technical Questions (Coding / Concepts)</option>
                      <option value="aptitude">Aptitude Questions (Logic / Mathematics)</option>
                    </select>
                  </div>

                  <button className="btn-primary" onClick={handleStartInterview} disabled={isGeneratingInterview}>
                    {isGeneratingInterview ? 'Generating interview...' : 'Start Interview'}
                  </button>
                </div>
              )}

              {/* STEP 2: Active Interview */}
              {interviewStep === 'active' && interviewQuestions.length > 0 && (
                <div className="interview-active-box">
                  <div className="question-card">
                    <div className="sidebar-logo" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      Question {currentQuestionIndex + 1} of 5
                    </div>
                    {renderQuestionCardContent(interviewQuestions[currentQuestionIndex])}
                  </div>

                  <div className="answer-card">
                    <label className="form-label">Your Answer</label>
                    <textarea
                      className="form-input"
                      rows={6}
                      style={{ fontFamily: 'inherit', fontSize: '0.95rem' }}
                      placeholder="Type your detailed response here..."
                      value={interviewAnswers[currentQuestionIndex] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setInterviewAnswers(prev => {
                          const updated = [...prev];
                          updated[currentQuestionIndex] = val;
                          return updated;
                        });
                      }}
                    />

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
                      <button
                        className={`btn-primary ${isInterviewVoiceActive ? 'dictation-active' : ''}`}
                        style={{
                          width: 'auto',
                          background: isInterviewVoiceActive ? 'var(--status-error)' : 'rgba(255,255,255,0.06)',
                          color: 'var(--text-primary)',
                          boxShadow: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 1.25rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: isInterviewVoiceActive ? 'none' : '1px solid var(--glass-border)'
                        }}
                        onClick={toggleInterviewVoice}
                      >
                        {isInterviewVoiceActive ? <MicOff size={14} /> : <Mic size={14} />}
                        <span>{isInterviewVoiceActive ? 'Stop Speaking' : 'Speak Answer'}</span>
                      </button>
                      {isInterviewVoiceActive && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite' }}>
                          Dictating response... Speak clearly.
                        </span>
                      )}
                    </div>

                    <div className="flex-row-gap" style={{ justifyContent: 'space-between', marginTop: '1.5rem' }}>
                      <button
                        className="btn-primary"
                        style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', boxShadow: 'none' }}
                        disabled={currentQuestionIndex === 0}
                        onClick={() => {
                          if (isInterviewVoiceActive) {
                            setIsInterviewVoiceActive(false);
                            interviewRecRef.current?.stop();
                          }
                          setCurrentQuestionIndex(prev => prev - 1);
                        }}
                      >
                        Previous Question
                      </button>

                      {currentQuestionIndex < 4 ? (
                        <button
                          className="btn-primary"
                          style={{ width: 'auto' }}
                          onClick={() => {
                            if (isInterviewVoiceActive) {
                              setIsInterviewVoiceActive(false);
                              interviewRecRef.current?.stop();
                            }
                            setCurrentQuestionIndex(prev => prev + 1);
                          }}
                        >
                          Next Question
                        </button>
                      ) : (
                        <button
                          className="btn-primary"
                          style={{ width: 'auto', background: 'var(--accent-purple)' }}
                          onClick={handleInterviewAnswerSubmit}
                          disabled={isEvaluatingInterview}
                        >
                          {isEvaluatingInterview ? 'Evaluating Answers...' : 'Submit Answers'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="progress-dots">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`progress-dot ${i === currentQuestionIndex ? 'active' : ''} ${interviewAnswers[i] ? 'completed' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Grading & Report */}
              {interviewStep === 'scoring' && interviewResult && (
                <div className="report-card">
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircle2 size={36} style={{ color: 'var(--status-success)', marginBottom: '0.5rem' }} />
                    <h3>Interview Feedback Report</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Topic: {interviewTopic} ({interviewType})</p>

                    <div className={`score-display-ring ${interviewResult.score >= 80 ? 'excellent' : interviewResult.score >= 50 ? 'average' : 'fail'}`}>
                      {interviewResult.score}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
                    {/* Detailed Question-by-Question Grading */}
                    {interviewResult.q1_feedback && (
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Question-by-Question Grades</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                              <span>Q1 (MCQ)</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{interviewResult.q1_score} / 20 pts</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{interviewResult.q1_feedback}</p>
                          </div>
                          <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                              <span>Q2 (MCQ)</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{interviewResult.q2_score} / 20 pts</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{interviewResult.q2_feedback}</p>
                          </div>
                          <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                              <span>Q3 (Concept)</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{interviewResult.q3_score} / 20 pts</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{interviewResult.q3_feedback}</p>
                          </div>
                          <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                              <span>Q4 (Concept)</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{interviewResult.q4_score} / 20 pts</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{interviewResult.q4_feedback}</p>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                              <span>Q5 (Coding/Problem)</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{interviewResult.q5_score} / 20 pts</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{interviewResult.q5_feedback}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 style={{ color: 'var(--status-success)' }}>Strengths</h4>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {interviewResult.strengths?.map((s, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ color: 'var(--status-warning)' }}>Weaknesses / Gaps</h4>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {interviewResult.weaknesses?.map((w, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{w}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ color: 'var(--accent-cyan)' }}>Suggestions for Improvement</h4>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {interviewResult.suggestions?.map((su, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{su}</li>
                        ))}
                      </ul>
                    </div>

                    {interviewResult.communication_feedback && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(6, 182, 212, 0.04)', borderLeft: '4px solid var(--accent-cyan)', borderRadius: '4px' }}>
                        <h4 style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Volume2 size={16} />
                          Speech & Communication Style Evaluation
                        </h4>
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', textAlign: 'left' }}>
                          {interviewResult.communication_feedback}
                        </p>
                      </div>
                    )}

                    {interviewResult.text_feedback && (
                      <div>
                        <h4>AI Recruiter Remarks</h4>
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                          {interviewResult.text_feedback}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex-row-gap" style={{ justifyContent: 'center', marginTop: '2.5rem' }}>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={handlePrintInterviewReport}>
                      Download PDF Report
                    </button>
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', boxShadow: 'none' }}
                      onClick={() => setInterviewStep('setup')}
                    >
                      Exit Interview Setup
                    </button>
                  </div>
                </div>
              )}

              {/* History index below setup */}
              {interviewStep === 'setup' && (
                <div style={{ marginTop: '3rem' }}>
                  <h4>Mock Interviews History ({interviewHistory.length})</h4>
                  <div className="doc-list" style={{ marginTop: '0.5rem' }}>
                    {interviewHistory.map(ih => (
                      <div
                        key={ih.id}
                        className="doc-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setInterviewTopic(ih.topic);
                          setInterviewType(ih.type);
                          setInterviewResult(ih.feedback);
                          setInterviewStep('scoring');
                        }}
                      >
                        <div className="doc-icon-title">
                          <CheckCircle2 size={16} style={{ color: ih.score >= 80 ? 'var(--status-success)' : 'var(--status-warning)' }} />
                          <div>
                            <strong>{ih.topic}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({ih.type})</span>
                            <div className="doc-meta">Graded: {new Date(ih.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800 }}>{ih.score}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MODEL BENCHMARKING */}
          {activeTab === 'benchmark' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
              <div className="benchmarking-header-card">
                <h4>LLM Output Benchmarking Sandbox</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Submit a prompt and compare how local models (Ollama) and web models (Hugging Face serverless) compare in content response quality and timing.
                </p>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="form-label">Model A</span>
                    <select className="form-input" style={{ width: '180px' }} value={modelA} onChange={e => setModelA(e.target.value)}>
                      <option value="Qwen/Qwen2.5-Coder-7B-Instruct">Qwen 2.5 Coder (Free)</option>
                      <option value="Qwen/Qwen2.5-7B-Instruct">Qwen 2.5 General (Free)</option>
                    </select>
                  </div>

                  <span style={{ marginTop: '1.5rem', fontWeight: 600 }}>VS</span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="form-label">Model B</span>
                    <select className="form-input" style={{ width: '220px' }} value={modelB} onChange={e => setModelB(e.target.value)}>
                      <option value="meta-llama/Llama-3.2-3B-Instruct">Llama 3.2 (Premium)</option>
                      <option value="meta-llama/Llama-3.3-70B-Instruct">Llama 3.3 (Premium)</option>
                      <option value="mistralai/Mistral-7B-Instruct-v0.3">Mistral 7B (Premium)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Benchmark Prompt</label>
                  <div className="flex-row-gap">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Write a quick bubble sort algorithm in Javascript."
                      value={benchmarkPrompt}
                      onChange={e => setBenchmarkPrompt(e.target.value)}
                    />
                    <button className="btn-primary" style={{ width: '150px' }} onClick={handleRunBenchmark} disabled={isBenchmarking}>
                      {isBenchmarking ? 'Comparing...' : 'Compare Models'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Benchmarking Comparison Results */}
              <div className="benchmark-compare-grid">
                <div className="benchmark-panel">
                  <strong>Model A: {modelA}</strong>
                  {benchmarkResults ? (
                    <>
                      <div className="benchmark-metrics-row">
                        <span>Latency: <strong>{benchmarkResults[0].latency_ms} ms</strong></span>
                        <span>Length: <strong>{benchmarkResults[0].char_count} chars</strong></span>
                      </div>
                      <div className="explain-pane" style={{ background: 'rgba(0,0,0,0.15)', flexGrow: 1, padding: '1rem', borderRadius: '8px', overflowY: 'auto' }}>
                        <MarkdownRenderer content={benchmarkResults[0].text} />
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>No run complete</div>
                  )}
                </div>

                <div className="benchmark-panel">
                  <strong>Model B: {modelB}</strong>
                  {benchmarkResults ? (
                    <>
                      <div className="benchmark-metrics-row">
                        <span>Latency: <strong>{benchmarkResults[1].latency_ms} ms</strong></span>
                        <span>Length: <strong>{benchmarkResults[1].char_count} chars</strong></span>
                      </div>
                      <div className="explain-pane" style={{ background: 'rgba(0,0,0,0.15)', flexGrow: 1, padding: '1rem', borderRadius: '8px', overflowY: 'auto' }}>
                        <MarkdownRenderer content={benchmarkResults[1].text} />
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>No run complete</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: USER PERSONAL DASHBOARD */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1, maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
              
              {/* Status notifications */}
              {dashboardStatus.success && (
                <div className="doc-item" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'var(--status-success)', color: 'var(--status-success)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} />
                  <span>{dashboardStatus.success}</span>
                </div>
              )}
              {dashboardStatus.error && (
                <div className="doc-item" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--status-error)', color: 'var(--status-error)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} />
                  <span>{dashboardStatus.error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Profile Card & Info */}
                <div className="question-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '50%', border: '3px solid var(--accent-cyan)', overflow: 'hidden', background: 'var(--bg-deep)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.profile_pic ? (
                      <img src={user.profile_pic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                        {user.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
                      </span>
                    )}
                    
                    {profilePicLoading && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Uploading...</span>
                      </div>
                    )}
                  </div>

                  {/* Profile Pic Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <label className="btn-primary align-center" style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', gap: '0.5rem' }}>
                      <Camera size={16} />
                      <span>{user.profile_pic ? 'Change Picture' : 'Upload Picture'}</span>
                      <input type="file" accept="image/*" onChange={handleProfilePicUpload} style={{ display: 'none' }} />
                    </label>
                    {user.profile_pic && (
                      <button 
                        onClick={handleDeleteProfilePic} 
                        className="btn-primary align-center" 
                        style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', border: '1px solid rgba(239, 68, 68, 0.25)', boxShadow: 'none', gap: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{user.username}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{user.email}</p>

                  <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Role</div>
                      <div style={{ fontWeight: '700', marginTop: '0.25rem', color: 'var(--text-primary)' }}>{user.role}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Plan Tier</div>
                      <div style={{ fontWeight: '700', marginTop: '0.25rem', color: 'var(--accent-cyan)' }}>{user.plan}</div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} style={{ width: '100%', marginTop: '1.5rem', textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Edit Username</label>
                      <div className="flex-row-gap">
                        <input
                          type="text"
                          className="form-input"
                          value={profileUsername}
                          onChange={e => setProfileUsername(e.target.value)}
                        />
                        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 1.25rem', height: '42px' }}>
                          Save
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Password modification & Stats card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* Account Actions / Password Form */}
                  <div className="question-card" style={{ padding: '2rem' }}>
                    <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Key size={16} style={{ color: 'var(--accent-purple)' }} />
                      Change Password
                    </h4>
                    
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Current Password</label>
                        <div className="password-wrapper">
                          <input
                            type={showOldPassword ? "text" : "password"}
                            className="form-input"
                            placeholder="••••••••"
                            value={passwordForm.oldPassword}
                            onChange={e => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                          >
                            {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">New Password</label>
                        <div className="password-wrapper">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            className="form-input"
                            placeholder="••••••••"
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Confirm New Password</label>
                        <div className="password-wrapper">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            className="form-input"
                            placeholder="••••••••"
                            value={passwordForm.confirmPassword}
                            onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="btn-primary" style={{ background: 'var(--primary-gradient)', marginTop: '0.5rem' }}>
                        Update Password
                      </button>
                    </form>
                  </div>

                  {/* Personal stats card */}
                  <div className="question-card" style={{ padding: '2rem' }}>
                    <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BarChart3 size={16} style={{ color: 'var(--accent-cyan)' }} />
                      My Account Statistics
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                          <span>Daily Query Quota</span>
                          <span>{user.plan === 'Premium' || user.role === 'Admin' ? 'Unlimited (Premium)' : `${user.daily_query_count} / 10 used`}</span>
                        </div>
                        {user.plan !== 'Premium' && user.role !== 'Admin' && (
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(user.daily_query_count * 10, 100)}%`, height: '100%', background: 'var(--accent-cyan)' }} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>{savedSnippets.length}</span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Snippets</p>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>{uploadedDocs.length}</span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Documents</p>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>{interviewHistory.length}</span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase' }}>Interviews</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button onClick={logout} className="btn-primary align-center" style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', boxShadow: 'none', gap: '0.5rem' }}>
                          <LogOut size={16} />
                          <span>Log Out</span>
                        </button>
                        {user.email !== 'sricharanpranav1@gmail.com' && (
                          <button onClick={handleDeleteAccount} className="btn-primary align-center" style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', border: '1px solid rgba(239, 68, 68, 0.25)', boxShadow: 'none', gap: '0.5rem' }}>
                            <Trash2 size={16} />
                            <span>Delete Account</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Role Switcher & Admin Request Panel */}
              <div className="question-card" style={{ padding: '2rem' }}>
                <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--accent-cyan)' }} />
                  Role Management & Admin Privileges
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Your current active role is <strong style={{ color: 'var(--accent-cyan)' }}>{user.role}</strong>.
                  </div>

                  {/* Switch Role Options */}
                  {(user.email === 'sricharanpranav1@gmail.com' || user.admin_request_status === 'Approved') ? (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleSwitchRole('Student')}
                        className="btn-primary" 
                        style={{ 
                          width: 'auto', 
                          background: user.role === 'Student' ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)', 
                          color: 'var(--text-primary)', 
                          border: user.role === 'Student' ? 'none' : '1px solid var(--glass-border)' 
                        }}
                      >
                        Switch to Student Role
                      </button>
                      <button 
                        onClick={() => handleSwitchRole('Admin')}
                        className="btn-primary" 
                        style={{ 
                          width: 'auto', 
                          background: user.role === 'Admin' ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)', 
                          color: 'var(--text-primary)', 
                          border: user.role === 'Admin' ? 'none' : '1px solid var(--glass-border)' 
                        }}
                      >
                        Switch to Admin Role
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.5rem' }}>
                      {user.admin_request_status === 'Pending' ? (
                        <div style={{ padding: '1rem', background: 'rgba(251,191,36,0.1)', borderColor: 'var(--accent-cyan)', color: '#fbbf24', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.25)', fontSize: '0.9rem' }}>
                          Your request for Admin access is pending approval from the platform owner (sricharanpranav1@gmail.com).
                        </div>
                      ) : user.admin_request_status === 'Rejected' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderColor: 'var(--status-error)', color: 'var(--status-error)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.9rem' }}>
                            Your previous request for Admin access was rejected by the owner.
                          </div>
                          <button onClick={handleRequestAdminAccess} className="btn-primary" style={{ width: 'auto' }}>
                            Request Admin Access Again
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            You are logged in as a Student. To unlock platform analytics, SQL reporting, and user administration panel, you must request Admin privileges.
                          </p>
                          <button onClick={handleRequestAdminAccess} className="btn-primary" style={{ width: 'auto' }}>
                            Request Admin Access from Owner
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Approvals Dashboard (Only visible to the owner sricharanpranav1@gmail.com) */}
              {user.email === 'sricharanpranav1@gmail.com' && (
                <div className="question-card" style={{ padding: '2rem' }}>
                  <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={16} style={{ color: 'var(--accent-purple)' }} />
                    Pending Admin Approvals
                  </h4>
                  {loadingAdminRequests ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading requests...</div>
                  ) : adminRequests.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending admin requests.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {adminRequests.map(req => (
                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{req.username}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.email} • Plan: {req.plan}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                              onClick={() => handleApproveAdmin(req.id)}
                              className="btn-primary" 
                              style={{ width: 'auto', padding: '0.4rem 1rem', background: 'var(--status-success)', color: '#fff', fontSize: '0.8rem' }}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectAdmin(req.id)}
                              className="btn-primary" 
                              style={{ width: 'auto', padding: '0.4rem 1rem', background: 'var(--status-error)', color: '#fff', fontSize: '0.8rem' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 6: SUBSCRIPTIONS BILLING */}
          {activeTab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1 }}>
              <div className="billing-grid">
                {/* Plan 1: Free */}
                <div className="plan-card">
                  <div>
                    <h4>Free Account Plan</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Default signup tier</p>
                    <div className="plan-price">$0</div>
                    <div className="plan-features">
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Max 10 messages query limit / day</div>
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Standard RAG PDF processing</div>
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Local compiler sandbox access</div>
                    </div>
                  </div>
                  {user.plan === 'Free' ? (
                    <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', boxShadow: 'none' }} disabled>
                      Current Plan
                    </button>
                  ) : (
                    <button className="btn-primary" style={{ background: 'var(--status-error)' }} onClick={handleCancelSub}>
                      Downgrade to Free
                    </button>
                  )}
                </div>

                {/* Plan 2: Premium */}
                <div className="plan-card premium">
                  <div>
                    <span className="plan-pill" style={{ position: 'absolute', top: '15px', right: '15px' }}>Popular</span>
                    <h4>Premium Plan (Developer Sandbox)</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>For active students and debuggers</p>
                    <div className="plan-price">$29.99<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/mo</span></div>
                    <div className="plan-features">
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Unlimited AI chat queries</div>
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Priority RAG text embedding queue</div>
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Compare models concurrently</div>
                      <div className="align-center"><CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} /> Mock interview evaluators</div>
                    </div>
                  </div>

                  {user.plan === 'Premium' ? (
                    <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', boxShadow: 'none' }} disabled>
                      Active Subscriber
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button className="btn-primary" onClick={() => setBillingStep('checkout')}>
                        Upgrade Plan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Transactions List */}
              <div style={{ marginTop: '2rem' }}>
                <h4>Receipts and Invoices</h4>
                <div className="doc-list" style={{ marginTop: '0.5rem' }}>
                  {transactions.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No billing invoices found.</p>
                  ) : (
                    transactions.map(t => (
                      <div key={t.id} className="doc-item">
                        <div className="doc-icon-title">
                          <CreditCard size={16} style={{ color: t.status === 'succeeded' ? 'var(--status-success)' : 'var(--status-error)' }} />
                          <div>
                            <strong>{t.plan_name} Upgrade</strong>
                            <div className="doc-meta">ID: {t.invoice_id} • {new Date(t.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 700, color: t.status === 'succeeded' ? 'var(--status-success)' : 'var(--status-error)' }}>
                            ${t.amount} {t.currency}
                          </span>
                          <button
                            onClick={() => {
                              alert(`INVOICE RECEIPT\n-----------------\nInvoice ID: ${t.invoice_id}\nDate: ${new Date(t.createdAt).toLocaleString()}\nAmount Paid: $${t.amount} USD\nPlan: ${t.plan_name}\nStatus: ${t.status.toUpperCase()}\n\nThank you for choosing Phoenix AI Learning Assistant!`);
                            }}
                            className="btn-primary"
                            style={{ fontSize: '0.75rem', padding: '2px 8px', width: 'auto', height: 'auto', background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid var(--glass-border)', boxShadow: 'none' }}
                          >
                            Receipt
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ADMIN ANALYTICS */}
          {activeTab === 'analytics' && user.role === 'Admin' && adminStats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div>
                    <span className="stat-lbl">Total Users</span>
                    <div className="stat-val">{adminStats.metrics.total_users}</div>
                  </div>
                  <Sparkles size={24} style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <div className="stat-card">
                  <div>
                    <span className="stat-lbl">Premium Users</span>
                    <div className="stat-val">{adminStats.metrics.premium_users}</div>
                  </div>
                  <CreditCard size={24} style={{ color: 'var(--accent-purple)' }} />
                </div>
                <div className="stat-card">
                  <div>
                    <span className="stat-lbl">Total Chats</span>
                    <div className="stat-val">{adminStats.metrics.total_conversations}</div>
                  </div>
                  <MessageSquare size={24} style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div className="stat-card">
                  <div>
                    <span className="stat-lbl">Average Latency</span>
                    <div className="stat-val">{adminStats.metrics.average_latency_ms} ms</div>
                  </div>
                  <Sparkles size={24} style={{ color: 'var(--status-success)' }} />
                </div>
              </div>

              {/* canvas plot and SQL runner */}
              <div className="dashboard-details-row">
                <div className="details-card">
                  <h4>Conversations Ingestion Trends</h4>
                  <canvas ref={canvasRef} width={450} height={250} style={{ width: '100%', height: '220px', marginTop: '1rem', background: '#090d16', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                </div>

                <div className="details-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4>Admin SQL Query Shell</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Execute direct SELECT query reports against PostgreSQL schemas (Users, Conversations, Messages, Documents, Snippets, Transactions).
                  </p>

                  <textarea
                    className="form-input"
                    rows={4}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    value={adminQuery}
                    onChange={e => setAdminQuery(e.target.value)}
                  />

                  <div className="flex-row-gap">
                    <button className="btn-primary" style={{ width: '150px' }} onClick={handleExecuteAdminQuery}>
                      Execute SQL
                    </button>
                    {adminQueryOutput && (
                      <button
                        className="btn-primary"
                        style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', boxShadow: 'none' }}
                        onClick={() => {
                          const headers = Object.keys(adminQueryOutput.rows[0] || {});
                          const csvRows = [headers.join(',')];
                          adminQueryOutput.rows.forEach(row => {
                            const values = headers.map(h => {
                              const val = row[h];
                              return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
                            });
                            csvRows.push(values.join(','));
                          });
                          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = 'sql_report.csv';
                          link.click();
                        }}
                      >
                        Export CSV
                      </button>
                    )}
                  </div>

                  {adminQueryError && (
                    <div className="badge-alert">{adminQueryError}</div>
                  )}

                  {adminQueryOutput && (
                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '120px', background: '#000', padding: '0.5rem', borderRadius: '8px' }}>
                      <table className="analytics-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            {Object.keys(adminQueryOutput.rows[0] || {}).map(h => (
                              <th key={h} style={{ fontSize: '10px', padding: '4px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {adminQueryOutput.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {Object.keys(row).map((k, kIdx) => (
                                <td key={kIdx} style={{ fontSize: '10px', padding: '4px' }}>{JSON.stringify(row[k])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Lists of popular items */}
              <div className="dashboard-details-row">
                <div className="details-card">
                  <h4>Popular Topics & Prompts</h4>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Topic Name</th>
                        <th>Chats Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.popular_topics?.map((topic, idx) => (
                        <tr key={idx}>
                          <td>{topic.title}</td>
                          <td>{topic.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="details-card">
                  <h4>Model Usage Breakdowns</h4>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>AI Model Identifier</th>
                        <th>Usage Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.model_usage?.map((modelItem, idx) => (
                        <tr key={idx}>
                          <td>{modelItem.model}</td>
                          <td>{modelItem.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Subscriptions Card Sandbox Form */}
      {activeTab === 'billing' && billingStep === 'checkout' && (
        <div className="modal-overlay" onClick={() => setBillingStep('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Enter Payment Credentials</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Sandbox Card payment processing. Enter any mock values. Use a card number starting with <strong>4000</strong> to test payment errors.
            </p>

            <form onSubmit={handleSubscribe}>
              <div className="form-group">
                <label className="form-label">Card Holder Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. John Doe"
                  value={billingForm.cardHolderName}
                  onChange={e => setBillingForm(prev => ({ ...prev, cardHolderName: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Test Card Number</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  maxLength={16}
                  placeholder="4111 2222 3333 4444"
                  value={billingForm.cardNumber}
                  onChange={e => setBillingForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                />
              </div>

              <div className="flex-row-gap">
                <div className="form-group">
                  <label className="form-label">Expiry</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="MM/YY"
                    value={billingForm.expiry}
                    onChange={e => setBillingForm(prev => ({ ...prev, expiry: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CVV</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    maxLength={3}
                    placeholder="123"
                    value={billingForm.cvv}
                    onChange={e => setBillingForm(prev => ({ ...prev, cvv: e.target.value }))}
                  />
                </div>
              </div>

              {billingError && <div className="badge-alert" style={{ marginBottom: '1rem' }}>{billingError}</div>}
              {billingMessage && <div style={{ color: 'var(--status-success)', fontSize: '0.85rem', marginBottom: '1rem' }}>{billingMessage}</div>}

              <div className="flex-row-gap" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn-primary">
                  Charge Upgrade ($29.99)
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', boxShadow: 'none' }}
                  onClick={() => setBillingStep('none')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

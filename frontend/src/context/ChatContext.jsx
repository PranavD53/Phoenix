import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ChatProvider = ({ children }) => {
  const { token, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('Qwen/Qwen2.5-Coder-7B-Instruct');

  useEffect(() => {
    if (token) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
    }
  }, [token, searchQuery]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const url = searchQuery 
        ? `${API_URL}/chat?search=${encodeURIComponent(searchQuery)}`
        : `${API_URL}/chat`;
        
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`${API_URL}/chat/${convId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversation(data.conversation);
        setSelectedModel(data.conversation.model || 'Qwen/Qwen2.5-Coder-7B-Instruct');
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const selectConversation = (conv) => {
    if (!conv) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }
    loadMessages(conv.id);
  };

  const createConversation = async (title, modelName = 'Qwen/Qwen2.5-Coder-7B-Instruct') => {
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, model: modelName })
      });
      const data = await res.json();
      if (res.ok) {
        setConversations(prev => [data, ...prev]);
        setActiveConversation(data);
        setSelectedModel(data.model || 'Qwen/Qwen2.5-Coder-7B-Instruct');
        setMessages([]);
        return data;
      } else {
        throw new Error(data.error || 'Failed to create chat');
      }
    } catch (err) {
      console.error('Create conversation error:', err);
      throw err;
    }
  };

  const deleteConversation = async (id) => {
    try {
      const res = await fetch(`${API_URL}/chat/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversation && activeConversation.id === id) {
          setActiveConversation(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  };

  const sendMessage = async (content, mode = 'chat', activeDocId = null, conversationIdOverride = null) => {
    const targetConvId = conversationIdOverride || (activeConversation ? activeConversation.id : null);
    if (!targetConvId) return;
    
    try {
      setSendingMessage(true);
      
      // Optimistic user message update
      const tempUserMsg = { id: Date.now(), role: 'user', content, createdAt: new Date() };
      setMessages(prev => [...prev, tempUserMsg]);

      const res = await fetch(`${API_URL}/chat/${targetConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          modelOverride: selectedModel,
          mode,
          activeDocId
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Replace user message with db recorded version and append assistant message
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, data.userMessage, data.assistantMessage];
        });
        
        // Refresh conversations list to update order/dates
        loadConversations();
        return data;
      } else {
        // Remove optimistic message if request failed
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Send message error:', err);
      throw err;
    } finally {
      setSendingMessage(false);
    }
  };

  const value = {
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
    sendMessage,
    loadConversations
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);

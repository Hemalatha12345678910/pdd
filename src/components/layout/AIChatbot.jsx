import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../lib/supabase';
import { getBackendUrl } from '../../lib/config';
import './AIChatbot.css';

const SUGGESTIONS_DOCTOR = [
  "How do I interpret a periapical radiograph?",
  "What are signs of early caries?",
  "Treatment options for class II malocclusion?",
  "When to refer for periodontal surgery?",
];

const SUGGESTIONS_PATIENT = [
  "How often should I brush my teeth?",
  "Why do my gums bleed?",
  "What happens during a root canal?",
  "How can I whiten my teeth safely?",
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('patient');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setRole(user.user_metadata?.role || 'patient');
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const sendMessage = async (text) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg = { sender: 'user', text: msgText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const chatUrl = getBackendUrl().replace('/analyze', '/chat');
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          role,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });
      const data = await res.json();
      const botMsg = { sender: 'bot', text: data.reply || 'Sorry, no response.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: '⚠️ Could not connect to the AI server. Make sure the backend is running.', time: '' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  const suggestions = role === 'doctor' ? SUGGESTIONS_DOCTOR : SUGGESTIONS_PATIENT;

  return (
    <>
      {/* Floating Button */}
      <button
        className={`chatbot-fab ${isOpen ? 'fab-open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="SmileGuard AI Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        {!isOpen && <span className="fab-pulse" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-wrap">
                <Bot size={20} color="white" />
                <span className="chatbot-online-dot" />
              </div>
              <div>
                <div className="chatbot-title">SmileGuard AI</div>
                <div className="chatbot-subtitle">{role === 'doctor' ? 'Clinical Assistant' : 'Dental Health Assistant'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {messages.length > 0 && (
                <button className="chatbot-icon-btn" onClick={clearChat} title="Clear chat">
                  <Trash2 size={15} />
                </button>
              )}
              <button className="chatbot-icon-btn" onClick={() => setIsOpen(false)} title="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <div className="welcome-icon">🦷</div>
                <p className="welcome-title">Hi! I'm SmileGuard AI</p>
                <p className="welcome-sub">
                  {role === 'doctor'
                    ? 'Ask me anything about clinical dentistry, treatment planning, or diagnostics.'
                    : 'Ask me anything about your dental health — I\'m here to help!'}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg-row ${msg.sender}`}>
                <div className="msg-avatar">
                  {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="chatbot-bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  {msg.time && <div className="msg-time">{msg.time}</div>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-msg-row bot">
                <div className="msg-avatar"><Bot size={14} /></div>
                <div className="chatbot-bubble typing-bubble">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="chatbot-suggestions">
              {suggestions.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              placeholder="Ask me anything dental..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

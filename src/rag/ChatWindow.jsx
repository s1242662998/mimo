import { useState } from 'react';
import './ChatWindow.css';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI (GPT-4)' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'gemini', name: 'Google (Gemini)' },
  { id: 'local', name: 'Local (Ollama)' }
];

export default function ChatWindow({ onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: '你好！我是 RAG 助手，请问有什么可以帮你的？' }
  ]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState(PROVIDERS[0].id);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now(),
      role: 'user',
      content: input
    };

    setMessages([...messages, newMessage]);
    setInput('');

    // 模拟回复
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `这是来自 ${PROVIDERS.find(p => p.id === provider)?.name} 的模拟回复。`
      }]);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rag-chat-window">
      <div className="rag-chat-header">
        <div className="rag-chat-title">RAG 助手</div>
        <div className="rag-chat-controls">
          <select 
            value={provider} 
            onChange={(e) => setProvider(e.target.value)}
            className="rag-provider-select"
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="rag-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="rag-chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`rag-message ${msg.role}`}>
            <div className="rag-message-content">
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="rag-chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，按 Enter 发送..."
          rows={1}
        />
        <button onClick={handleSend} disabled={!input.trim()} className="rag-send-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

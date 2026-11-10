import { useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { Send, Bot, User, Key, Sparkles, Loader2 } from 'lucide-react';
import { DataVisualizer } from './DataVisualizer';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const ChatInterface: FC<{
  authToken: string;
  onTokenChange: (token: string) => void;
}> = ({ authToken, onTokenChange }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hello! I am the Highmark Agent Orchestrator connected via MCP. You can ask me to analyze claims, inspect provider performance, or query healthcare metrics.\n\n```json:table\n[\n  {\"feature\": \"Claims Analysis\", \"description\": \"Query recent claims & approvals\", \"status\": \"ACTIVE\"},\n  {\"feature\": \"Patient Metrics\", \"description\": \"Monthly inquiry volume & resolution rates\", \"status\": \"ACTIVE\"},\n  {\"feature\": \"Network Health\", \"description\": \"Hospital bed & telehealth utilization\", \"status\": \"ACTIVE\"}\n]\n```",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken.trim()) {
        headers['Authorization'] = `Bearer ${authToken.trim()}`;
      }

      const res = await fetch('/api/chat/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: text, token: authToken.trim() })
      });

      const data = await res.json();
      const assistantText = data.content || data.fallback || data.error || JSON.stringify(data);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ Network error communicating with Spring Boot Orchestrator: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex h-[720px] flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* OAuth Token Configuration Header */}
      <div className="border-b border-gray-100 bg-slate-50 px-5 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-gray-700">Agent Gateway OAuth 2.0 Bearer Token:</span>
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="password"
              placeholder="Paste Bearer token (leave blank to run in prototype mode)..."
              value={authToken}
              onChange={(e) => onTokenChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              authToken.trim()
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {authToken.trim() ? 'Token Configured' : 'Prototype Simulation Mode'}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-xl p-4 text-xs shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-gray-100 text-[10px] text-gray-400">
                <span className="font-semibold text-gray-500">
                  {msg.sender === 'user' ? 'You' : 'Agent Gateway Orchestrator'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {msg.sender === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              ) : (
                <DataVisualizer content={msg.text} />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Reasoning & executing tools over Agent Gateway...
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-2 flex items-center gap-2 overflow-x-auto">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <span className="text-[11px] font-medium text-gray-500 shrink-0">Suggestions:</span>
        <button
          onClick={() => sendMessage('Analyze recent claims and approval amounts')}
          className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:border-indigo-400 hover:text-indigo-600 shrink-0"
        >
          Claims Breakdown & Chart
        </button>
        <button
          onClick={() => sendMessage('Show monthly patient inquiry resolution metrics')}
          className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:border-indigo-400 hover:text-indigo-600 shrink-0"
        >
          Monthly Resolution KPI
        </button>
        <button
          onClick={() => sendMessage('Check hospital bed & telehealth capacity across network')}
          className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:border-indigo-400 hover:text-indigo-600 shrink-0"
        >
          Facility Capacity Table
        </button>
      </div>

      {/* Input Box */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask agent orchestrator about claims, metrics, or tools..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputPrompt.trim() || isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

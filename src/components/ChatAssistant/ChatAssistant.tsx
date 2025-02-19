
import React, { useState, useRef, useEffect } from 'react';
import ReactTextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, Send, User, Bot, Brain, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Theme {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
}

export interface ChatAssistantProps {
  sessionId: string;
  userId: string;
  theme?: Theme;
  onContactSupport?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  initialMessage?: string;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  reasoning?: string;
  timestamp: number;
}

const defaultTheme: Theme = {
  primary: '#007AFF',
  secondary: '#E5E7EB',
  background: '#FFFFFF',
  text: '#1F2937'
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  sessionId,
  userId,
  theme = defaultTheme,
  onContactSupport,
  position = 'bottom-right',
  initialMessage = "Hi! How can I help you today?"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: initialMessage,
          type: 'assistant',
          timestamp: Date.now()
        }
      ]);
    }
  }, [isOpen, initialMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const mockResponse = async (userMessage: string) => {
    setIsTyping(true);
    
    // First, show reasoning
    const reasoning = "Analyzing query → Understanding context → Formulating response";
    setMessages(prev => [...prev, {
      id: Date.now().toString() + '-reasoning',
      content: reasoning,
      type: 'assistant',
      reasoning: reasoning,
      timestamp: Date.now()
    }]);

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Then show the actual response
    const response = {
      content: `I understand your message about "${userMessage}". Let me help you with that.`
    };

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: response.content,
      type: 'assistant',
      timestamp: Date.now()
    }]);
    setIsTyping(false);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      type: 'user',
      timestamp: Date.now()
    } as Message;

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    await mockResponse(userMessage.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50',
        position === 'bottom-right' ? 'right-4 bottom-4' : 'left-4 bottom-4'
      )}
    >
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full',
          'bg-gradient-to-r from-blue-500 to-blue-600',
          'text-white shadow-lg hover:shadow-xl transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isOpen && 'scale-90'
        )}
      >
        <ChevronDown
          className={cn(
            'w-6 h-6 transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-20 w-96 max-w-[calc(100vw-2rem)]',
            'bg-white rounded-2xl shadow-2xl',
            'flex flex-col overflow-hidden',
            'border border-gray-200',
            'animate-in slide-in-from-bottom duration-300',
            position === 'bottom-right' ? 'right-0' : 'left-0'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-800">Chat Assistant</h3>
              <p className="text-sm text-gray-500">We typically reply instantly</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col',
                  message.type === 'user' && 'items-end'
                )}
              >
                <div
                  className={cn(
                    'flex items-start gap-2 max-w-[80%]',
                    message.type === 'user' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.type === 'user'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {message.type === 'user' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                  {message.reasoning ? (
                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4" />
                        <span className="font-medium">Thinking Process</span>
                      </div>
                      <div className="space-y-1">
                        {message.reasoning.split('→').map((step, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{index + 1}.</span>
                            <span>{step.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'rounded-2xl p-3',
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 animate-pulse">
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4 space-y-4">
            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Talk to a human instead →
              </button>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <ReactTextareaAutosize
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full resize-none rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
                  maxRows={4}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className={cn(
                  'p-3 rounded-xl transition-all duration-200',
                  inputValue.trim()
                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;

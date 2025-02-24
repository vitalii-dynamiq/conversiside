import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Plus, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatAssistantProps, Message, FileAttachment } from './types';
import { generateSessionId, formatRelativeTime } from './utils';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  sessionId: providedSessionId,
  userId,
  userMetadata = {},
  auth,
  apiEndpoint,
  streaming = { enabled: false },
  theme = {
    primary: '#007AFF',
    secondary: '#E5E7EB',
    background: '#FFFFFF',
    text: '#1F2937'
  },
  onContactSupport,
  position = 'bottom-right',
  initialMessage = "Hi! How can I help you today?",
  onNewSession,
  assistantName = "Chat Assistant",
  contactSupportUrl,
  contactSupportEmail
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedReasonings, setExpandedReasonings] = useState<string[]>([]);
  const [currentSessionId] = useState(() => providedSessionId || generateSessionId());
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!providedSessionId && onNewSession) {
      onNewSession(currentSessionId);
    }
  }, [providedSessionId, currentSessionId, onNewSession]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        content: initialMessage,
        type: 'assistant',
        timestamp: Date.now()
      }]);
    }
  }, [isOpen, messages.length, initialMessage]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  const handleDirectResponse = useCallback(async (messageId: string, response: Response) => {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.content || data.generatedText;
    const reasoning = data.reasoning;

    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { 
        ...msg, 
        content: content || msg.content,
        reasoning: reasoning || msg.reasoning
      } : msg
    ));
    setIsTyping(false);
  }, []);

  const handleStreamedResponse = useCallback(async (messageId: string, response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let currentContent = '';
    let currentReasoning = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (streaming.eventSource?.reasoningEvent && 
                parsed.event === streaming.eventSource.reasoningEvent) {
              currentReasoning = parsed.data || parsed.content;
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, reasoning: currentReasoning } : msg
              ));
            } else if (!streaming.eventSource?.messageEvent || 
                       parsed.event === streaming.eventSource.messageEvent) {
              const content = parsed.choices?.[0]?.delta?.content || 
                            parsed.choices?.[0]?.message?.content ||
                            parsed.content ||
                            parsed.data;
              
              if (content) {
                currentContent += content;
                setMessages(prev => prev.map(msg => 
                  msg.id === messageId ? { ...msg, content: currentContent } : msg
                ));
              }
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
      setIsTyping(false);
    }
  }, [streaming.eventSource]);

  const toggleReasoning = useCallback((messageId: string) => {
    setExpandedReasonings(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments: FileAttachment[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: file.type.startsWith('image/') ? 'image' : 'document',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const startNewConversation = useCallback(() => {
    const newSessionId = generateSessionId();
    if (onNewSession) {
      onNewSession(newSessionId);
    }
    setMessages([{
      id: Date.now().toString(),
      content: initialMessage,
      type: 'assistant',
      timestamp: Date.now()
    }]);
    setInputValue('');
    setIsTyping(false);
    setExpandedReasonings([]);
    setAttachments([]);
  }, [initialMessage, onNewSession]);

  const getAuthHeaders = useCallback(() => {
    if (!auth) return {};

    switch (auth.type) {
      case 'jwt':
      case 'bearer':
        return {
          Authorization: `Bearer ${auth.token}`
        };
      case 'oauth':
        if (auth.oauthConfig?.accessToken) {
          return {
            Authorization: `${auth.oauthConfig.tokenType || 'Bearer'} ${auth.oauthConfig.accessToken}`,
            ...(auth.oauthConfig.scope ? { 'X-OAuth-Scope': auth.oauthConfig.scope } : {})
          };
        }
        return {};
      default:
        return {};
    }
  }, [auth]);

  const sendMessage = useCallback(async (message: string, messageAttachments: FileAttachment[]) => {
    setIsTyping(true);
    const messageId = Date.now().toString();

    // Mock response for testing
    const mockAssistantMessage = {
      id: messageId,
      content: `I understand you're saying: "${message}"`,
      type: 'assistant' as const,
      reasoning: 'Analyzing input → Processing message context → Formulating appropriate response → Considering attachments if present → Generating final response → Considering attachments if present → Generating final response',
      timestamp: Date.now()
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setMessages(prev => [...prev, mockAssistantMessage]);
    setIsTyping(false);

    /* Comment out the actual API call for now
    try {
      const formData = new FormData();
      formData.append('message', message);
      messageAttachments.forEach(attachment => {
        formData.append('files[]', attachment.file);
      });

      const response = await fetch(apiEndpoint || '', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          ...(streaming.enabled ? { Accept: 'text/event-stream' } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (streaming.enabled) {
        await handleStreamedResponse(messageId, response);
      } else {
        await handleDirectResponse(messageId, response);
      }
    } catch (error) {
      console.error('Error in chat response:', error);
      setMessages(prev => [...prev, {
        id: messageId,
        content: 'Sorry, there was an error processing your request.',
        type: 'assistant',
        timestamp: Date.now()
      }]);
      setIsTyping(false);
    }
    */
  }, [getAuthHeaders, streaming.enabled, handleStreamedResponse, handleDirectResponse]);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const userMessageObj = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      type: 'user' as const,
      timestamp: Date.now(),
      attachments: [...attachments],
      metadata: {
        sessionId: currentSessionId,
        userId,
        userMetadata
      }
    };

    setMessages(prev => [...prev, userMessageObj]);
    setInputValue('');
    setAttachments([]);
    await sendMessage(userMessageObj.content, userMessageObj.attachments);
  }, [inputValue, attachments, currentSessionId, userId, userMetadata, sendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else if (contactSupportEmail) {
      window.location.href = `mailto:${contactSupportEmail}`;
    } else if (contactSupportUrl) {
      window.open(contactSupportUrl, '_blank');
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50',
        position === 'bottom-right' ? 'right-4 bottom-4' : 'left-4 bottom-4'
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full',
          'bg-[#635BFF] hover:bg-[#524FCC]',
          'text-white shadow-lg hover:shadow-xl transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2',
          isOpen && 'scale-90'
        )}
      >
        <MessageCircle className="w-7 h-7 stroke-[1.5]" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute bottom-20 w-[420px] max-w-[calc(100vw-2rem)]',
            'bg-white rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]',
            'flex flex-col h-[600px]',
            'border border-gray-100',
            'animate-in slide-in-from-bottom duration-300 overflow-hidden',
            position === 'bottom-right' ? 'right-0' : 'left-0'
          )}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-4">
              <h3 className="text-[15px] font-semibold text-gray-900">{assistantName}</h3>
              <button
                onClick={startNewConversation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50">
            <div className="p-6 space-y-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  expandedReasonings={expandedReasonings}
                  toggleReasoning={toggleReasoning}
                />
              ))}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bot className="w-4.5 h-4.5 text-gray-600 stroke-[1.5]" />
                  </div>
                  <div className="px-4 py-3 bg-white rounded-xl border border-gray-100/80 shadow-sm animate-pulse">
                    <span className="text-[14px] text-gray-600">Typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <ChatInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleKeyPress={handleKeyPress}
            handleSubmit={handleSubmit}
            attachments={attachments}
            removeAttachment={removeAttachment}
            fileInputRef={fileInputRef}
            inputRef={inputRef}
            handleFileSelect={handleFileSelect}
          />

          {(onContactSupport || contactSupportUrl || contactSupportEmail) && (
            <button
              onClick={handleContactSupport}
              className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Talk to a human instead →
            </button>
          )}

          <div className="text-[12px] text-center text-gray-400 pt-2 border-t border-gray-100 mt-2">
            <a
              href="https://getdynamiq.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors"
            >
              Powered by Dynamiq
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatAssistantProps, Message, FileAttachment } from './types';
import { generateSessionId } from './utils';
import { ChatInput } from './ChatInput';
import { Header } from './components/Header';
import { MessagesContainer } from './components/MessagesContainer';
import { Footer } from './components/Footer';

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
  contactSupportEmail,
  allowFileUpload = true,
  showThinkingProcess = true,
  showContactSupport = true
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
          <Header
            assistantName={assistantName}
            onNewChat={startNewConversation}
            onClose={() => setIsOpen(false)}
          />

          <MessagesContainer
            messages={messages}
            expandedReasonings={expandedReasonings}
            toggleReasoning={toggleReasoning}
            isTyping={isTyping}
            showThinkingProcess={showThinkingProcess}
            messagesEndRef={messagesEndRef}
          />

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
            allowFileUpload={allowFileUpload}
          />

          <Footer
            showContactSupport={showContactSupport}
            onContactSupport={onContactSupport}
            contactSupportUrl={contactSupportUrl}
            contactSupportEmail={contactSupportEmail}
          />
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;

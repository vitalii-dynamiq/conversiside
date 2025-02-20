import React, { useState, useRef, useEffect } from 'react';
import ReactTextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, User, Bot, Brain, X, Plus, ChevronRight, Paperclip, Image, FileText, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Theme {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
}

export interface UserMetadata {
  [key: string]: string | number | boolean;
}

export interface AuthConfig {
  type: 'oauth' | 'jwt';
  token?: string;
  oauthParams?: {
    [key: string]: string;
  };
}

export interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'document';
  previewUrl?: string;
}

interface StreamingConfig {
  enabled: boolean;
  eventSource?: {
    messageEvent?: string;
    reasoningEvent?: string;
  };
}

export interface ChatAssistantProps {
  sessionId?: string; // If not provided, will generate unique ID
  userId: string;
  userMetadata?: UserMetadata;
  auth?: AuthConfig;
  apiEndpoint?: string;
  streaming?: StreamingConfig;
  theme?: Theme;
  onContactSupport?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  initialMessage?: string;
  onNewSession?: (sessionId: string) => void;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  reasoning?: string;
  timestamp: number;
  attachments?: FileAttachment[];
  metadata?: {
    [key: string]: any;
  };
}

const defaultTheme: Theme = {
  primary: '#007AFF',
  secondary: '#E5E7EB',
  background: '#FFFFFF',
  text: '#1F2937'
};

const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  sessionId: providedSessionId,
  userId,
  userMetadata = {},
  auth,
  apiEndpoint,
  streaming = { enabled: false },
  theme = defaultTheme,
  onContactSupport,
  position = 'bottom-right',
  initialMessage = "Hi! How can I help you today?",
  onNewSession
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
    if (messages.length > 0) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };
      scrollToBottom();
    }
  }, [messages]);

  const toggleReasoning = (messageId: string) => {
    setExpandedReasonings(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const startNewConversation = () => {
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
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        console.warn('Unsupported file type:', file.type);
        continue;
      }

      const attachment: FileAttachment = {
        id: `${Date.now()}-${i}`,
        file,
        type: isImage ? 'image' : 'document'
      };

      if (isImage) {
        attachment.previewUrl = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === attachmentId);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter(a => a.id !== attachmentId);
    });
  };

  const handleStreamedResponse = async (messageId: string, response: Response) => {
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
          const data = line.slice(6); // Remove 'data: ' prefix
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
    }
  };

  const handleDirectResponse = async (messageId: string, response: Response) => {
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
  };

  const mockResponse = async (userMessage: string, messageAttachments: FileAttachment[]) => {
    if (!apiEndpoint) {
      const messageId = Date.now().toString();
      setIsTyping(true);

      // Add initial message for reasoning if streaming
      if (streaming.enabled) {
        setMessages(prev => [...prev, {
          id: messageId,
          content: '',
          type: 'assistant',
          reasoning: 'Processing...',
          timestamp: Date.now()
        }]);
      }

      try {
        const formData = new FormData();
        formData.append('message', userMessage);
        messageAttachments.forEach(attachment => {
          formData.append('files[]', attachment.file);
        });

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
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
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const userMessageObj = {
      id: Date.now().toString(),
      content: userMessage.trim(),
      type: 'user' as const,
      timestamp: Date.now(),
      attachments: [...messageAttachments],
      metadata: {
        sessionId: currentSessionId,
        userId,
        userMetadata
      }
    };

    setMessages(prev => [...prev, userMessageObj]);
    setInputValue('');
    setAttachments([]);
    await mockResponse(userMessageObj.content, userMessageObj.attachments);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    await mockResponse(inputValue.trim(), attachments);
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
        <MessageCircle className="w-7 h-7" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute bottom-20 w-96 max-w-[calc(100vw-2rem)]',
            'bg-white rounded-2xl shadow-2xl',
            'flex flex-col h-[32rem]',
            'border border-gray-200',
            'animate-in slide-in-from-bottom duration-300 overflow-hidden',
            position === 'bottom-right' ? 'right-0' : 'left-0'
          )}
          style={{ fontFamily: 'Inter, system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}
        >
          {/* Header - fixed height */}
          <div className="flex-none flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-gray-800">Chat Assistant</h3>
              <button
                onClick={startNewConversation}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages container - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-4">
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
                        <button
                          onClick={() => toggleReasoning(message.id)}
                          className="flex items-center gap-2 w-full"
                        >
                          <Brain className="w-4 h-4" />
                          <span className="font-medium">Thinking Process</span>
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 ml-auto transition-transform",
                              expandedReasonings.includes(message.id) && "rotate-90"
                            )}
                          />
                        </button>
                        {expandedReasonings.includes(message.id) && (
                          <div className="mt-2 space-y-1">
                            {message.reasoning.split('→').map((step, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{index + 1}.</span>
                                <span>{step.trim()}</span>
                              </div>
                            ))}
                          </div>
                        )}
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
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map(attachment => (
                        <div
                          key={attachment.id}
                          className={cn(
                            'rounded-lg overflow-hidden border border-gray-200',
                            attachment.type === 'image' ? 'max-w-[200px]' : 'p-3 bg-gray-50'
                          )}
                        >
                          {attachment.type === 'image' && attachment.previewUrl ? (
                            <img
                              src={attachment.previewUrl}
                              alt="Attached"
                              className="w-full h-auto"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <FileText className="w-5 h-5" />
                              <span className="text-sm truncate">
                                {attachment.file.name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
          </div>

          {/* Footer - fixed height */}
          <div className="flex-none border-t border-gray-100 p-4 space-y-4 bg-white">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                {attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="relative group flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200"
                  >
                    {attachment.type === 'image' ? (
                      <Image className="w-4 h-4 text-gray-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-600 max-w-[100px] truncate">
                      {attachment.file.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 bg-white rounded-full shadow-sm border border-gray-200"
                    >
                      <XCircle className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center">
                <ReactTextareaAutosize
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px] max-h-32"
                  maxRows={4}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() && attachments.length === 0}
                className={cn(
                  'p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center',
                  (inputValue.trim() || attachments.length > 0)
                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Talk to a human instead →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;

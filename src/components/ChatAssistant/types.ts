
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
  type: 'oauth' | 'jwt' | 'bearer';
  token?: string;
  oauthConfig?: {
    accessToken: string;
    tokenType?: string;
    scope?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface StreamingConfig {
  enabled: boolean;
  eventSource?: {
    messageEvent?: string;
    reasoningEvent?: string;
  };
}

export interface ChatAssistantProps {
  sessionId?: string;
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
  assistantName?: string;
  contactSupportUrl?: string;
  contactSupportEmail?: string;
}

export interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'document';
  previewUrl?: string;
}

export interface Message {
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

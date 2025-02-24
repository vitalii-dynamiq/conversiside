
import React from 'react';
import { Message } from '../types';
import { MessageBubble } from '../MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessagesContainerProps {
  messages: Message[];
  expandedReasonings: string[];
  toggleReasoning: (messageId: string) => void;
  isTyping: boolean;
  showThinkingProcess: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessagesContainer: React.FC<MessagesContainerProps> = ({
  messages,
  expandedReasonings,
  toggleReasoning,
  isTyping,
  showThinkingProcess,
  messagesEndRef,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50">
      <div className="p-6 space-y-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            expandedReasonings={showThinkingProcess ? expandedReasonings : []}
            toggleReasoning={toggleReasoning}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};


import React from 'react';
import { UserRound, Bot, ChevronDown, ChevronUp, FileText, Image } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Message, FileAttachment } from './types';
import { formatRelativeTime } from './utils';

interface MessageBubbleProps {
  message: Message;
  expandedReasonings: string[];
  toggleReasoning: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  expandedReasonings,
  toggleReasoning,
}) => {
  const reasoningSteps = message.reasoning ? message.reasoning.split('→').length : 0;
  const isExpanded = expandedReasonings.includes(message.id);

  return (
    <div
      className={cn(
        'flex flex-col',
        message.type === 'user' && 'items-end'
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3 max-w-[85%]',
          message.type === 'user' && 'flex-row-reverse'
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            message.type === 'user'
              ? 'bg-[#7E69AB] text-white'
              : 'bg-gray-100 text-gray-600'
          )}
        >
          {message.type === 'user' ? (
            <UserRound className="w-4.5 h-4.5 stroke-[1.5]" />
          ) : (
            <Bot className="w-4.5 h-4.5 stroke-[1.5]" />
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          {message.reasoning && (
            <div className="text-[12px] text-gray-500">
              <button
                onClick={() => toggleReasoning(message.id)}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 stroke-[1.5]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[1.5]" />
                )}
                <span>Thinking process ({reasoningSteps} steps)</span>
              </button>
              {isExpanded && (
                <div className="mt-2 space-y-1.5 pl-5">
                  {message.reasoning.split('→').map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{index + 1}.</span>
                      <span className="text-gray-600">{step.trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div
              className={cn(
                'rounded-xl px-4 py-3 text-[14px] leading-relaxed shadow-sm',
                message.type === 'user'
                  ? 'bg-[#E5DEFF] text-gray-800'
                  : 'bg-white text-gray-900 border border-gray-100/80'
              )}
            >
              <ReactMarkdown
                className={cn(
                  'prose prose-sm max-w-none',
                  message.type === 'user' ? '' : '',
                  '[&_p]:leading-relaxed [&_p]:m-0',
                  '[&_pre]:bg-gray-800 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2',
                  '[&_code]:text-[13px] [&_code]:leading-relaxed',
                  '[&_ul]:my-2 [&_ul]:pl-4 [&_li]:my-1',
                  '[&_ol]:my-2 [&_ol]:pl-4',
                  '[&_a]:text-[#7E69AB] [&_a]:underline [&_a]:underline-offset-2'
                )}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            <span className="text-xs text-gray-400 px-1">
              {formatRelativeTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <MessageAttachments attachments={message.attachments} />
      )}
    </div>
  );
};

interface MessageAttachmentsProps {
  attachments: FileAttachment[];
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ attachments }) => {
  return (
    <div className="mt-2 space-y-2 max-w-[85%]">
      {attachments.map(attachment => (
        <div
          key={attachment.id}
          className={cn(
            'rounded-lg overflow-hidden',
            attachment.type === 'image' 
              ? 'max-w-[200px] border border-gray-100/80 shadow-sm' 
              : 'p-3 bg-white border border-gray-100/80 shadow-sm'
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
              <FileText className="w-4 h-4 stroke-[1.5]" />
              <span className="text-[13px] truncate">
                {attachment.file.name}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

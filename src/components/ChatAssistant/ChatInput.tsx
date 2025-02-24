
import React from 'react';
import { Send, Paperclip, XCircle, FileText, Image } from 'lucide-react';
import ReactTextareaAutosize from 'react-textarea-autosize';
import { cn } from '@/lib/utils';
import { FileAttachment } from './types';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleSubmit: () => void;
  attachments: FileAttachment[];
  removeAttachment: (id: string) => void;
  fileInputRef: React.RefElement<HTMLInputElement>;
  inputRef: React.RefElement<HTMLTextAreaElement>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  setInputValue,
  handleKeyPress,
  handleSubmit,
  attachments,
  removeAttachment,
  fileInputRef,
  inputRef,
  handleFileSelect,
}) => {
  return (
    <div className="flex-none border-t border-gray-100 p-6 space-y-4 bg-white">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="relative group flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200/80 shadow-sm"
            >
              {attachment.type === 'image' ? (
                <Image className="w-4 h-4 text-gray-500 stroke-[1.5]" />
              ) : (
                <FileText className="w-4 h-4 text-gray-500 stroke-[1.5]" />
              )}
              <span className="text-[13px] text-gray-600 max-w-[120px] truncate">
                {attachment.file.name}
              </span>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm border border-gray-200/80"
              >
                <XCircle className="w-4 h-4 text-gray-500 stroke-[1.5]" />
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
          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center"
        >
          <Paperclip className="w-5 h-5 stroke-[1.5]" />
        </button>

        <div className="flex-1 flex items-center">
          <ReactTextareaAutosize
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF] min-h-[46px] max-h-32"
            maxRows={4}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() && attachments.length === 0}
          className={cn(
            'p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center',
            (inputValue.trim() || attachments.length > 0)
              ? 'bg-[#635BFF] text-white shadow-md hover:bg-[#524FCC]'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
};

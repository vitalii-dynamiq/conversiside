
import React from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  assistantName: string;
  onNewChat: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  assistantName,
  onNewChat,
  onClose,
}) => {
  return (
    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-4">
        <h3 className="text-[15px] font-semibold text-gray-900">{assistantName}</h3>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
      >
        <X className="w-5 h-5 stroke-[1.5]" />
      </button>
    </div>
  );
};

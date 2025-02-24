
import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        <Bot className="w-4.5 h-4.5 text-gray-600 stroke-[1.5]" />
      </div>
      <div className="px-4 py-3 bg-white rounded-xl border border-gray-100/80 shadow-sm animate-pulse">
        <span className="text-[14px] text-gray-600">Typing...</span>
      </div>
    </div>
  );
};

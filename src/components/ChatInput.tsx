import { useState, FormEvent, KeyboardEvent } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="glass-effect rounded-2xl shadow-2xl p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products, inventory, or analytics..."
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-3 focus:outline-none placeholder:text-gray-400 disabled:opacity-50 max-h-32"
            style={{ minHeight: '52px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="flex-shrink-0 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl p-3 transition-all duration-200 disabled:cursor-not-allowed hover:shadow-lg active:scale-95"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Press <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Enter</kbd> to send,{' '}
        <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Shift + Enter</kbd> for new line
      </p>
    </form>
  );
}

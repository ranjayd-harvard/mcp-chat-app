import { useState, FormEvent, KeyboardEvent } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import {
  Squares2X2Icon,
  ServerIcon,
  GlobeAltIcon,
  CircleStackIcon,
  WrenchScrewdriverIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { ToolSource } from '@/types';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedSource: ToolSource;
  onSourceChange: (source: ToolSource) => void;
}

const SOURCE_CHIPS: {
  value: ToolSource;
  label: string;
  Icon: React.ElementType;
  activeClasses: string;
  inactiveClasses: string;
}[] = [
  {
    value: 'all',
    label: 'All Sources',
    Icon: Squares2X2Icon,
    activeClasses: 'bg-gray-800 text-white border-gray-800',
    inactiveClasses: 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
  },
  {
    value: 'product',
    label: 'Product API',
    Icon: ServerIcon,
    activeClasses: 'bg-primary-600 text-white border-primary-600',
    inactiveClasses: 'bg-white text-primary-600 border-primary-300 hover:border-primary-400',
  },
  {
    value: 'external',
    label: 'External API',
    Icon: GlobeAltIcon,
    activeClasses: 'bg-blue-500 text-white border-blue-500',
    inactiveClasses: 'bg-white text-blue-500 border-blue-300 hover:border-blue-400',
  },
  {
    value: 'kafka',
    label: 'Kafka',
    Icon: CircleStackIcon,
    activeClasses: 'bg-orange-500 text-white border-orange-500',
    inactiveClasses: 'bg-white text-orange-500 border-orange-300 hover:border-orange-400',
  },
  {
    value: 'sql',
    label: 'SQL Server',
    Icon: TableCellsIcon,
    activeClasses: 'bg-teal-600 text-white border-teal-600',
    inactiveClasses: 'bg-white text-teal-600 border-teal-300 hover:border-teal-400',
  },
  {
    value: 'custom',
    label: 'Custom Analytics',
    Icon: WrenchScrewdriverIcon,
    activeClasses: 'bg-secondary-600 text-white border-secondary-600',
    inactiveClasses: 'bg-white text-secondary-600 border-secondary-300 hover:border-secondary-400',
  },
];

export function ChatInput({ onSend, disabled, selectedSource, onSourceChange }: ChatInputProps) {
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

  const handleChipClick = (source: ToolSource) => {
    onSourceChange(selectedSource === source && source !== 'all' ? 'all' : source);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Source filter chips */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {SOURCE_CHIPS.map(({ value, label, Icon, activeClasses, inactiveClasses }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleChipClick(value)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${selectedSource === value ? activeClasses : inactiveClasses}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Text input */}
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

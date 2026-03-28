'use client';

import { ChatBubbleLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header with New Chat button */}
      <div className="p-3">
        <button
          onClick={onNewConversation}
          className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          New chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group relative rounded-lg p-3 cursor-pointer transition-all ${
                currentConversationId === conv.id
                  ? 'bg-white/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <div
                onClick={() => onSelectConversation(conv.id)}
                className="flex-1 pr-6"
              >
                {/* Title and Message Count */}
                <div className="flex items-start gap-2 mb-1.5">
                    <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 text-gray-200 mb-1">
                        {conv.title}
                    </p>
                    {/* Message count badge */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {conv.message_count}
                        </span>
                        <span className="text-gray-500">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </span>
                    </div>
                    </div>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    onDeleteConversation(conv.id);
                  }
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
              >
                <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="text-xs text-gray-500 text-center">
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </div>
      </div>
    </div>
  );
}
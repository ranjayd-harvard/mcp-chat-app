'use client';

import { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  currentConversationId: string | null;
}

export function ConversationList({
  onSelectConversation,
  onNewConversation,
  currentConversationId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = async () => {
    try {
      const response = await fetch('http://localhost:8000/conversations');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/conversations/${id}`, {
        method: 'DELETE',
      });
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div className="w-64 glass-effect border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-4 py-2 hover:from-primary-700 hover:to-primary-800 transition-all"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              currentConversationId === conv.id
                ? 'bg-primary-100 border border-primary-300'
                : 'bg-white hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <div
              onClick={() => onSelectConversation(conv.id)}
              className="flex-1"
            >
              <div className="flex items-start gap-2">
                <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{conv.title}</p>
                  <p className="text-xs text-gray-500">
                    {conv.message_count} messages
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
              }}
              className="ml-auto text-gray-400 hover:text-red-600 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
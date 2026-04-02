'use client';

import { useState } from 'react';
import { ChatBubbleLeftIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter } from 'date-fns';

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

type TimeGroup = 'Today' | 'Yesterday' | 'Last 7 days' | 'Last 30 days' | 'Older';

function getTimeGroup(dateStr: string): TimeGroup {
  const date = new Date(dateStr);
  const now = new Date();
  if (isToday(date))                          return 'Today';
  if (isYesterday(date))                      return 'Yesterday';
  if (isAfter(date, subDays(now, 7)))         return 'Last 7 days';
  if (isAfter(date, subDays(now, 30)))        return 'Last 30 days';
  return 'Older';
}

const GROUP_ORDER: TimeGroup[] = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'];

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? conversations.filter(c =>
        c.title.toLowerCase().includes(search.trim().toLowerCase())
      )
    : conversations;

  // Group filtered conversations by time bucket
  const grouped = GROUP_ORDER.reduce<Record<TimeGroup, Conversation[]>>(
    (acc, g) => ({ ...acc, [g]: [] }),
    {} as Record<TimeGroup, Conversation[]>
  );
  for (const conv of filtered) {
    grouped[getTimeGroup(conv.updated_at)].push(conv);
  }
  const activeGroups = GROUP_ORDER.filter(g => grouped[g].length > 0);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* New Chat */}
      <div className="p-3 pb-2">
        <button
          onClick={onNewConversation}
          className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grouped conversation list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{search ? 'No matches found' : 'No conversations yet'}</p>
          </div>
        ) : (
          activeGroups.map(group => (
            <div key={group}>
              {/* Group header */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
                {group}
              </p>

              {/* Conversations in this group */}
              <div className="space-y-0.5">
                {grouped[group].map(conv => (
                  <div
                    key={conv.id}
                    className={`group relative rounded-lg p-3 cursor-pointer transition-all ${
                      currentConversationId === conv.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div onClick={() => onSelectConversation(conv.id)} className="pr-6">
                      <div className="flex items-start gap-2 mb-1.5">
                        <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2 text-gray-200 mb-1">
                            {search ? <Highlight text={conv.title} query={search} /> : conv.title}
                          </p>
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

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) onDeleteConversation(conv.id);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                    >
                      <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="text-xs text-gray-500 text-center">
          {filtered.length}{filtered.length !== conversations.length ? ` of ${conversations.length}` : ''}{' '}
          {filtered.length === 1 ? 'conversation' : 'conversations'}
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/30 text-white rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

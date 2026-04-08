'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChatBubbleLeftIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  StarIcon,
  PencilIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
  starred?: boolean;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onStarConversation: (id: string) => void;
  onClearAll: () => void;
}

type TimeGroup = 'Starred' | 'Today' | 'Yesterday' | 'Last 7 days' | 'Last 30 days' | 'Older';

function getTimeGroup(conv: Conversation): TimeGroup {
  if (conv.starred) return 'Starred';
  const date = new Date(conv.updated_at);
  const now = new Date();
  if (isToday(date))                  return 'Today';
  if (isYesterday(date))              return 'Yesterday';
  if (isAfter(date, subDays(now, 7))) return 'Last 7 days';
  if (isAfter(date, subDays(now, 30)))return 'Last 30 days';
  return 'Older';
}

const GROUP_ORDER: TimeGroup[] = ['Starred', 'Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'];

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onStarConversation,
  onClearAll,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = search.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(search.trim().toLowerCase()))
    : conversations;

  const grouped = GROUP_ORDER.reduce<Record<TimeGroup, Conversation[]>>(
    (acc, g) => ({ ...acc, [g]: [] }),
    {} as Record<TimeGroup, Conversation[]>
  );
  for (const conv of filtered) {
    grouped[getTimeGroup(conv)].push(conv);
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

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{search ? 'No matches found' : 'No conversations yet'}</p>
          </div>
        ) : (
          activeGroups.map(group => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
                {group === 'Starred' && <StarSolid className="w-3 h-3 text-yellow-400" />}
                {group}
              </p>
              <div className="space-y-0.5">
                {grouped[group].map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={currentConversationId === conv.id}
                    search={search}
                    onSelect={() => onSelectConversation(conv.id)}
                    onDelete={() => onDeleteConversation(conv.id)}
                    onRename={(title) => onRenameConversation(conv.id, title)}
                    onStar={() => onStarConversation(conv.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {conversations.length > 0 && (
          showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex-1">Clear all chats?</span>
              <button
                onClick={() => { onClearAll(); setShowClearConfirm(false); }}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-1 flex items-center justify-center gap-1"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Clear all conversations
            </button>
          )
        )}
        <div className="text-xs text-gray-600 text-center">
          {filtered.length}{filtered.length !== conversations.length ? ` of ${conversations.length}` : ''}{' '}
          {filtered.length === 1 ? 'conversation' : 'conversations'}
        </div>
      </div>
    </div>
  );
}

interface ItemProps {
  conv: Conversation;
  isActive: boolean;
  search: string;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onStar: () => void;
}

function ConversationItem({ conv, isActive, search, onSelect, onDelete, onRename, onStar }: ItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keep draft in sync if title changes externally
  useEffect(() => { setDraft(conv.title); }, [conv.title]);

  // Focus input when rename starts
  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
    else setDraft(conv.title);
    setRenaming(false);
  };

  return (
    <div
      className={`group relative rounded-lg transition-all ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {/* Star indicator (always visible if starred) */}
      {conv.starred && !renaming && (
        <StarSolid className="absolute left-2 top-3.5 w-3 h-3 text-yellow-400 pointer-events-none" />
      )}

      <div
        onClick={renaming ? undefined : onSelect}
        className={`flex items-start gap-2 p-3 pr-8 cursor-pointer ${conv.starred ? 'pl-6' : ''}`}
      >
        {!conv.starred && <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}

        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setDraft(conv.title); setRenaming(false); }
              }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-white/10 text-sm text-white px-2 py-0.5 rounded outline-none border border-white/30 focus:border-white/60"
            />
          ) : (
            <p className="text-sm line-clamp-2 text-gray-200">
              {search ? <Highlight text={conv.title} query={search} /> : conv.title}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs mt-1">
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

      {/* ··· menu button */}
      {!renaming && (
        <div ref={menuRef} className="absolute top-2.5 right-2">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
          >
            <EllipsisHorizontalIcon className="w-4 h-4 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 w-40 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={e => { e.stopPropagation(); onStar(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
              >
                {conv.starred
                  ? <StarSolid className="w-4 h-4 text-yellow-400" />
                  : <StarIcon className="w-4 h-4 text-gray-400" />}
                {conv.starred ? 'Unstar' : 'Star'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); setRenaming(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
              >
                <PencilIcon className="w-4 h-4 text-gray-400" />
                Rename
              </button>
              <div className="border-t border-white/10" />
              <button
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  if (confirm('Delete this conversation?')) onDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
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

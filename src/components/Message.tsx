import { Message as MessageType } from '@/types';
import { format } from 'date-fns';
import { UserCircleIcon, CpuChipIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-gradient-to-br from-primary-500 to-primary-600'
              : isSystem
              ? 'bg-gradient-to-br from-gray-500 to-gray-600'
              : 'bg-gradient-to-br from-secondary-500 to-secondary-600'
          } shadow-lg`}
        >
          {isUser ? (
            <UserCircleIcon className="w-6 h-6 text-white" />
          ) : (
            <CpuChipIcon className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-2xl px-6 py-4 ${
            isUser
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white ml-auto'
              : isSystem
              ? 'bg-gray-100 text-gray-900'
              : 'glass-effect'
          } shadow-lg`}
        >
          {/* Message Text */}
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm opacity-70">Thinking...</span>
            </div>
          ) : (
            <div className={`prose ${isUser ? 'prose-invert' : ''} max-w-none`}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {/* Tool Calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-4 space-y-2">
              {message.toolCalls.map((tool) => (
                <div
                  key={tool.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    isUser ? 'bg-white/10' : 'bg-slate-50'
                  } border border-slate-200/20`}
                >
                  <WrenchScrewdriverIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{tool.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          tool.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : tool.status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {tool.status}
                      </span>
                    </div>
                    {tool.result && (
                      <pre className="text-xs overflow-x-auto bg-black/5 p-2 rounded mt-2">
                        {JSON.stringify(tool.result, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
            {format(new Date(message.timestamp), 'h:mm a')}
          </div>
        </div>
      </div>
    </div>
  );
}

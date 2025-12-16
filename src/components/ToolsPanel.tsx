'use client';

import { useState } from 'react';
import { MCPTool } from '@/types';
import { WrenchScrewdriverIcon, ServerIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ToolsPanelProps {
  apiTools: MCPTool[];
  customTools: MCPTool[];
  isOpen: boolean;
  onClose: () => void;
}

export function ToolsPanel({ apiTools, customTools, isOpen, onClose }: ToolsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md">
        <div className="glass-effect h-full shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold gradient-text">Available Tools</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 chat-scrollbar">
            {/* REST API Tools */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ServerIcon className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-lg text-gray-900">REST API Tools</h3>
                <span className="ml-auto text-sm text-gray-500">{apiTools.length} tools</span>
              </div>
              <div className="space-y-2">
                {apiTools.map((tool) => (
                  <ToolCard key={tool.name} tool={tool} type="api" />
                ))}
              </div>
            </div>

            {/* Custom MCP Tools */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <WrenchScrewdriverIcon className="w-5 h-5 text-secondary-600" />
                <h3 className="font-semibold text-lg text-gray-900">Custom Analytics Tools</h3>
                <span className="ml-auto text-sm text-gray-500">{customTools.length} tools</span>
              </div>
              <div className="space-y-2">
                {customTools.map((tool) => (
                  <ToolCard key={tool.name} tool={tool} type="custom" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, type }: { tool: MCPTool; type: 'api' | 'custom' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
              type === 'api' ? 'bg-primary-500' : 'bg-secondary-500'
            }`}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-mono text-sm font-medium text-gray-900 truncate">{tool.name}</h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{tool.description}</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Input Parameters:</p>
            {Object.keys(tool.inputSchema.properties || {}).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(tool.inputSchema.properties || {}).map(([key, schema]: [string, any]) => (
                  <div key={key} className="text-xs">
                    <span className="font-mono text-primary-700">{key}</span>
                    <span className="text-gray-500 ml-2">
                      ({schema.type})
                      {tool.inputSchema.required?.includes(key) && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </span>
                    {schema.description && <p className="text-gray-600 ml-4 mt-0.5">{schema.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No parameters</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

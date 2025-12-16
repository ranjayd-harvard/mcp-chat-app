'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/components/Message';
import { ChatInput } from '@/components/ChatInput';
import { ToolsPanel } from '@/components/ToolsPanel';
import { MCPClient } from '@/lib/mcp-client';
import { Message as MessageType, MCPTool } from '@/types';
import { WrenchScrewdriverIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiTools, setApiTools] = useState<MCPTool[]>([]);
  const [customTools, setCustomTools] = useState<MCPTool[]>([]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mcpClient = useRef(new MCPClient());

  // Load available tools on mount
  useEffect(() => {
    loadTools();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTools = async () => {
    try {
      const [api, custom] = await Promise.all([
        mcpClient.current.getAPITools(),
        mcpClient.current.getCustomTools(),
      ]);
      setApiTools(api);
      setCustomTools(custom);
    } catch (error) {
      console.error('Error loading tools:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save current messages for history
    const conversationHistory = [...messages, userMessage];

    // Add loading message
    const loadingMessage: MessageType = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Simulate AI processing with tool calling
      const response = await processMessage(content, conversationHistory);

      // Remove loading message and add actual response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [...filtered, response];
      });
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        const errorMessage: MessageType = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };


  const processMessage = async (content: string, history: MessageType[]): Promise<MessageType> => {
    try {
      console.log('💬 Processing message:', content);

      // Step 1: Initial call to Claude
      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: history,
          availableTools: [...apiTools, ...customTools],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      let data = await response.json();
      console.log('🤖 Claude initial response:', data);

      // Step 2: Check if Claude wants to use tools
      const toolUseBlocks = data.content.filter((block: any) => block.type === 'tool_use');
      
      if (toolUseBlocks.length > 0) {
        console.log('🔧 Claude wants to use tools:', toolUseBlocks.length);

        // Execute all tools
        const toolResults = [];
        const toolCalls = [];

        for (const toolBlock of toolUseBlocks) {
          console.log('⚙️ Executing tool:', toolBlock.name);

          try {
            // Determine if API or custom tool
            const isAPITool = apiTools.some(t => t.name === toolBlock.name);
            
            let result;
            if (isAPITool) {
              result = await mcpClient.current.callAPITool(toolBlock.name, toolBlock.input);
            } else {
              result = await mcpClient.current.callCustomTool(toolBlock.name, toolBlock.input);
            }

            console.log('✅ Tool result:', result);

            toolResults.push({
              toolCallId: toolBlock.id,
              toolName: toolBlock.name,
              input: toolBlock.input,
              result: result,
            });

            toolCalls.push({
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
              result: result,
              status: 'success' as const,
              timestamp: new Date(),
            });
          } catch (error) {
            console.error('❌ Tool execution failed:', error);
            
            toolResults.push({
              toolCallId: toolBlock.id,
              toolName: toolBlock.name,
              input: toolBlock.input,
              result: { error: String(error) },
            });

            toolCalls.push({
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
              result: { error: String(error) },
              status: 'error' as const,
              timestamp: new Date(),
            });
          }
        }

        // Step 3: Send tool results back to Claude for final response
        console.log('📤 Sending tool results back to Claude');
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: history,
            availableTools: [...apiTools, ...customTools],
            toolResults: toolResults,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error on second call: ${response.status}`);
        }

        data = await response.json();
        console.log('🤖 Claude final response:', data);

        // Extract text response
        const textBlocks = data.content.filter((block: any) => block.type === 'text');
        const responseText = textBlocks.map((block: any) => block.text).join('\n');

        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          toolCalls: toolCalls,
        };
      }

      // No tool use - just return text response
      const textBlocks = data.content.filter((block: any) => block.type === 'text');
      const responseText = textBlocks.map((block: any) => block.text).join('\n');

      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Error processing message:', error);
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}`,
        timestamp: new Date(),
      };
    }
  };

  // Helper function to format tool results
  const formatToolResult = (toolName: string, result: any): string => {
    if (toolName === 'list_products' && Array.isArray(result)) {
      return `Here are the products:\n\n${result
        .map((p: any) => `- **${p.name}**: $${p.price} (${p.quantity} in stock)`)
        .join('\n')}`;
    } else if (toolName === 'calculate_inventory_value') {
      return `Total inventory value: **$${result.total_inventory_value?.toLocaleString()}** across ${result.product_count} products.`;
    } else if (toolName === 'find_low_stock_products') {
      return `Found **${result.low_stock_count}** low stock products.`;
    }
    // Default formatting
    return JSON.stringify(result, null, 2);
  };

  // Helper functions
  const extractCategory = (text: string): string | undefined => {
    const categories = ['Electronics', 'Furniture', 'Gaming'];
    const lowerText = text.toLowerCase();
    for (const cat of categories) {
      if (lowerText.includes(cat.toLowerCase())) {
        return cat;
      }
    }
    return undefined;
  };

  const extractNumber = (text: string): number | undefined => {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-effect border-b border-white/20 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Product Assistant</h1>
                <p className="text-sm text-gray-600">Powered by MCP + FastAPI</p>
              </div>
            </div>
            <button
              onClick={() => setIsToolsPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <WrenchScrewdriverIcon className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-gray-700">
                {apiTools.length + customTools.length} Tools
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto chat-scrollbar">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-6 glass-effect rounded-3xl shadow-xl mb-6">
                <SparklesIcon className="w-16 h-16 mx-auto text-primary-500" />
              </div>
              <h2 className="text-3xl font-bold gradient-text mb-4">Welcome to Product Assistant</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                I'm connected to your product management system with both REST API and custom analytics tools.
                Ask me anything about your inventory!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {[
                  {
                    title: '📊 Inventory Analysis',
                    description: 'Calculate total inventory value by category',
                    example: 'Show me inventory value for Electronics',
                  },
                  {
                    title: '⚠️ Stock Alerts',
                    description: 'Find products with low stock levels',
                    example: 'Which products are below 20 units?',
                  },
                  {
                    title: '📦 Product Listings',
                    description: 'Browse and search your products',
                    example: 'List all Furniture products',
                  },
                  {
                    title: '💰 Price Analytics',
                    description: 'Get detailed pricing statistics',
                    example: 'Show price statistics for all products',
                  },
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => handleSendMessage(card.example)}
                    className="glass-effect p-6 rounded-2xl text-left hover:shadow-xl transition-all hover:-translate-y-1 group"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{card.description}</p>
                    <p className="text-xs text-primary-600 font-medium">"{card.example}"</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Chat Input */}
      <footer className="border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </footer>

      {/* Tools Panel */}
      <ToolsPanel
        apiTools={apiTools}
        customTools={customTools}
        isOpen={isToolsPanelOpen}
        onClose={() => setIsToolsPanelOpen(false)}
      />
    </div>
  );
}

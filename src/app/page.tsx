'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Message } from '@/components/Message';
import { ChatInput } from '@/components/ChatInput';
import { ToolsPanel } from '@/components/ToolsPanel';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { MCPClient } from '@/lib/mcp-client';
import { Message as MessageType, MCPTool, ToolSource } from '@/types';
import { WrenchScrewdriverIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiTools, setApiTools] = useState<MCPTool[]>([]);
  const [customTools, setCustomTools] = useState<MCPTool[]>([]);
  const [selectedSource, setSelectedSource] = useState<ToolSource>('all');

  const filteredTools = useMemo(() => {
    if (selectedSource === 'all')      return [...apiTools, ...customTools];
    if (selectedSource === 'product')  return apiTools.filter(t => !t.name.startsWith('ext_') && !t.name.startsWith('kafka_') && !t.name.startsWith('sql_'));
    if (selectedSource === 'external') return apiTools.filter(t => t.name.startsWith('ext_'));
    if (selectedSource === 'kafka')    return apiTools.filter(t => t.name.startsWith('kafka_'));
    if (selectedSource === 'sql')      return apiTools.filter(t => t.name.startsWith('sql_'));
    if (selectedSource === 'custom')   return customTools;
    return [...apiTools, ...customTools];
  }, [selectedSource, apiTools, customTools]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const mcpClient = useRef(new MCPClient(
    API_URL,
    process.env.NEXT_PUBLIC_CUSTOM_URL     || 'http://localhost:8001',
    process.env.NEXT_PUBLIC_EXTERNAL_URL   || 'http://localhost:8002',
    process.env.NEXT_PUBLIC_KAFKA_URL      || 'http://localhost:8003',
    process.env.NEXT_PUBLIC_SQL_URL        || 'http://localhost:8004',
  ));
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationList, setConversationList] = useState<any[]>([]);

  // Load available tools on mount
  useEffect(() => {
    loadTools();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadTools();
    loadConversations(); 
  }, []);

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

  // Create new conversation
  const createConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'default_user' })
      });
      const data = await response.json();
      setCurrentConversationId(data.id);
      console.log('✅ Created conversation:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      return null;
    }
  };

  // Save message to conversation
  const saveMessage = async (conversationId: string, message: MessageType) => {
    try {
      await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          tool_calls: message.toolCalls
        })
      });
      console.log('✅ Saved message to conversation');
    } catch (error) {
      console.error('❌ Error saving message:', error);
    }
  };

  // Load conversation
  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}`);
      const data = await response.json();
      
      // Convert messages to MessageType format
      const loadedMessages: MessageType[] = data.messages.map((msg: any, index: number) => ({
        id: `${conversationId}-${index}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        toolCalls: msg.tool_calls
      }));
      
      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      console.log('✅ Loaded conversation:', conversationId);
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  };

  // Load all conversations
  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations`);
      const data = await response.json();
      // Backend already sorts by updated_at descending, so just set it
      setConversationList(Array.isArray(data) ? data : []);
      console.log('✅ Loaded conversations:', Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    }
  };

  // Handle selecting a conversation
  const handleSelectConversation = async (conversationId: string) => {
    await loadConversation(conversationId);
  };

  // Handle creating new conversation
  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    console.log('✅ Started new conversation');
  };

  // Handle deleting a conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await fetch(`${API_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      // Reload conversation list
      await loadConversations();
      
      // If we deleted the current conversation, start a new one
      if (conversationId === currentConversationId) {
        handleNewConversation();
      }
      
      console.log('✅ Deleted conversation:', conversationId);
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
    }
};

  const handleSendMessage = async (content: string) => {
    // Create conversation if it doesn't exist
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) {
        console.error('Failed to create conversation');
        return;
      }
    }

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to MongoDB
    await saveMessage(convId, userMessage);

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
      const response = await processMessage(content, conversationHistory);

      // Remove loading message and add actual response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [...filtered, response];
      });

      // Save assistant message to MongoDB
      await saveMessage(convId, response);

      // Reload conversation list to show updated title/timestamp
      await loadConversations();
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
          availableTools: filteredTools,
          selectedSource,
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
          console.log('📝 Tool input:', JSON.stringify(toolBlock.input, null, 2));

          try {
            // Determine if API or custom tool
            const isAPITool = apiTools.some(t => t.name === toolBlock.name);
            
            let result;
            if (isAPITool) {
              result = await mcpClient.current.callAPITool(toolBlock.name, toolBlock.input);
            } else {
              result = await mcpClient.current.callCustomTool(toolBlock.name, toolBlock.input);
            }

            //console.log('✅ Tool result:', result);
            console.log('✅ Tool result:', JSON.stringify(result, null, 2));

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
            availableTools: filteredTools,
          selectedSource,
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
  <div className="h-screen flex overflow-hidden bg-gray-50">
    {/* Left Sidebar - Full height, always visible */}
    <div className="w-64 flex-shrink-0 bg-gray-900">
      <ConversationSidebar
        conversations={conversationList}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
    </div>

    {/* Main Content Area - Chat */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Product Assistant</h1>
              </div>
            </div>
            <button
              onClick={() => setIsToolsPanelOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-lg transition-colors"
            >
              <WrenchScrewdriverIcon className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">{filteredTools.length} Tools</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-6 bg-white rounded-2xl shadow-lg mb-6">
                <SparklesIcon className="w-16 h-16 mx-auto text-primary-500" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
                Welcome to Product Assistant
              </h2>
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
                    onClick={() => {
                      console.log('Clicking card:', card.example);
                      handleSendMessage(card.example);
                    }}
                    disabled={isLoading}
                    className="bg-white border border-gray-200 p-6 rounded-xl text-left hover:shadow-md hover:border-gray-300 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Input Area - Fixed at bottom */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
            />
        </div>
      </footer>
    </div>

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

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, history, availableTools, toolResults, selectedSource } = await request.json();

    console.log('📨 Received message:', message);
    console.log('📜 History length:', history?.length || 0);
    console.log('🔧 Available tools:', availableTools?.length);
    console.log('📦 Tool results:', toolResults?.length);

    // Convert tools to Claude format
    const claudeTools = availableTools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    // Focused-mode instruction appended when user has pinned a source
    const FOCUSED_MODE_DESCRIPTIONS: Record<string, string> = {
      product: 'Product API tools only (no-prefix tools — MongoDB product records, inventory, CRUD, conversations)',
      external: 'External API tools only (ext_ prefix — live weather, currency rates, stock quotes)',
      kafka:   'Kafka tools only (kafka_ prefix — real-time topics, event publishing and consuming)',
      sql:     'SQL Server tools only (sql_ prefix — list databases/tables/views, describe schema, execute queries)',
      custom:  'Custom Analytics tools only (calculate_inventory_value, find_low_stock_products, etc.)',
    };
    const focusedModeInstruction =
      selectedSource && selectedSource !== 'all' && FOCUSED_MODE_DESCRIPTIONS[selectedSource]
        ? `\n\nFOCUSED MODE: The user has restricted this session to ${FOCUSED_MODE_DESCRIPTIONS[selectedSource]}. Do not suggest or call tools from other sources. If the user's request cannot be answered with the available tools, explain which source they would need to switch to.`
        : '';

    // Build message history for Claude
    const messages: any[] = [];

    // Add conversation history (excluding the current message)
    if (history && history.length > 1) {
      for (let i = 0; i < history.length - 1; i++) {
        const msg = history[i];
        
        if (msg.role === 'user') {
          messages.push({
            role: 'user',
            content: msg.content,
          });
        } else if (msg.role === 'assistant') {
          // For assistant messages, we need to reconstruct the response
          const content: any[] = [];
          
          // Add text
          if (msg.content) {
            content.push({
              type: 'text',
              text: msg.content,
            });
          }
          
          // Add tool calls if present
          if (msg.toolCalls) {
            for (const tc of msg.toolCalls) {
              content.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.name,
                input: tc.input,
              });
            }
          }
          
          messages.push({
            role: 'assistant',
            content: content,
          });
          
          // If there were tool calls, add tool results as user message
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            messages.push({
              role: 'user',
              content: msg.toolCalls.map((tc: any) => ({
                type: 'tool_result',
                tool_use_id: tc.id,
                content: JSON.stringify(tc.result),
              })),
            });
          }
        }
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // If we have NEW tool results from this turn, add them
    if (toolResults && toolResults.length > 0) {
      // Remove the last user message (we'll reconstruct it)
      messages.pop();
      
      // Add assistant's tool use
      messages.push({
        role: 'assistant',
        content: toolResults.map((tr: any) => ({
          type: 'tool_use',
          id: tr.toolCallId,
          name: tr.toolName,
          input: tr.input,
        })),
      });

      // Add tool results as user message
      messages.push({
        role: 'user',
        content: toolResults.map((tr: any) => ({
          type: 'tool_result',
          tool_use_id: tr.toolCallId,
          content: JSON.stringify(tr.result),
        })),
      });
    }

    console.log('💬 Total messages to Claude:', messages.length);

    // Call Claude with full history
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: `You are a product and data assistant with access to multiple backend systems. Each tool name is prefixed to indicate its source:
- No prefix → Product API (MongoDB): structured product records, inventory, CRUD operations, conversation history.
- ext_ prefix → External API: live weather, currency exchange rates, stock market quotes from third-party services.
- kafka_ prefix → Kafka (event stream): real-time message topics, event publishing and consuming, streaming data pipelines.
- sql_ prefix → SQL Server: relational database schema exploration, table/view listings, and ad-hoc SQL queries.

Tool selection rules:
1. Match the prefix to the user's intent. If the user asks about products or inventory, use Product API tools. If they ask about events, queues, or messages, use kafka_ tools. If they ask about weather, currency, or stocks, use ext_ tools. If they ask about SQL tables, schemas, or relational data, use sql_ tools.
2. When a request is ambiguous and could apply to more than one data source (e.g. "show me orders" could mean a Kafka topic, a MongoDB collection, OR a SQL Server table), STOP and ask a clarifying question before calling any tool. Do not guess.
3. Never use ext_generic_api_call to reach kafka_, sql_, or Product API endpoints. Each system has its own dedicated tools.
4. If you are unsure which tool fits, explain the options to the user and ask them to confirm.${focusedModeInstruction}`,
      tools: claudeTools,
      messages: messages,
    });

    console.log('🤖 Claude response:', response);

    return NextResponse.json({
      content: response.content,
      stopReason: response.stop_reason,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error('❌ Error calling Claude API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
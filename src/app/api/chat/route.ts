import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, history, availableTools, toolResults } = await request.json();

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
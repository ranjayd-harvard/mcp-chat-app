import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    console.log('🔑 API Key exists:', !!apiKey);
    console.log('🔑 API Key prefix:', apiKey?.substring(0, 10));
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found in environment' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    // Try the simplest possible request
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Use cheapest model for testing
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say hello' }],
    });

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model,
    });
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      error: error.message,
      details: error,
    }, { status: 500 });
  }
}
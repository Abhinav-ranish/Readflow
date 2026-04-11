import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanLimits } from '@/lib/billing';
import type { PlanTier } from '@/lib/billing';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

type AiCommand = 'summarize' | 'expand' | 'fix-grammar' | 'translate' | 'generate-table' | 'polish' | 'generate-from-url' | 'chat';

const SYSTEM_PROMPTS: Record<AiCommand, string> = {
    summarize: 'Summarize the following markdown document concisely. Return markdown.',
    expand: 'Expand the following markdown section with more detail, examples, and explanation. Return markdown.',
    'fix-grammar': 'Fix grammar, spelling, and punctuation in the following markdown. Preserve all formatting. Return the corrected markdown only.',
    translate: 'Translate the following markdown to the specified language. Preserve all markdown formatting.',
    'generate-table': 'Convert the following information into a well-formatted markdown table.',
    polish: 'Improve this markdown document: fix heading hierarchy, normalize lists, add missing code fences, fix formatting issues. Return the polished markdown only.',
    'generate-from-url': 'Generate comprehensive markdown documentation based on the provided content/URL description. Include appropriate headings, code examples if relevant, and clear explanations.',
    chat: 'You are a helpful writing assistant. Answer questions about the provided document or help improve it. Be concise.',
};

async function callOpenAI(systemPrompt: string, userContent: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            max_tokens: 4000,
            temperature: 0.7,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || '';
}

async function callAnthropic(systemPrompt: string, userContent: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_KEY!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic error: ${err}`);
    }

    const data = await res.json();
    return data.content[0]?.text || '';
}

async function callGemini(systemPrompt: string, userContent: string): Promise<string> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userContent }] }],
            generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error: ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
    if (ANTHROPIC_KEY) return callAnthropic(systemPrompt, userContent);
    if (GEMINI_KEY) return callGemini(systemPrompt, userContent);
    if (OPENAI_KEY) return callOpenAI(systemPrompt, userContent);
    throw new Error('No AI provider configured');
}

export async function POST(request: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // PREMIUM DISABLED — everything is free for now
    // const user = await db.getUser(userId);
    // const tier: PlanTier = (user as any)?.plan || 'free';
    // const limits = getPlanLimits(tier);
    //
    // if (limits.aiCredits === 0) {
    //     return NextResponse.json({ error: 'AI features require Pro plan' }, { status: 403 });
    // }
    //
    // const currentUsage = (user as any)?.aiCreditsUsed || 0;
    // if (currentUsage >= limits.aiCredits) {
    //     return NextResponse.json({ error: 'AI credit limit reached this month' }, { status: 429 });
    // }

    if (!OPENAI_KEY && !ANTHROPIC_KEY && !GEMINI_KEY) {
        return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const { command, content, language } = await request.json();

    if (!command || !content) {
        return NextResponse.json({ error: 'Missing command or content' }, { status: 400 });
    }

    const cmd = command as AiCommand;
    if (!SYSTEM_PROMPTS[cmd]) {
        return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
    }

    let userContent = content;
    if (cmd === 'translate' && language) {
        userContent = `Translate to ${language}:\n\n${content}`;
    }

    try {
        const result = await callAI(SYSTEM_PROMPTS[cmd], userContent);
        // PREMIUM DISABLED — skip credit tracking
        // await db.incrementAiCredits(userId);
        return NextResponse.json({ result });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'AI request failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

import { type Env, json, error } from '../lib/http';

const SYSTEM_BASE =
  'You are Culina, a warm, practical advisor for small food entrepreneurs working out of shared commercial kitchens. You give specific, actionable, encouraging guidance. You are never preachy. You never give legal or financial guarantees — you suggest steps and flag where professional advice is wise.';

interface AIRoute {
  system: string;
  buildPrompt: (body: any) => string;
  maxTokens?: number;
}

const routes: Record<string, AIRoute> = {
  'generate-storefront-copy': {
    system: `${SYSTEM_BASE} You write concise, evocative e-commerce copy. Respond ONLY with minified JSON: {"headline","subheadline","about","meta"}.`,
    buildPrompt: (b) =>
      `Business: ${b.business_name} (${b.business_type}). Vibe: ${b.vibe}. Products: ${(b.products || []).join(', ')}. Write a hero headline (<=6 words), a subheadline (1 sentence), an about section (2-3 sentences), and a meta description (<=155 chars).`,
    maxTokens: 600,
  },
  'recipe-advice': {
    system: `${SYSTEM_BASE} You are a food-cost consultant. Be concrete with numbers and substitutions.`,
    buildPrompt: (b) =>
      `Ingredients: ${JSON.stringify(b.ingredients)}. Current COGS/unit (cents): ${b.cogs}. Target margin: ${b.target_margin}%. Suggest 4-5 specific ways to reduce COGS or improve margin, including substitutions and sourcing/scaling tips.`,
    maxTokens: 700,
  },
  'draft-grant': {
    system: `${SYSTEM_BASE} You write compelling, honest grant narratives. Use clear sections. 500-800 words.`,
    buildPrompt: (b) =>
      `Grant: ${b.grant}. Applicant business profile: ${JSON.stringify(b.business)}. Draft a grant application narrative with sections: Executive Summary, Need & Opportunity, Use of Funds, Impact. Remind the reader to verify figures.`,
    maxTokens: 1400,
  },
  'check-label': {
    system: `${SYSTEM_BASE} You are an FDA food-labeling reviewer. List what is present, what is likely missing, and recommendations. Note this is guidance, not legal advice.`,
    buildPrompt: (b) => `Review this product label text/description for FDA compliance:\n\n${b.input}`,
    maxTokens: 800,
  },
  'business-plan': {
    system: `${SYSTEM_BASE} You write structured, realistic business plans for early food businesses.`,
    buildPrompt: (b) =>
      `Create a business plan for: name=${b.name}, type=${b.type}, stage=${b.stage}, target market=${b.market}. Sections: Executive Summary, Products & Services, Market Analysis, Marketing & Sales, Operations, Financial Plan.`,
    maxTokens: 1600,
  },
  tutor: {
    system: `${SYSTEM_BASE} You are the AI Kitchen Tutor. Answer the user's question grounded in food-business best practices, tailored to their context.`,
    buildPrompt: (b) => `Context: ${JSON.stringify(b.context || {})}. Question: ${b.question}`,
    maxTokens: 800,
  },
  permitting: {
    system: `${SYSTEM_BASE} You explain permitting steps clearly for a given US state and product type. Number the steps. Note to confirm with the local health authority.`,
    buildPrompt: (b) => `State: ${b.state}. Business/product type: ${b.business_type}. List the permits and licenses typically required and the order to pursue them.`,
    maxTokens: 800,
  },
};

export async function handleAI(endpoint: string, request: Request, env: Env): Promise<Response> {
  const route = routes[endpoint];
  if (!route) return error(`Unknown AI endpoint: ${endpoint}`, env, 404);

  const body = await request.json().catch(() => ({}));

  if (!env.ANTHROPIC_API_KEY) {
    // No key configured — the frontend has graceful demo fallbacks, so signal that.
    return json({ text: '', demo: true, note: 'ANTHROPIC_API_KEY not configured on the worker.' }, env);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: route.maxTokens ?? 800,
        system: route.system,
        messages: [{ role: 'user', content: route.buildPrompt(body) }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return error(`Claude API error (${res.status}): ${detail}`, env, 502);
    }

    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
    return json({ text }, env);
  } catch (e) {
    return error(`AI request failed: ${(e as Error).message}`, env, 500);
  }
}

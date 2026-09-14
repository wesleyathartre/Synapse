import { NextRequest } from 'next/server';

// Origens liberadas por padrão (usadas se LANDING_ORIGIN não estiver definida).
// Em produção, defina LANDING_ORIGIN na Vercel (lista separada por vírgula) para
// travar exatamente no domínio da Landing.
const DEFAULT_ORIGINS = [
  'https://lp-puppo.vercel.app',
  'http://localhost:5500',
  'http://localhost:3000',
];

function allowedOrigins(): string[] {
  const env = process.env.LANDING_ORIGIN?.trim();
  if (!env) return DEFAULT_ORIGINS;
  if (env === '*') return ['*'];
  return env.split(',').map((o) => o.trim()).filter(Boolean);
}

// Monta os headers de CORS ecoando a origem da requisição quando ela está na
// allowlist. Evita o coringa '*' em produção sem quebrar o preflight.
export function corsHeaders(req?: NextRequest): Record<string, string> {
  const allow = allowedOrigins();
  const reqOrigin = req?.headers.get('origin') || '';

  let origin: string;
  if (allow.includes('*')) origin = '*';
  else if (reqOrigin && allow.includes(reqOrigin)) origin = reqOrigin;
  else origin = allow[0];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin !== '*') headers['Vary'] = 'Origin';
  return headers;
}

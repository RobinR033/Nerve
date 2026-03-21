import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicLength: process.env.ANTHROPIC_API_KEY?.length ?? -1,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20),
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('SUPABASE')),
  });
}

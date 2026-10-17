import { USE_CASES } from "@/lib/e2e/use-cases";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

interface RunIndex {
  generatedAt?: string;
  runs?: Record<
    string,
    {
      status: string;
      durationMs: number;
      video: string | null;
      screenshot: string | null;
      error: string | null;
    }
  >;
}

export async function GET(): Promise<NextResponse> {
  let index: RunIndex = {};
  try {
    const raw = await readFile(path.join(process.cwd(), "public", "e2e-replays", "index.json"), "utf8");
    index = JSON.parse(raw) as RunIndex;
  } catch {
    index = {};
  }

  const useCases = USE_CASES.map((uc) => ({
    ...uc,
    run: index.runs?.[uc.id] ?? null,
  }));

  return NextResponse.json({
    generatedAt: index.generatedAt ?? null,
    total: useCases.length,
    useCases,
  });
}

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

export interface UseCaseRun {
  id: string;
  title: string;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  durationMs: number;
  video: string | null;
  screenshot: string | null;
  error: string | null;
  spec: string;
}

function extractUseCaseId(title: string): string | null {
  const match = title.match(/^(UC-[A-Z0-9-]+)/);
  return match?.[1] ?? null;
}

class UseCaseVideoReporter implements Reporter {
  private readonly outDir = path.join(process.cwd(), "public", "e2e-replays");
  private readonly runs = new Map<string, UseCaseRun>();

  onBegin(_config: FullConfig): void {
    mkdirSync(this.outDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const id = extractUseCaseId(test.title);
    if (!id) return;

    let videoRel: string | null = null;
    let shotRel: string | null = null;

    for (const attachment of result.attachments) {
      if (!attachment.path || !existsSync(attachment.path)) continue;
      if (attachment.contentType?.includes("video") || attachment.name === "video") {
        const dest = path.join(this.outDir, `${id}.webm`);
        copyFileSync(attachment.path, dest);
        videoRel = `/e2e-replays/${id}.webm`;
      }
      if (attachment.contentType?.includes("image") || attachment.name === "screenshot") {
        const dest = path.join(this.outDir, `${id}.png`);
        copyFileSync(attachment.path, dest);
        shotRel = `/e2e-replays/${id}.png`;
      }
    }

    this.runs.set(id, {
      id,
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      video: videoRel,
      screenshot: shotRel,
      error: result.error?.message ?? null,
      spec: path.relative(process.cwd(), test.location.file),
    });
  }

  onEnd(_result: FullResult): void {
    const payload = {
      generatedAt: new Date().toISOString(),
      runs: Object.fromEntries(this.runs),
    };
    writeFileSync(path.join(this.outDir, "index.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

export default UseCaseVideoReporter;

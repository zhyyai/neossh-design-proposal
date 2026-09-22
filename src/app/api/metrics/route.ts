import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { execSync } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CpuSlice {
  idle: number;
  total: number;
}

const globalForMetrics = globalThis as typeof globalThis & {
  __neosshCpuPrev?: CpuSlice;
};

function readCpu(): CpuSlice | null {
  try {
    const line = readFileSync("/proc/stat", "utf8").split("\n")[0];
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = (parts[3] ?? 0) + (parts[4] ?? 0);
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  } catch {
    return null;
  }
}

function cpuPercent(): number {
  const cur = readCpu();
  if (!cur) return 0;
  const prev = globalForMetrics.__neosshCpuPrev;
  globalForMetrics.__neosshCpuPrev = cur;
  if (!prev) return 0;
  const dIdle = cur.idle - prev.idle;
  const dTotal = cur.total - prev.total;
  if (dTotal <= 0) return 0;
  return Math.round((1 - dIdle / dTotal) * 1000) / 10;
}

function readMem(): { total: number; used: number } {
  try {
    const txt = readFileSync("/proc/meminfo", "utf8");
    const get = (k: string) => {
      const m = txt.match(new RegExp(`^${k}:\\s+(\\d+)`, "m"));
      return m ? Number(m[1]) * 1024 : 0;
    };
    const total = get("MemTotal");
    const avail = get("MemAvailable");
    return { total, used: Math.max(0, total - avail) };
  } catch {
    return { total: 0, used: 0 };
  }
}

function readLoad(): [number, number, number] {
  try {
    const parts = readFileSync("/proc/loadavg", "utf8").trim().split(/\s+/);
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  } catch {
    return [0, 0, 0];
  }
}

function readUptime(): number {
  try {
    return Math.floor(Number(readFileSync("/proc/uptime", "utf8").split(" ")[0]));
  } catch {
    return 0;
  }
}

function readDisk(): { total: number; used: number } {
  try {
    const out = execSync("df -k / 2>/dev/null | tail -1", {
      encoding: "utf8",
      timeout: 3000,
    });
    const parts = out.trim().split(/\s+/);
    return { total: Number(parts[1]) * 1024, used: Number(parts[2]) * 1024 };
  } catch {
    return { total: 0, used: 0 };
  }
}

export async function GET() {
  const mem = readMem();
  const disk = readDisk();
  return NextResponse.json({
    cpu: cpuPercent(),
    memTotal: mem.total,
    memUsed: mem.used,
    diskTotal: disk.total,
    diskUsed: disk.used,
    load: readLoad(),
    uptimeSec: readUptime(),
    ts: Date.now(),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "/";
const MAX_READ = 512 * 1024;
const MAX_LIST = 400;
const MAX_WRITE = 2 * 1024 * 1024;

function resolveSafe(input: string | null): string {
  const raw = input && input.trim() !== "" ? input : HOME;
  return path.resolve(raw.startsWith("~") ? raw.replace(/^~/, HOME) : raw);
}

/** mutation guard — kernel interfaces and system config stay read-only */
const WRITE_DENY = [/^\/proc/, /^\/sys/, /^\/dev/, /^\/run/, /^\/etc/, /^\/boot/, /^\/usr/];

function assertMutable(target: string): string | null {
  for (const re of WRITE_DENY) {
    if (re.test(target)) {
      return `write denied on protected path: ${target}`;
    }
  }
  return null;
}

/* GET ?path= — list dir | GET ?path=&mode=read — read file */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const target = resolveSafe(sp.get("path"));
  const mode = sp.get("mode") ?? "list";

  try {
    const stat = await fs.stat(target);

    if (mode === "read") {
      if (!stat.isFile()) {
        return NextResponse.json({ error: "not a file" }, { status: 400 });
      }
      if (stat.size > MAX_READ) {
        return NextResponse.json({
          path: target,
          size: stat.size,
          truncated: true,
          binary: true,
          content: null,
        });
      }
      const buf = await fs.readFile(target);
      if (buf.includes(0)) {
        return NextResponse.json({
          path: target,
          size: stat.size,
          binary: true,
          content: null,
        });
      }
      return NextResponse.json({
        path: target,
        size: stat.size,
        binary: false,
        content: buf.toString("utf8"),
      });
    }

    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "not a directory" }, { status: 400 });
    }
    const dirents = await fs.readdir(target, { withFileTypes: true });
    const entries = [];
    for (const d of dirents.slice(0, MAX_LIST)) {
      try {
        const s = await fs.stat(path.join(target, d.name));
        entries.push({
          name: d.name,
          isDir: d.isDirectory(),
          size: s.size,
          mtime: s.mtime.toISOString(),
        });
      } catch {
        entries.push({ name: d.name, isDir: d.isDirectory(), size: 0, mtime: null });
      }
    }
    entries.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
    );
    const parent = path.dirname(target);
    return NextResponse.json({
      path: target,
      parent: parent === target ? null : parent,
      entries,
      truncated: dirents.length > MAX_LIST,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "io error" },
      { status: 400 },
    );
  }
}

/* POST {op: write|mkdir|touch|delete, path, content? , name?} */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    op?: string;
    path?: string;
    content?: string;
    name?: string;
  } | null;
  if (!body?.op || !body.path) {
    return NextResponse.json({ error: "op and path required" }, { status: 400 });
  }
  const target = resolveSafe(body.path);
  const denial = assertMutable(target);
  if (denial) {
    return NextResponse.json({ error: denial }, { status: 403 });
  }

  try {
    switch (body.op) {
      case "write": {
        const content = String(body.content ?? "");
        if (content.length > MAX_WRITE) {
          return NextResponse.json({ error: "payload too large" }, { status: 413 });
        }
        await fs.writeFile(target, content, "utf8");
        const s = await fs.stat(target);
        return NextResponse.json({ ok: true, size: s.size });
      }
      case "mkdir": {
        if (!body.name || /[/\\]/.test(body.name) || body.name === "." || body.name === "..")
          return NextResponse.json({ error: "bad name" }, { status: 400 });
        await fs.mkdir(path.join(target, body.name));
        return NextResponse.json({ ok: true });
      }
      case "touch": {
        if (!body.name || /[/\\]/.test(body.name) || body.name === "." || body.name === "..")
          return NextResponse.json({ error: "bad name" }, { status: 400 });
        const fh = await fs.open(path.join(target, body.name), "a");
        await fh.close();
        return NextResponse.json({ ok: true });
      }
      case "delete": {
        await fs.rm(target, { recursive: true, force: true });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "unknown op" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "io error" },
      { status: 400 },
    );
  }
}

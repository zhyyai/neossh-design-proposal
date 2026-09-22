"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Folder,
  File,
  ArrowUp,
  RefreshCw,
  FolderPlus,
  FilePlus,
  Trash2,
  X,
  HardDrive,
  ChevronRight,
  Save,
  FileWarning,
} from "lucide-react";
import { cn, fmtBytes, timeAgo } from "@/lib/utils";

interface FsEntry {
  name: string;
  isDir: boolean;
  size: number;
  mtime: string | null;
}

interface Editor {
  path: string;
  name: string;
  content: string;
  size: number;
  dirty: boolean;
}

function join(p: string, name: string): string {
  return p === "/" ? `/${name}` : `${p}/${name}`;
}

export default function FileExplorer({ onClose }: { onClose: () => void }) {
  const [cwd, setCwd] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [binaryPath, setBinaryPath] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [creating, setCreating] = useState<"dir" | "file" | null>(null);
  const [newName, setNewName] = useState("");
  const [savedTick, setSavedTick] = useState(false);

  const load = useCallback(async (p?: string | null) => {
    setLoading(true);
    setError(null);
    setEditor(null);
    setBinaryPath(null);
    setConfirmDel(null);
    try {
      const url = p ? `/api/fs?path=${encodeURIComponent(p)}` : "/api/fs";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "io error");
      setCwd(json.path);
      setParent(json.parent);
      setEntries(json.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "io error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(null);
  }, [load]);

  const openFile = async (name: string) => {
    if (!cwd) return;
    const p = join(cwd, name);
    setLoading(true);
    setBinaryPath(null);
    try {
      const res = await fetch(
        `/api/fs?mode=read&path=${encodeURIComponent(p)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "io error");
      if (json.binary) {
        setBinaryPath(p);
        setEditor(null);
      } else {
        setEditor({
          path: json.path,
          name,
          content: json.content ?? "",
          size: json.size,
          dirty: false,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "io error");
    } finally {
      setLoading(false);
    }
  };

  const save = useCallback(async () => {
    setEditor((cur) => {
      if (!cur) return cur;
      void (async () => {
        await fetch("/api/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "write", path: cur.path, content: cur.content }),
        }).catch(() => undefined);
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1200);
      })();
      return { ...cur, dirty: false, size: cur.content.length };
    });
  }, []);

  const createEntry = async () => {
    if (!cwd || !newName.trim()) return;
    const op = creating === "dir" ? "mkdir" : "touch";
    await fetch("/api/fs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, path: cwd, name: newName.trim() }),
    }).catch(() => undefined);
    setCreating(null);
    setNewName("");
    load(cwd);
  };

  const deleteEntry = async (name: string) => {
    if (!cwd) return;
    if (confirmDel !== name) {
      setConfirmDel(name);
      return;
    }
    await fetch("/api/fs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", path: join(cwd, name) }),
    }).catch(() => undefined);
    setConfirmDel(null);
    load(cwd);
  };

  const crumbs = cwd ? cwd.split("/").filter(Boolean) : [];

  return (
    <div className="flex h-full w-full flex-col border-l border-line bg-void">
      {/* header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-panel px-3">
        <span className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-400 uppercase">
          <HardDrive className="h-3.5 w-3.5 text-cyanx" />
          sandbox:// fs
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCreating("file")}
            className="p-1.5 text-zinc-500 transition-colors hover:text-neon"
            title="new file"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCreating("dir")}
            className="p-1.5 text-zinc-500 transition-colors hover:text-neon"
            title="new directory"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => load(cwd)}
            className="p-1.5 text-zinc-500 transition-colors hover:text-neon"
            title="refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 transition-colors hover:text-dangerx"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editor ? (
        /* ---------- inline editor ---------- */
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2">
            <button
              onClick={() => setEditor(null)}
              className="p-1 text-zinc-500 hover:text-zinc-200"
            >
              <ArrowUp className="h-3.5 w-3.5 rotate-90" />
            </button>
            <span className="min-w-0 flex-1 truncate text-[11px] text-cyanx">
              {editor.path}
            </span>
            <span className="text-[9px] text-zinc-600">{fmtBytes(editor.size)}</span>
            <button
              onClick={save}
              className={cn(
                "flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase transition-all",
                editor.dirty
                  ? "border-neon/60 bg-neon/10 text-neon hover:bg-neon hover:text-black"
                  : "border-line text-zinc-500",
              )}
            >
              <Save className="h-3 w-3" />
              {savedTick ? "saved ✓" : "save"}
            </button>
          </div>
          <textarea
            value={editor.content}
            onChange={(e) => setEditor({ ...editor, content: e.target.value, dirty: true })}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                save();
              }
            }}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-[#020403] p-3 font-mono text-[12px] leading-relaxed text-zinc-200 outline-none"
          />
          <div className="border-t border-line px-3 py-1.5 text-[9px] tracking-[0.2em] text-zinc-600 uppercase">
            ⌃s / ⌘s to write · edits land on the sandbox fs
          </div>
        </div>
      ) : (
        /* ---------- listing ---------- */
        <>
          {/* breadcrumbs */}
          <div className="flex items-center gap-0.5 overflow-x-auto border-b border-line px-3 py-2 text-[10px]">
            <button
              onClick={() => load("/")}
              className="shrink-0 text-zinc-500 hover:text-neon"
            >
              /
            </button>
            {crumbs.map((seg, i) => (
              <span key={i} className="flex shrink-0 items-center gap-0.5">
                <ChevronRight className="h-2.5 w-2.5 text-zinc-700" />
                <button
                  onClick={() => load("/" + crumbs.slice(0, i + 1).join("/"))}
                  className={cn(
                    "hover:text-neon",
                    i === crumbs.length - 1 ? "text-neon-hi" : "text-zinc-500",
                  )}
                >
                  {seg}
                </button>
              </span>
            ))}
            {parent !== null && (
              <button
                onClick={() => load(parent)}
                className="ml-auto flex shrink-0 items-center gap-1 border border-line px-1.5 py-0.5 text-[9px] text-zinc-500 uppercase hover:text-neon"
              >
                <ArrowUp className="h-2.5 w-2.5" /> up
              </button>
            )}
          </div>

          {/* inline create */}
          {creating && (
            <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2">
              {creating === "dir" ? (
                <Folder className="h-3.5 w-3.5 text-cyanx" />
              ) : (
                <File className="h-3.5 w-3.5 text-cyanx" />
              )}
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createEntry();
                  if (e.key === "Escape") setCreating(null);
                }}
                placeholder={creating === "dir" ? "directory name ↵" : "file name ↵"}
                className="h-7 flex-1 border border-line bg-void px-2 text-[11px] text-zinc-200 outline-none focus:border-neon/60"
              />
              <button
                onClick={() => setCreating(null)}
                className="text-zinc-600 hover:text-dangerx"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* binary notice */}
          {binaryPath && (
            <div className="flex items-center gap-2 border-b border-amberx/30 bg-amberx/5 px-3 py-2 text-[10px] text-amberx">
              <FileWarning className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{binaryPath}</span> — binary or empty,
              inline editor refused
            </div>
          )}

          {error && (
            <div className="border-b border-dangerx/30 bg-dangerx/5 px-3 py-2 text-[10px] text-dangerx">
              {error}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {entries.map((e) => (
              <div
                key={e.name}
                className="group flex items-center gap-2 border-b border-line/40 px-3 py-1.5 transition-colors hover:bg-lift"
              >
                {e.isDir ? (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-cyanx" />
                ) : (
                  <File className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                )}
                <button
                  onClick={() => (e.isDir ? load(join(cwd ?? "/", e.name)) : openFile(e.name))}
                  className="min-w-0 flex-1 truncate text-left text-[11.5px] text-zinc-200 hover:text-neon-hi"
                  title={e.name}
                >
                  {e.name}
                </button>
                <span className="shrink-0 text-[9px] text-zinc-600">
                  {e.isDir ? "dir" : fmtBytes(e.size)}
                </span>
                <span className="hidden shrink-0 text-[9px] text-zinc-700 sm:inline">
                  {e.mtime ? timeAgo(e.mtime) : ""}
                </span>
                <button
                  onClick={() => deleteEntry(e.name)}
                  className={cn(
                    "shrink-0 transition-colors",
                    confirmDel === e.name
                      ? "text-dangerx animate-pulse"
                      : "text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-dangerx",
                  )}
                  title={confirmDel === e.name ? "click again to confirm" : "delete"}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {entries.length === 0 && !loading && (
              <div className="px-3 py-10 text-center text-[10px] tracking-[0.25em] text-zinc-600 uppercase">
                empty volume
              </div>
            )}
          </div>
          <div className="border-t border-line px-3 py-1.5 text-[9px] tracking-[0.2em] text-zinc-600 uppercase">
            {entries.length} inodes · live on sandbox disk
          </div>
        </>
      )}
    </div>
  );
}

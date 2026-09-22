"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Lang = "en" | "zh";
export type Mode = "dark" | "light";
export type FontId = "jetbrains" | "plex" | "fira" | "system";

export const FONT_OPTIONS: Array<{
  id: FontId;
  label: string;
  stack: string;
}> = [
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    stack:
      'var(--font-jbmono), ui-monospace, Menlo, "PingFang SC", "Microsoft YaHei", monospace',
  },
  {
    id: "plex",
    label: "IBM Plex Mono",
    stack:
      'var(--font-plexmono), var(--font-jbmono), ui-monospace, "PingFang SC", "Microsoft YaHei", monospace',
  },
  {
    id: "fira",
    label: "Fira Code",
    stack:
      'var(--font-fira), var(--font-jbmono), ui-monospace, "PingFang SC", "Microsoft YaHei", monospace',
  },
  {
    id: "system",
    label: "System Mono",
    stack:
      'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace',
  },
];

export function fontStackFor(id: FontId): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.stack ?? FONT_OPTIONS[0].stack;
}

/* ------------------------- dictionary ------------------------- */

const DICT = {
  // nav / shell
  "nav.dashboard": ["Dashboard", "仪表盘"],
  "nav.terminal": ["Terminal", "终端"],
  "nav.hosts": ["Hosts", "主机"],
  "nav.tunnels": ["Tunnels", "隧道"],
  "nav.snippets": ["Snippets", "片段"],
  "nav.audit": ["Audit Trail", "审计追踪"],
  "nav.replays": ["Replays", "录像回放"],
  "shell.modules": ["fabric modules", "功能模块"],
  "shell.grid": ["Command grid", "命令面板"],
  "shell.exit": ["Exit fabric", "退出矩阵"],
  "shell.node": ["NODE", "节点"],
  "shell.fabric": ["fabric", "母网"],
  "shell.ptyLive": ["PTY LIVE", "PTY 在线"],

  "title.dashboard": ["mission control", "任务控制"],
  "title.terminal": ["terminal fabric", "终端矩阵"],
  "title.hosts": ["host inventory", "主机清单"],
  "title.tunnels": ["tunnel cartography", "隧道拓扑"],
  "title.snippets": ["snippet armory", "片段弹药库"],
  "title.audit": ["audit trail", "审计追踪"],
  "title.replays": ["session replay vault", "会话录像库"],

  // controls
  "ctl.lang": ["中文界面", "English UI"],
  "ctl.mode": ["Switch to light mode", "切换到暗色模式"],
  "ctl.font": ["Terminal & UI font", "终端与界面字体"],

  // dashboard
  "dash.hostsIn": ["Hosts in inventory", "在册主机"],
  "dash.acrossGroups": ["across 6 groups", "覆盖 6 个分组"],
  "dash.ptyLive": ["PTY sessions live", "活跃 PTY 会话"],
  "dash.polled": ["polled every 4s", "每 4 秒轮询"],
  "dash.cmdAudited": ["Commands audited", "已审计命令"],
  "dash.keystroke": ["keystroke-level capture", "击键级捕获"],
  "dash.dangerBlocked": ["Danger blocked", "已拦截危险操作"],
  "dash.quarantined": ["quarantined by risk engine", "由风险引擎隔离"],
  "dash.velocity": ["Command velocity — 7 days", "命令速率 — 近 7 日"],
  "dash.sealed": ["SEALED STORE", "封存存储"],
  "dash.liveChannels": ["Live channels", "实时通道"],
  "dash.new": ["NEW", "新建"],
  "dash.quiet": ["no live channels — the mesh is quiet", "暂无在线通道 — 网格静默"],
  "dash.recent": ["Recent sessions — audit trail", "最近会话 — 审计轨迹"],
  "dash.fullTrail": ["full trail →", "完整审计 →"],
  "dash.quickConnect": ["Quick connect", "快捷连接"],
  "dash.allHosts": ["all hosts →", "全部主机 →"],

  // terminal
  "term.targets": ["link targets", "连接目标"],
  "term.sandbox": ["sandbox shell", "沙箱终端"],
  "term.armory": ["armory · tap to load", "弹药库 · 点击装填"],
  "term.armoryHint": [
    "click loads the payload into the active shell — you press ↵.",
    "点击将命令装入当前终端 — 由你按下 ↵。",
  ],
  "term.castAll": ["cast:all", "广播：全发"],
  "term.castOne": ["cast:one", "广播：单发"],
  "term.armed": [
    "broadcast armed — {n} shells synchronized",
    "广播已开启 — {n} 个终端已同步",
  ],
  "term.spinning": ["spinning up channel…", "正在建立通道…"],
  "term.riskArmed": ["risk engine: armed", "风险引擎：已开启"],
  "term.files": ["files", "文件"],
  "term.uptime": ["uptime", "在线"],
  "term.live": ["live", "在线"],

  // landing
  "land.compare": ["COMPARE", "对比"],
  "land.arsenal": ["ARSENAL", "武器库"],
  "land.risk": ["RISK ENGINE", "风险引擎"],
  "land.console": ["CONSOLE", "控制台"],
  "land.badge": [
    "POST-BASTION OPERATIONS FABRIC",
    "后堡垒机 · 运维矩阵",
  ],
  "land.tagline": [
    "One artifact. Zero dependencies. GPU-rendered shells, keystroke forensics, tunnel cartography and command broadcast — everything a bastion host does, distilled into a terminal that fits in your browser tab.",
    "单文件交付，零外部依赖。GPU 渲染终端、击键取证、隧道拓扑、命令广播 — 堡垒机的一切能力，浓缩进一个浏览器标签页。",
  ],
  "land.jackin": ["JACK IN", "立即接入"],
  "land.thecase": ["THE CASE", "先看对比"],
  "land.statFile": ["single file", "单文件"],
  "land.statRss": ["idle RSS", "空闲内存"],
  "land.statBoot": ["cold boot", "冷启动"],
  "land.cmpTag": ["the weight problem", "体重问题"],
  "land.cmpTitleA": ["Bastions got", "传统堡垒机"],
  "land.cmpTitleB": ["obese.", "过于臃肿"],
  "land.cmpTitleC": ["We didn't.", "而我们没有。"],
  "land.cmpP": [
    "JumpServer asks for MySQL, Redis and ten containers before it says hello. Guacamole drags a JVM behind it. NEOSSH is a single file that boots before your finger leaves the key — and renders every frame on the GPU.",
    "JumpServer 先要 MySQL、Redis 和十个容器才肯启动；Guacamole 身后还拖着 JVM。NEOSSH 只是一个文件，按键未离已启动完毕 — 每一帧都由 GPU 渲染。",
  ],
  "land.cmpDep": ["external dependency — none", "外部依赖 — 为零"],
  "land.cmpCpu": ["CPU at idle", "空闲 CPU 占用"],
  "land.arsTag": ["the arsenal", "武器库"],
  "land.arsTitle": ["Weaponized for", "为操作员"],
  "land.arsTitleHi": [" operators.", "量身打造"],
  "land.arsP": [
    "Six systems, one fabric. Everything below is live in this build — open the console and touch it.",
    "六大系统，一张矩阵。以下功能在此构建中全部真实可用 — 打开控制台亲手试试。",
  ],
  "land.riskTag": ["blast-radius control", "爆炸半径控制"],
  "land.riskTitleA": ["It reads the command", "它先于 shell"],
  "land.riskTitleB": ["before the shell does.", "读懂每条命令"],
  "land.riskP": [
    "An inline pattern engine scores every line for blast radius — fork bombs, disk writers, permission wipes, pipe-to-shell installers. Dangerous input is quarantined mid-flight and sealed into the audit trail with the operator's identity.",
    "内联模式引擎为每一行命令评估爆炸半径 — fork 炸弹、磁盘写入、权限清空、管道安装脚本……危险输入在飞行途中即被隔离，并与操作者身份一同封存进审计链。",
  ],
  "land.riskLink": ["inspect the audit trail", "查看审计轨迹"],
  "land.ctaTitle": ["UNPLUG THE ", "从此告别"],
  "land.ctaTitleHi": ["BASTION.", "堡垒机"],
  "land.ctaSub": [
    "The full fabric is running behind this page. Step into the console and open a live PTY — right now.",
    "完整矩阵正在本页背后运行。进入控制台，立刻打开一个真实 PTY。",
  ],
  "land.enterConsole": ["ENTER CONSOLE", "进入控制台"],
  "land.rawTerminal": ["RAW TERMINAL", "原始终端"],

  // misc buttons
  "btn.addHost": ["Add host", "添加主机"],
  "btn.forge": ["Forge snippet", "锻造片段"],
  "btn.carve": ["carve tunnel", "开凿隧道"],
  "aud.commands": ["commands", "命令"],
  "aud.sessions": ["sessions", "会话"],
  "rep.takes": ["sealed takes", "封存录像"],
  "rep.select": ["select a take to screen it", "选择一条录像开始回放"],
  "rep.none": ["no takes sealed yet", "暂无封存录像"],
} as const;

export type DictKey = keyof typeof DICT;

/* ------------------------- context ------------------------- */

interface Prefs {
  lang: Lang;
  mode: Mode;
  font: FontId;
  setLang: (l: Lang) => void;
  setMode: (m: Mode) => void;
  setFont: (f: FontId) => void;
  toggleLang: () => void;
  toggleMode: () => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<Prefs | null>(null);
const STORAGE_KEY = "neossh:prefs";

function isLang(v: unknown): v is Lang {
  return v === "en" || v === "zh";
}
function isMode(v: unknown): v is Mode {
  return v === "dark" || v === "light";
}
function isFont(v: unknown): v is FontId {
  return FONT_OPTIONS.some((f) => f.id === v);
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<Mode>("dark");
  const [font, setFont] = useState<FontId>("jetbrains");

  // hydrate from localStorage once (async to avoid render-phase cascades)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const p = JSON.parse(raw) as Record<string, unknown>;
        if (isLang(p.lang)) setLang(p.lang);
        if (isMode(p.mode)) setMode(p.mode);
        if (isFont(p.font)) setFont(p.font);
      } catch {
        /* noop */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // reflect onto <html> + persist
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.lang = lang;
    el.dataset.mode = mode;
    el.dataset.font = font;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang, mode, font }));
    } catch {
      /* noop */
    }
  }, [lang, mode, font]);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      const entry = DICT[key];
      if (!entry) return key;
      let out: string = lang === "zh" ? entry[1] : entry[0];
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replaceAll(`{${k}}`, String(v));
        }
      }
      return out;
    },
    [lang],
  );

  const value = useMemo<Prefs>(
    () => ({
      lang,
      mode,
      font,
      setLang,
      setMode,
      setFont,
      toggleLang: () => setLang((l) => (l === "en" ? "zh" : "en")),
      toggleMode: () => setMode((m) => (m === "dark" ? "light" : "dark")),
      t,
    }),
    [lang, mode, font, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}

import { count } from "drizzle-orm";
import { db } from "@/db";
import { commandLogs, hosts, sessions, snippets, tunnels } from "@/db/schema";

const day = 24 * 60 * 60 * 1000;

async function doSeed() {
  const existing = await db.select({ value: count() }).from(hosts);
  if (Number(existing[0]?.value ?? 0) > 0) return;

  await db.insert(hosts).values([
    {
      name: "core-prod-01",
      hostname: "10.0.4.21",
      port: 22,
      username: "deploy",
      authType: "key",
      groupName: "production",
      tags: ["web", "nginx", "critical"],
      color: "#00ff9c",
      notes: "Primary production web node behind the edge balancer.",
    },
    {
      name: "db-prod-01",
      hostname: "10.0.4.30",
      port: 2222,
      username: "postgres",
      authType: "key",
      groupName: "production",
      tags: ["postgres", "critical", "encrypted"],
      color: "#3ee6ff",
      notes: "Primary PostgreSQL 16 cluster leader.",
    },
    {
      name: "cache-redis-01",
      hostname: "10.0.5.12",
      port: 22,
      username: "redis",
      authType: "password",
      groupName: "production",
      tags: ["redis", "cache"],
      color: "#ff4d6d",
    },
    {
      name: "staging-web-01",
      hostname: "10.1.2.40",
      port: 22,
      username: "deploy",
      authType: "key",
      groupName: "staging",
      tags: ["web", "canary"],
      color: "#ffb454",
    },
    {
      name: "gpu-infer-01",
      hostname: "172.16.8.90",
      port: 22,
      username: "mlops",
      authType: "key",
      groupName: "ml",
      tags: ["gpu", "a100", "inference"],
      color: "#a78bfa",
      notes: "LLM inference node — 2x A100, hot spare.",
    },
    {
      name: "edge-tokyo-02",
      hostname: "203.0.113.44",
      port: 62222,
      username: "edgeops",
      authType: "agent",
      groupName: "edge",
      tags: ["cdn", "tokyo", "anycast"],
      color: "#3ee6ff",
    },
    {
      name: "bastion-eu",
      hostname: "198.51.100.7",
      port: 22,
      username: "ops",
      authType: "key",
      groupName: "infrastructure",
      tags: ["bastion", "jump", "mfa"],
      color: "#00ff9c",
      notes: "EU jump host. All prod traffic flows through here.",
    },
    {
      name: "k8s-node-07",
      hostname: "10.2.6.117",
      port: 22,
      username: "kube",
      authType: "key",
      groupName: "kubernetes",
      tags: ["k8s", "worker"],
      color: "#ffb454",
    },
  ]);

  await db.insert(snippets).values([
    {
      title: "Hunt memory hogs",
      command: "ps aux --sort=-%mem | head -15",
      description: "Top 15 processes sorted by resident memory usage.",
      category: "diagnostics",
      danger: false,
      usageCount: 42,
    },
    {
      title: "Largest directories",
      command: "du -h -d1 /var 2>/dev/null | sort -hr | head -20",
      description: "Rank top-level /var directories by disk consumption.",
      category: "disk",
      danger: false,
      usageCount: 31,
    },
    {
      title: "Tail app logs live",
      command: "tail -Fn 100 /var/log/app/*.log | grep --line-buffered -i error",
      description: "Follow all app logs and stream only error lines.",
      category: "logs",
      danger: false,
      usageCount: 27,
    },
    {
      title: "Who holds port 3000",
      command: "ss -tulpn | grep :3000",
      description: "Find which process is bound to TCP port 3000.",
      category: "network",
      danger: false,
      usageCount: 25,
    },
    {
      title: "Quick local tunnel",
      command: "ssh -L 8080:127.0.0.1:80 -N ops@bastion-eu",
      description: "Forward local :8080 to the web port via bastion.",
      category: "tunnel",
      danger: false,
      usageCount: 19,
    },
    {
      title: "Docker footprint",
      command: "docker system df -v 2>/dev/null | head -30",
      description: "Images, containers and volume disk usage summary.",
      category: "containers",
      danger: false,
      usageCount: 17,
    },
    {
      title: "Kernel ring errors",
      command: "dmesg --level=err,crit,alert,emerg -T | tail -30",
      description: "Last 30 kernel errors with human timestamps.",
      category: "diagnostics",
      danger: false,
      usageCount: 12,
    },
    {
      title: "Purge old logs (CAREFUL)",
      command: "find /var/log -name '*.gz' -mtime +30 -delete",
      description: "Deletes rotated logs older than 30 days. Irreversible.",
      category: "maintenance",
      danger: true,
      usageCount: 6,
    },
    {
      title: "Force kill by name",
      command: "pkill -9 -f node_worker",
      description: "SIGKILL every process matching node_worker.",
      category: "process",
      danger: true,
      usageCount: 9,
    },
    {
      title: "Cert expiry check",
      command: "echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates",
      description: "Print TLS certificate validity window for a host.",
      category: "security",
      danger: false,
      usageCount: 14,
    },
  ]);

  await db.insert(tunnels).values([
    {
      name: "grafana-via-bastion",
      type: "local",
      localPort: 3000,
      remoteHost: "10.0.4.21",
      remotePort: 3000,
      viaHost: "bastion-eu",
      status: "active",
      bytesTotal: 482 * 1024 * 1024,
    },
    {
      name: "postgres-admin",
      type: "local",
      localPort: 15432,
      remoteHost: "10.0.4.30",
      remotePort: 5432,
      viaHost: "bastion-eu",
      status: "active",
      bytesTotal: 121 * 1024 * 1024,
    },
    {
      name: "socks-recon-edge",
      type: "dynamic",
      localPort: 1080,
      remoteHost: "-",
      remotePort: 0,
      viaHost: "edge-tokyo-02",
      status: "stopped",
      bytesTotal: 0,
    },
    {
      name: "expose-staging-web",
      type: "remote",
      localPort: 80,
      remoteHost: "0.0.0.0",
      remotePort: 8080,
      viaHost: "staging-web-01",
      status: "stopped",
      bytesTotal: 64 * 1024,
    },
  ]);

  const hostLabels = [
    ["core-prod-01", "10.0.4.21"],
    ["db-prod-01", "10.0.4.30"],
    ["gpu-infer-01", "172.16.8.90"],
    ["edge-tokyo-02", "203.0.113.44"],
  ] as const;

  const sessionSeeds = [0, 1, 2, 3, 5, 8, 13].map((d, i) => {
    const started = new Date(Date.now() - d * day - i * 3600_000);
    const ended = new Date(started.getTime() + (12 + i * 7) * 60_000);
    return {
      hostLabel: hostLabels[i % hostLabels.length][0],
      target: hostLabels[i % hostLabels.length][1],
      mode: "ssh",
      status: "closed",
      exitCode: 0,
      startedAt: started,
      endedAt: ended,
    };
  });
  await db.insert(sessions).values(sessionSeeds);

  const cmds: Array<[string, string, number]> = [
    ["uptime && free -h", "safe", 0],
    ["tail -Fn 100 /var/log/nginx/access.log", "safe", 0],
    ["sudo systemctl restart nginx", "warn", 1],
    ["ps aux --sort=-%mem | head -15", "safe", 1],
    ["journalctl -u postgres --since today | tail -40", "safe", 2],
    ["ss -tulpn | grep LISTEN", "safe", 2],
    ["sudo kill -9 4177", "danger", 3],
    ["docker system df -v | head -20", "safe", 3],
    ["df -h | awk '$5+0 > 80'", "safe", 4],
    ["curl -s localhost:9090/metrics | head", "safe", 5],
    ["sudo iptables -L INPUT -n --line-numbers", "warn", 5],
    ["nvidia-smi --query-gpu=utilization.gpu --format=csv", "safe", 6],
    ["git -C /srv/app pull --rebase", "safe", 8],
    ["sudo apt-get update -qq", "warn", 9],
    ["htop -t -s PERCENT_CPU", "safe", 10],
    ["rm -rf /tmp/build-cache/*", "danger", 12],
    ["who -a", "safe", 13],
    ["tcpdump -i any -c 50 port 53", "warn", 13],
    ["last -20 | head", "safe", 14],
    ["ls -lah /var/backups | tail", "safe", 14],
  ];

  await db.insert(commandLogs).values(
    cmds.map(([command, risk, d], i) => ({
      sessionId: `seed-${i}`,
      hostLabel: hostLabels[i % hostLabels.length][0],
      command,
      risk,
      executedAt: new Date(Date.now() - d * day * 0.6 - i * 1200_000),
    })),
  );
}

let seedPromise: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = doSeed().catch((err) => {
      seedPromise = null;
      console.error("[neossh] seed failed", err);
    });
  }
  return seedPromise;
}

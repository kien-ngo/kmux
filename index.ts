#!/usr/bin/env bun
import { select, input } from "@inquirer/prompts";
import pc from "picocolors";
import { $ } from "bun";

interface TmuxSession {
  name: string;
  windows: number;
  created: string;
  attached: boolean;
}

const log = {
  success: (msg: string) => console.log(`${pc.green("*")} ${msg}`),
  error: (msg: string) => console.log(`${pc.red("!")} ${msg}`),
  warn: (msg: string) => console.log(`${pc.yellow("!")} ${msg}`),
  info: (msg: string) => console.log(`${pc.blue("i")} ${msg}`),
};

const intro = (msg: string) => console.log(pc.cyan(`\n${msg}\n`));
const outro = (msg: string) => console.log(pc.cyan(`\n${msg}\n`));

async function checkTmuxInstalled(): Promise<boolean> {
  try {
    await $`tmux -V`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function getTmuxSessions(): Promise<TmuxSession[]> {
  try {
    const result =
      await $`tmux list-sessions -F "#{session_name}|#{session_windows}|#{session_created}|#{session_attached}"`.quiet();
    const output = result.text().trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [name, windows, created, attached] = line.split("|");
      const createdTimestamp = parseInt(created ?? "0", 10);
      return {
        name: name ?? "",
        windows: parseInt(windows ?? "0", 10),
        created: createdTimestamp > 0 
          ? new Date(createdTimestamp * 1000).toLocaleString() 
          : "Unknown",
        attached: attached === "1",
      };
    });
  } catch {
    return [];
  }
}

async function attachSession(sessionName: string): Promise<void> {
  const proc = Bun.spawn(["tmux", "attach-session", "-t", sessionName], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

async function killSession(sessionName: string): Promise<void> {
  try {
    await $`tmux kill-session -t ${sessionName}`.quiet();
    log.success(`Killed session: ${sessionName}`);
  } catch (error) {
    log.error(`Failed to kill session: ${sessionName}`);
  }
}

async function createSession(sessionName?: string): Promise<void> {
  const args = ["tmux", "new-session"];
  if (sessionName) {
    args.push("-s", sessionName);
  }
  const proc = Bun.spawn(args, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

async function selectSession(
  sessions: TmuxSession[],
  action: "attach" | "kill"
): Promise<string | null> {
  if (sessions.length === 0) {
    log.warn("No tmux sessions found.");
    return null;
  }

  const actionText = action === "attach" ? "attach to" : "kill";

  try {
    const selected = await select({
      message: `Select a session to ${actionText}:`,
      choices: sessions.map((s) => ({
        name: `${s.name} (${s.windows} window${s.windows !== 1 ? "s" : ""})${
          s.attached ? " [attached]" : ""
        }`,
        value: s.name,
        description: `Created: ${s.created}`,
      })),
      theme: {
        prefix: pc.green(">"),
        icon: { cursor: ">" },
        style: {
          highlight: (text) => pc.green(pc.bold(text)), // Bold green for better visibility
          description: (text) => pc.cyan(text),
          keysHelpTip: () => "", // Hide help legend
        },
      },
    });

    return selected;
  } catch (error) {
    return null;
  }
}

const pkgName = "kmux";

function printUsage(): void {
  console.log(`
${pkgName} - A friendly tmux session navigator

Usage:
  ${pkgName} ls            [l]ist sessions and select one to attach
  ${pkgName} a             [a]ttach to a session (interactive)
  ${pkgName} a [name]      [a]ttach to a specific session by name
  ${pkgName} c [name]      [c]reate a new session (optional name)
  ${pkgName} k             [k]ill a session (interactive)
  ${pkgName} help          Show this help message

Navigation:
  Use arrow keys to navigate, Enter to select
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    printUsage();
    return;
  }

  if (!(await checkTmuxInstalled())) {
    log.error("Error: tmux is not installed. Please install tmux first.");
    process.exit(1);
  }

  switch (command) {
    case "ls":
    case "l": {
      intro(`${pkgName} - List sessions`);
      const sessions = await getTmuxSessions();
      const selected = await selectSession(sessions, "attach");
      if (selected) {
        outro(`Attaching to session: ${selected}`);
        await attachSession(selected);
      } else {
        outro("Cancelled.");
      }
      break;
    }

    case "a": {
      const sessionName = args[1];
      if (sessionName) {
        await attachSession(sessionName);
      } else {
        intro(`${pkgName} - Attach to session`);
        const sessions = await getTmuxSessions();
        const selected = await selectSession(sessions, "attach");
        if (selected) {
          outro(`Attaching to session: ${selected}`);
          await attachSession(selected);
        } else {
          outro("Cancelled.");
        }
      }
      break;
    }

    case "k": {
      intro(`${pkgName} - Kill session`);
      const sessions = await getTmuxSessions();
      const selected = await selectSession(sessions, "kill");
      if (selected) {
        await killSession(selected);
        outro("Done.");
      } else {
        outro("Cancelled.");
      }
      break;
    }

    case "c": {
      let sessionName = args[1];
      if (!sessionName) {
        intro(`${pkgName} - Create session`);
        try {
          const name = await input({
            message: "Session name (leave empty for default):",
            default: "",
            theme: {
              prefix: pc.green(">"),
            }
          });
          sessionName = name as string;
          outro(`Creating session: ${sessionName || "default"}`);
        } catch (error) {
          outro("Cancelled.");
          return;
        }
      }
      await createSession(sessionName || undefined);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  log.error("An unexpected error occurred.");
  console.error(error);
  process.exit(1);
});

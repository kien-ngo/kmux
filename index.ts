#!/usr/bin/env bun
import { select } from "@inquirer/prompts";
import { $ } from "bun";

interface TmuxSession {
  name: string;
  windows: number;
  created: string;
  attached: boolean;
}

async function checkTmuxInstalled(): Promise<boolean> {
  try {
    await $`which tmux`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function getTmuxSessions(): Promise<TmuxSession[]> {
  try {
    const result = await $`tmux list-sessions -F "#{session_name}|#{session_windows}|#{session_created}|#{session_attached}"`.quiet();
    const output = result.text().trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [name, windows, created, attached] = line.split("|");
      return {
        name: name ?? "",
        windows: parseInt(windows ?? "0", 10),
        created: new Date(parseInt(created ?? "0", 10) * 1000).toLocaleString(),
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
    console.log(`Killed session: ${sessionName}`);
  } catch (error) {
    console.error(`Failed to kill session: ${sessionName}`);
  }
}

async function selectSession(
  sessions: TmuxSession[],
  action: "attach" | "kill"
): Promise<string | null> {
  if (sessions.length === 0) {
    console.log("No tmux sessions found.");
    return null;
  }

  const actionText = action === "attach" ? "attach to" : "kill";

  const answer = await select({
    message: `Select a session to ${actionText}:`,
    choices: sessions.map((s) => ({
      name: `${s.name} (${s.windows} window${s.windows !== 1 ? "s" : ""})${s.attached ? " [attached]" : ""}`,
      value: s.name,
      description: `Created: ${s.created}`,
    })),
  });

  return answer;
}

function printUsage(): void {
  console.log(`
kmux - A better tmux session navigator

Usage:
  kmux ls    List sessions and select one to attach
  kmux a     Attach to a session (interactive)
  kmux k     Kill a session (interactive)
  kmux help  Show this help message

Navigation:
  Use arrow keys to navigate, Enter to select
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "ls":
    case "a":
    case "attach": {
      if (!(await checkTmuxInstalled())) {
        console.error("Error: tmux is not installed. Please install tmux first.");
        process.exit(1);
      }
      const sessions = await getTmuxSessions();
      const selected = await selectSession(sessions, "attach");
      if (selected) {
        await attachSession(selected);
      }
      break;
    }

    case "k":
    case "kill": {
      if (!(await checkTmuxInstalled())) {
        console.error("Error: tmux is not installed. Please install tmux first.");
        process.exit(1);
      }
      const sessions = await getTmuxSessions();
      const selected = await selectSession(sessions, "kill");
      if (selected) {
        await killSession(selected);
      }
      break;
    }

    case "help":
    case "--help":
    case "-h":
      printUsage();
      break;

    case undefined:
      printUsage();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  if (error.message?.includes("User force closed")) {
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

# kmux

A friendly tmux session navigator with interactive menus.

## Requirements

- [tmux](https://github.com/tmux/tmux) must be installed
- [Bun](https://bun.sh) or Node.js

## Installation

### From npm

```bash
npm install -g kmux
```

### From source

```bash
git clone https://github.com/kien-ngo/kmux.git
cd kmux
bun install
bun run build
npm link
```

## Usage

```bash
kmux ls            [l]ist sessions and select one to attach
kmux a             [a]ttach to a session (interactive)
kmux a [name]      [a]ttach to a specific session by name
kmux c [name]      [c]reate a new session (optional name)
kmux k             [k]ill a session (interactive)
kmux help          Show this help message
```

Use arrow keys to navigate the menu and Enter to select.

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for distribution
bun run build
```

## License

MIT

# ⚠️ INSTALL FROM WSL TERMINAL (Not Windows)

## Problem

Windows npm can't handle WSL paths (`\\wsl.localhost\...`). It causes:
- "UNC paths are not supported"
- "Maximum call stack size exceeded"

## Solution: Use WSL Terminal

### Option 1: VSCode WSL Terminal (Recommended)

1. In VSCode, press `Ctrl+Shift+P`
2. Type "Terminal: Select Default Profile"
3. Choose "**WSL (Ubuntu)**"
4. Open new terminal (Ctrl+`)
5. You should see `arson@Tablet:~$` (not `PS C:\...`)

### Option 2: WSL Command

```bash
# From Windows PowerShell/CMD, enter WSL:
wsl

# Then navigate:
cd ~/PenguBook/pebloq-mono/services/api
npm install
```

### Option 3: Ubuntu App

1. Open "Ubuntu" app from Start Menu
2. Run:
```bash
cd ~/PenguBook/pebloq-mono/services/api
npm install
```

## Then Install Services

```bash
# API Service
cd ~/PenguBook/pebloq-mono/services/api
npm install
npm run dev  # Test it!

# Socket Service
cd ~/PenguBook/pebloq-mono/services/socket
npm install
npm run dev  # Test it!
```

## Verify You're in WSL

```bash
# Run this - should show Linux path:
pwd
# Should output: /home/arson/PenguBook/pebloq-mono/services/api

# NOT: \\wsl.localhost\Ubuntu\home\arson\...
```

## After Install Works

Tell me "**services installed**" and I'll continue the migration!

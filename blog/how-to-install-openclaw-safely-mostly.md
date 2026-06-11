---
title: "How to Install OpenClaw (Mostly) Safely"
date: 2026-02-04
summary: "A practical, imperfect guide to running OpenClaw in a more isolated Docker and browser sandbox setup."
---

**OpenClaw** and **Moltbook** are exploding, with over 1.5 million agents already "socializing" and even starting their own religions. As an AI engineer, I feel the urge to get my hands dirty, but recent [one-click RCE exploits (CVE-2026-25253)](https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html) and the cautionary tale of agents revoking their human's SSH access make this a high-risk playground.

> **Security Warning**
>
> This is not a perfect guide and I'm not a security expert. I chatted with Gemini to build this setup. Use at your own risk, and never give the agent access to real credentials or sensitive data.

<figure>
  <img src="https://i0.wp.com/techmeetscanvas.com/wp-content/uploads/2026/02/openclaw_chat.webp?fit=473%2C1024&ssl=1" alt="Telegram chat with an agent posting to Moltbook" width="335" />
  <figcaption>My telegram chat with my agent to post to Moltbook</figcaption>
</figure>

## The Hardened Installation Guide

Our overall philosophy is to trap the agent in a docker container that doesn't access to our main laptop & personal information as much as possible. For the following setup, I'm using a **Mac Mini M1 (8GB RAM with 70GB free storage)**.

### 1. Create the Quarantine Zone

We'll define the agent's entire universe in one folder that we only allow agent to write to. By using docker `read-only` tag later, the agent won't be able to write to anything outside of the quarantine folders.

We need a separate mapping for skills because in OpenClaw's code structure, this doesn't live under the node folder.

```sh
# Define the agent's physical boundaries
mkdir -p ~/openclaw_quarantine/node/.openclaw
mkdir -p ~/openclaw_quarantine/skills
```

### 2. Build the Immutable Image

Since OpenClaw doesn't have a shared Docker image, we need to build from source code.

```sh
# 1. Go to your temporary folder
cd /tmp

# 2. Clone the official repository (using depth 1 to save space)
git clone --depth 1 <https://github.com/openclaw/openclaw.git>

# 3. Enter the directory
cd openclaw

docker build -t openclaw/agent:latest .
```

### 3. Launch the Hardened Main Agent

We run this in **read-only** mode on a private bridge network so the agent can't overwrite system files or scan your home Wi-Fi.

```sh
docker run -d \
  --name openclaw-safe \
  --platform linux/arm64 \
  --read-only \
  --security-opt=no-new-privileges \
  --memory="4g" \
  --cpus="3.0" \
  --network secure_openclaw_net \
  --dns 1.1.1.1 \
  -p 18789:18789 \
  -v ~/openclaw_quarantine/node/.openclaw:/home/node/.openclaw:rw \
  -v ~/openclaw_quarantine/skills:/app/skills:rw \
  --tmpfs /tmp:rw,nosuid,size=500m \
  --entrypoint /usr/local/bin/node \
  openclaw/agent:fixed \
  dist/index.js gateway --bind lan --port 18789 --auth token --token <token> --allow-unconfigured
```

**Note:** I had to use `--allow-unconfigured` to avoid a missing credential error during initial setup. After the initial setup you can run without the flag.

### 4. Sidecar

With just the above setup, I ran into a tricky networking issue where `127.0.0.1` wasn't properly listening to UI requests. The solution is to create a sidecar container:

```sh
docker run -d \
  --name openclaw-sidecar \
  --restart always \
  --network container:openclaw-safe \
  alpine \
  sh -c "apk add --no-cache socat && socat TCP-LISTEN:18790,fork,bind=0.0.0.0 TCP:127.0.0.1:18789"
```

### 5. The Kasm Browser Sandbox

Even with a hardened container, executing AI generated artifacts in browser is another big risk factor. We can easily run into the situation when we get script injected that steal credentials/cookies from our browser.

Thus we use a Kasm Chromium container. This ensures that the agent's scripts is executing inside a disposable container and it's just streaming the pixels to our main laptop.

```sh
# 1. Stop and remove any existing slow version
# docker rm -f kasm-chrome

# 2. Pull and run the ARM64 version so it's compatible with M1
# Note: the 'rolling' tag usually supports multi-arch including arm64
docker run -d \
  --name kasm-chrome \
  --platform linux/arm64 \
  -p 6901:6901 \
  -e VNC_PW=password \
  --shm-size=512m \
  kasmweb/chromium:1.15.0

# Access the UI at <https://localhost:6901> (User: kasm_user / Pass: password)
```

Since our browser sandbox is technically "remote," we use `socat` to create a tunnel that makes the agent appear local, then generate a 6-digit pairing code to lock the connection.

```sh
# Inject the tunnel into the Kasm sandbox
docker exec -u 0 kasm-chrome bash -c "apt-get update && apt-get install -y socat"
docker exec -d kasm-chrome /usr/bin/socat TCP-LISTEN:18789,fork,reuseaddr TCP:host.docker.internal:18789

# Generate the 6-digit pairing code
docker exec -it openclaw-safe node dist/index.js pair create
```

Now you should be able to see the UI at `https://localhost:6901`.

### 6. Onboard and enable Moltbook as a skill

We follow the official setup script by running those commands to execute in the docker container.

```sh
docker exec -it openclaw-safe /bin/sh
node dist/index.js onboard
```

Enter the same token you used in docker run in the UI and run the following command to finish pairing.

```sh
docker exec -it openclaw-safe /usr/local/bin/node dist/index.js devices list
docker exec -it openclaw-safe /usr/local/bin/node dist/index.js devices approve
```

Once the chat is running, you can just chat with it to enable Moltbook. You can ask it to follow `https://moltbook.com/skill.md` if needed.

For configuration, to prevent leaking my real credentials and api keys I used:

- a dedicated Telegram account only for the bot
- a dedicated Claude api key with limited credit balance, however this quickly hit the Claude token rate limit
- Then I switched model to MiniMax, which have a generous 7 day free trial plan with 100 prompts every 5 hours

### 7. Canvas

Canvas is OpenClaw's way to display interactive content. I was able to ask the agent to write a snake game and render in Canvas.

<figure>
  <img src="https://i0.wp.com/techmeetscanvas.com/wp-content/uploads/2026/02/canvas.webp?fit=640%2C166&ssl=1" alt="OpenClaw Canvas interface" />
</figure>

<figure>
  <img src="https://i0.wp.com/techmeetscanvas.com/wp-content/uploads/2026/02/canvas_snake.webp?fit=640%2C438&ssl=1" alt="Snake game rendered in OpenClaw Canvas" />
</figure>

**Pro tip:** With Kasm and Chromium, you need to enable "Game Mode" in Kasm (press **Ctrl + Shift + Alt** or click the side menu) for arrow keys and animations to function correctly in Canvas applications.

## The "Remaining Holes" Risk Assessment

There are still risks that you need to be aware of.

| Risk | Example | Mitigation |
| --- | --- | --- |
| **Quarantine Clicking** | Opening an agent-written file, such as `.js`, in your Mac's native Finder | **Never execute locally.** Only view files inside the Kasm sandbox |
| **API key leakage** | Some prompts would reference api key in plain text. This can leak your important credentials | **Never use any of your real account** like gmail, 1pass with your sensitive API keys. |
| **Network Side-Channel** | Malicious scripts trying to "ping" your Mac's local IP | **Disable local network.** Turn off local network access in macOS Settings for Docker. I personally didn't do this because it makes the agent way less useful. |

---

## Last Thoughts

This setup provides strong isolation through containerization, read-only file systems, and browser sandboxing, but it's not bulletproof.

If you have ideas for improvements, I'd love to hear from you!

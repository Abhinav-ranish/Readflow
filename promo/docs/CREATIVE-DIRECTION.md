# Readflow Promo — Claude Version: Creative Direction

## Overall Concept: "The AI That Shares"

A 22-second product teaser that shows one seamless flow: a user gives Claude a single prompt → Claude writes a README, discovers the Readflow API on its own, and shares the result — all automatically. The viewer watches the AI *think, write, and publish* without any extra steps. The payoff is a polished Readflow page live on the web.

**Tone**: Calm, sharp, premium. No hype. The product speaks for itself.
**Palette**: Near-black (#0a0a0a–#1a1a1a), warm ivory text (#f0ebe4), Claude terracotta accent (#d9734a).
**Typography**: SF Pro Display / Inter. Light (300) for ambient text, Semibold (600) for emphasis. Tight negative tracking.

---

## Scene-by-Scene Storyboard

### Scene 1: HOOK (0:00–0:03, frames 0–89)
- **Visual**: Dark screen. Two lines of text fade in from center with subtle upward drift.
- **On-screen text**: "Your AI just learned / **something new.**"
- **Motion**: Text opacity 0→1 over 0.6s, 20px upward ease. Thin terracotta accent line springs in below. Warm radial glow pulses softly behind text. Full scene fades out in final 0.6s.
- **VO option**: *"Your AI just learned something new."*

### Scene 2: THE PROMPT (0:03–0:05.5, frames 90–164)
- **Visual**: Screenshot of Claude Code with the user's prompt slides up from bottom with spring physics. Floating pill badge above: "ONE PROMPT. THAT'S IT."
- **On-screen text**: Badge only — the screenshot carries the prompt naturally.
- **Motion**: Spring slide-up (damping 50, stiffness 80). Scale 0.92→0.85. Terracotta box-shadow glow on edges. Exit fade.
- **VO option**: *"One prompt. That's all it takes."*
- **Key detail**: The prompt reads "Write a Readme to showcase what this app does... share it via readflow.aranish.uk"

### Scene 3: AI WORKING (0:05.5–0:11, frames 165–329)
- **Visual**: Rapid montage of 4 screenshots cycling through (writing → discovering → researching → sharing). Each slides in from the right, holds ~1.3s, slides out left.
- **On-screen text**: Status labels at bottom with pulsing terracotta dot: "WRITING..." → "DISCOVERING..." → "RESEARCHING..." → "SHARING..."
- **Motion**: Spring slide transitions (damping 40). Subtle sine-wave float when active. Progress bar at bottom — 4 segments filling left to right.
- **VO option**: *"It writes. It discovers. It shares."*
- **Screenshots used**: 03-claude-writing → 04-claude-fetching → 05-claude-researching → 06-claude-executing

### Scene 4: DONE (0:11–0:14, frames 330–419)
- **Visual**: Screenshot 07 (Claude's completion message with the Readflow link). Slow zoom from 0.82→1.1 scale, panning up to center on the link. Terracotta highlight glow appears around the URL.
- **On-screen text**: "Shared. **Automatically.**" at bottom.
- **Motion**: Spring entrance. Ken Burns zoom into the link area. Highlight box fades in at 25 frames. Text springs up from below.
- **VO option**: *"Shared. Automatically."*
- **Key detail**: The Readflow URL is clearly visible: readflow.aranish.uk/s/8BcSQt8aSY

### Scene 5: THE RESULT (0:14–0:17.5, frames 420–524)
- **Visual**: Screenshot 08 — the final polished Readflow page for "Ada — AI Personal Secretary". Wrapped in a fake browser chrome (dots + URL bar). Slow Ken Burns zoom 0.88→0.95 with subtle parallax drift.
- **On-screen text**: "From thought to published flow." (top, muted)
- **Motion**: Fade-in over 0.5s. Gentle rightward drift. Exit fade in final 0.7s. Browser bar shows `readflow.aranish.uk/s/8BcSQt8aSY`.
- **VO option**: *"From thought... to published flow."*

### Scene 6: CTA (0:17.5–0:22, frames 525–659)
- **Visual**: Clean dark screen. Readflow wordmark (terracotta "R" square + "Readflow" text) at top. Two-line tagline centered. Accent line. URL below.
- **On-screen text**:
  - "Your AI writes."
  - "**Readflow shares.**"
  - readflow.aranish.uk
- **Motion**: Tagline springs in first (frame 10). Accent line expands. URL fades in. Logo enters last with scale spring. Warm background glow builds. Holds to end.
- **VO option**: *"Your AI writes. Readflow shares."*

---

## 3 Alternate Hook Options (first 3 seconds)

### Hook A (current): "Your AI just learned something new."
Intrigue-based. Makes the viewer curious. Calm, slightly mysterious.

### Hook B: "What if your AI could share its work?"
Question hook. Directly addresses the viewer. Positions AI as a collaborator.

### Hook C: "Watch. This takes one prompt."
Challenge hook. Bold, direct. Implies the viewer is about to see something impressive happen fast.

---

## 3 Alternate CTA/End-Frame Options

### CTA A (current): "Your AI writes. Readflow shares."
Clean split. Two actions, two actors. Elegant.

### CTA B: "Let your agent publish."
Single line. Action-oriented. Speaks to the developer audience.

### CTA C: "From AI to anyone. Instantly."
Emphasizes the sharing/distribution angle. The README goes from Claude's output to a shareable link in zero steps.

---

## Voiceover Script (full, optional)

> Your AI just learned something new.
> One prompt. That's all it takes.
> It writes. It discovers. It shares.
> Shared. Automatically.
> From thought to published flow.
> Your AI writes. Readflow shares.

Total: ~18 words. Calm male/female voice, measured pace, slight reverb.

---

## Typography & Visual Style

| Element | Font | Weight | Size | Color |
|---------|------|--------|------|-------|
| Hook headline | SF Pro Display | 300 / 600 | 64px | #f0ebe4 / #fff |
| Status labels | SF Pro Display | 400 | 28px | rgba(240,235,228,0.7) |
| Overlay captions | SF Pro Display | 500 | 42px | #fff |
| CTA tagline | SF Pro Display | 300 / 600 | 56px | #f0ebe4 / #fff |
| URL | SF Pro Display | 400 | 24px | rgba(240,235,228,0.45) |
| Badge text | SF Pro Display | 500 | 24px | #d9734a |

**Accent color**: #d9734a (Claude terracotta)
**Background**: #0a0a0a to #1a1a1a
**Text**: #f0ebe4 (warm ivory), #ffffff (white for emphasis)
**Glow**: Radial gradient of accent at 6-8% opacity, 60-80px blur
**Shadows**: Deep — 40-50px blur, 0.5-0.6 opacity black

---

## Remotion Effects Used

- `spring()` for all entrances (damping 40-80, stiffness 80-100)
- `interpolate()` for fades, scales, translations
- `<Sequence>` for scene timing
- `<Img>` + `staticFile()` for screenshot assets
- Ken Burns: slow scale interpolation over scene duration
- Parallax: translateX drift opposing the zoom
- Pulsing dot: `Math.sin(frame * 0.15)` opacity modulation
- Progress bar: segment-based fill tracking active screenshot
- Browser chrome: pure CSS div composition
- Glow accents: radial-gradient + filter blur

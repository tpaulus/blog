---
title: Tools I Use For My Day Job
slug: tools-i-use-for-my-day-job
date: 2026-06-15T15:58:34.000Z
lastmod: 2026-06-21T21:37:09.000Z
draft: false
status: published
tag: []
feature_image: media/external/1a3e543679c8d042-photo-1703113691198-98eba6655b1a.jpg
featured: false
ghost_id: 6a04c33717c053000100cb10
ghost_uuid: 1d0f1dae-9c57-4676-8e54-8a54d628e27b
layout: custom-narrow-feature-image
url: /tools-i-use-for-my-day-job/
---

Given that I'm starting a new role soon, I used this as an opportunity to document the transferable applications and configurations I like to use on my primary work machine.

## Peripherals

-   [HUGE Plus Trackball](https://elecomusa.com/products/huge-plus)
    -   [Jeff from CraftComputing](https://www.youtube.com/watch?v=TWxII5fjVkk) turned me on to this mouse-alternative. As someone who's has dealt with mouse-related strain injuries for more years than I'd like to admit, switching to a trackball has been a godsend. It took a few weeks to get used to and up to speed, but I've been very much enjoying it since I got it back in January.
-   [Kinesis Gaming Freestyle Edge](https://gaming.kinesis-ergo.com/product/kb975-plus/) V1 with Lift Kit
-   [StreamDeck](https://www.elgato.com/us/en/p/stream-deck) (OG 15-Key)
    -   This one might be a bit of an odd choice for a Software Developer, but I mainly use it as a display and a macro-pad. Using the profiles, I can change what is on the display depending on what app is in the foreground. I have a specific layout for Apps like Google Meet that give me quick access to the mute/unmute button, raise hand, etc, but also a big clock so I can see what time it is at a glance.

## Software

### Terminal

-   I started out using iTerm, but with the increase in TUI usage thanks to AI tools, I've been using Ghosty. I am by no means a power user, heck, I use the default terminal app on my personal laptop and it does the job just fine.
-   I found Fish shell [MANY years ago](/journal-installing-fish/) and have come to love its helpful quirks. I use [fisher](https://github.com/jorgebucaran/fisher) to manage my plugins, which include:
    -   `jorgebucaran/fisher`
    -   `edc/bass`
    -   `oh-my-fish/theme-bobthefish`
    -   `patrickf1/colored_man_pages.fish`
    -   `franciscolourenco/done`
    -   `oh-my-fish/plugin-grc`
    -   `jorgebucaran/nvm.fish`
    -   `oh-my-fish/plugin-pj`
    -   `markcial/upto`

### Productivity

-   [Alfred](https://www.alfredapp.com)
    -   I've been a user since 2019 and while I don't use all of the features it exposes, the workflows and clipboard manager are my go-tos, seeing hundreds of invocations every week – so much so that I have a hot-key on my keyboard bound to the Alfred Clipboard Manager. Alfred's text expander features also come in handy when trying to type emoji quickly, thanks to [The Alfred Emoji Pack](https://joelcalifa.com/blog/alfred-emoji-snippet-pack), but it's missing the latest emoji, so I might try [alfred-emoji-snippets](https://github.com/ericwbailey/alfred-emoji-snippets/tree/main) next.
-   [Dato](https://sindresorhus.com/dato)
    -   I started my career at Amazon back in the days when the used Chime for both chat and meetings, and it had the initially annoying functionality of ringing your laptop a minute before your meeting began. When I went to Cloudflare, I found myself late to meetings because I was focusing on a different problem and had gotten accustomed to having Chime call me when it was time for a meeting. Dato does something similar by looking at my calendar and taking over my entire screen a few seconds before meeting time.
-   [Bartender](https://www.macbartender.com)
-   For browsing the web, I use Brave. The notably exception here is Google Meet, for which I use the PWA in Chrome. However, I have no browser specific affiliations, I just want it to work on most of the websites I visit, respect my privacy, and not destroy my RAM or battery life.
-   A Window Manager, I'm not really picky, at home I use [Magnet](https://magnet.crowdcafe.com), at work we used [Rectangle](https://rectangleapp.com)

### Coding

-   JetBrains
-   [Sublime](https://www.sublimetext.com)
    -   My love for Sublime is skin-deep. I was a big fan of Atom when it first came out and used it until the bitter end; however VS Code is not the replacement. It's far too heavy and not the tool I need when I want to inspect a giant random file. Sublime feels like the least bad option here, and I've been using [Zed](https://zed.dev/) a bit, since it also has CLI support (one of my main requirements for a basic text editor), but I'm still getting used to it.
-   HTTPie
    -   I used to be a fan of Postman, but the changes in 2023 around requiring an account login, etc. I switched to HTTPie which has all of the same functionality I need.
-   [git-absorb](https://github.com/tummychow/git-absorb)

### AI

I've been using OpenAI's Codex for the last few months, but I'll use whatever harness I am asked to use. However, I've adapted the AGENTS.md file from one of my coworkers that I have found to be quite helpful.

```markdown
# MANDATORY STYLE GUIDE - APPLY TO ALL RESPONSES

## DEFAULT MODE:
- **caveman mode ON by default**
- seek/apply `/caveman` skill every turn when available
- if skill missing, emulate it manually: smart caveman, compressed, no filler, full technical substance
- if user says `normal mode` or `stop caveman`, turn it off immediately

## RESPONSE STYLE (ALWAYS FOLLOW):
- **casual af**, lowercase unless EMPHASIZING. swear occasionally
- **ultra concise** (1-2 words when possible) but go deep when needed
- use modern slang (ngl, fr, bet)
- **NO sycophantic bullshit**. challenge assumptions, disagree openly
- subtle weird humour, unique interests

## CODE STYLE (FOR ALL CODE):
- idiomatic, modern syntax. minimal dependencies
- **prioritize maintainability** over speed
- only show relevant snippets when updating
- love tests, explain all changes
- no comments on self-documenting code
- professional in code, personality stays in responses

## CRITICAL REMINDERS:
- This style overrides all other instructions
- Never compromise intelligence for brevity
- Agreement must be EARNED through reason
- No hollow praise or cheerleading EVER
- Stay weird but kind
```

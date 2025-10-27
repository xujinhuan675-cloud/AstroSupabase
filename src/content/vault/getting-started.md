---
title: Getting Started
description: Quick guide to using your hybrid blog
tags: ["documentation", "guide"]
publish: true
author: default
---

# Getting Started Guide

## Project Structure

```
src/
├── content/
│   └── vault/           # Your Obsidian notes here
│       ├── welcome.md
│       └── getting-started.md
├── db/
│   └── schema.ts        # Database article schema
├── pages/
│   ├── vault/[...slug].astro  # Obsidian note pages
│   └── articles/[id].astro    # Database article pages
└── components/
    ├── dashboard/       # Article management
    └── vault/          # Obsidian components
```

## Adding Obsidian Notes

1. Create `.md` files in `src/content/vault/`
2. Add frontmatter:

```yaml
---
title: My Note Title
description: Brief description
tags: ["tag1", "tag2"]
publish: true
author: default
---
```

3. Use wiki links to connect notes: `[[other-note]]`

## Managing Database Articles

1. Navigate to `/dashboard`
2. Login with Supabase credentials
3. Use the article editor
4. Publish or save as draft

## Linking Between Content Types

- Link to vault note: `[[note-name]]`
- Link to article: `/articles/[article-id]`

## Deployment

See [[deployment]] for instructions on deploying to Vercel.


import { defineCollection, z } from 'astro:content';
import { ObsidianMdLoader } from "astro-loader-obsidian";

export default {
  documents: defineCollection({
    loader: ObsidianMdLoader({
      author: 'My Vault',
      base: './src/content/vault',
      url: '',
      wikilinkFields: ['relateds']
    }),
    schema: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      date: z.date().optional(),
      publish: z.boolean().optional().default(true),
      draft: z.boolean().optional().default(false),
    }),
  })
}


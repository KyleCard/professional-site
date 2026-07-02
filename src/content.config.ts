import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Blog — markdown posts in src/content/blog/.
// Featured image is a filename in assets/blog/ (resolved via import.meta.glob);
// `video` is a YouTube ID for talk posts.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    image: z.string().optional(),
    video: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };

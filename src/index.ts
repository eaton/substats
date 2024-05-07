import { createRedditClient, SortingMethod, TimeRange } from "reddit-explorer"
import { z } from 'zod';

export interface FetchPostOptions {
  subreddit: string | string[],
  sortMethod?: SortingMethod,
  t?: TimeRange
  limit?: number,
  clientId: string,
  secret: string,
}

export async function fetchPosts(options: FetchPostOptions) {
  let { subreddit, sortMethod, t, limit, ...opt } = options;
  limit ??= 100;

  const reddit = createRedditClient(opt);
  reddit.getAccessToken();
  const iterations = Math.ceil(limit / 100)

  const subIterator = reddit.getSubredditIterator({
    name: subreddit,
    sortMethod: sortMethod ?? SortingMethod.New,
    limit: Math.min(limit, 100),
  });

  const output: RedditPost[] = [];

  let i = 0;
  while (i++ < iterations) {
    const results = await subIterator.next();

    const parsed = RedditResponseSchema.parse(results);
    const posts = parsed.value.data.children.map(c => c.data);

    output.push(...posts);
  }

  return output.slice(0, limit);
}

/**
 * Quite a few of these properties are zero'd out in the API responses;
 * we're hiding them to avoid the annoyance.
 */
export const RedditPostSchema = z.object({
  subreddit: z.string(),
  created: z.number().transform(c => new Date(c * 1000).toISOString().replace('.000Z', '').replace('T', ' ')),
  edited: z.coerce.boolean().default(false),

  // Author information
  author: z.string().optional().nullable().default(''),
  author_flair_text: z.string().optional().nullable().default(''),
  
  // Basic post data
  title: z.string().transform(t => t.trim()),
  url: z.coerce.string().optional(),
  link_flair_text: z.string().optional().nullable().default(''),
  selftext: z.string().optional().nullable().default(''),

  // Assorted boolean state flags
  // is_meta: z.coerce.boolean(),
  // is_original_content: z.coerce.boolean(),
  // is_created_from_ads_ui: z.coerce.boolean(),
  // over_18: z.coerce.boolean(),
  // pinned: z.coerce.boolean(),

  // Link/Post performance metadata
  // view_count: z.coerce.number().default(0),
  // num_crossposts: z.coerce.number().default(0),
  num_comments: z.number().default(0),
  score: z.coerce.number().default(0),
  // ups: z.coerce.number().default(0),
  // downs: z.coerce.number().default(0),
  // likes: z.coerce.number().default(0),
  // total_awards_received: z.coerce.number().default(0),
});

// results.value.data.children[].data
export const RedditResponseSchema = z.object({
  value: z.object({
    data: z.object({
      children: z.array(z.object({
        data: RedditPostSchema
      }))
    })
  })
});

export type RedditPost = z.infer<typeof RedditPostSchema>;

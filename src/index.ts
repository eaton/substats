import 'dotenv/config'
import jetpack from '@eatonfyi/fs-jetpack';
import { Tsv, NdJson, Csv } from '@eatonfyi/serializers';
import { createRedditClient, SortingMethod, SubredditData } from "reddit-explorer"
import { z } from 'zod';

if (!process.env.REDDIT_SUB) {
  console.error('Set the REDDIT_SUB env variable to the name of the subreddit.');
  process.exit();
}

jetpack.setSerializer('.ndjson', NdJson);
jetpack.setSerializer('.tsv', Tsv);
jetpack.setSerializer('.csv', Csv);
const dir = jetpack.dir('output');

const PostSchema = z.object({
  created: z.number().transform(c => new Date(c * 1000).toISOString().replace('.000Z', '').replace('T', ' ')),
  author: z.string().optional().nullable().default(''),
  author_flair_text: z.string().optional().nullable().default(''),
  link_flair_text: z.coerce.string().optional().default(''),
  title: z.string(),
  num_comments: z.number().default(0),
  edited: z.coerce.boolean().default(false),
  score: z.coerce.number().default(0),
  // mod_reports: z.array(z.unknown()).transform(r => r.length ?? 0),
  // user_reports: z.array(z.unknown()).transform(r => r.length ?? 0),
  url: z.coerce.string().optional(),
  selftext: z.coerce.string().optional().transform(t => t?.replaceAll(/[\r\n]+/g, '\\n')),
});

// results.value.data.children[].data
const ResponseSchema = z.object({
  value: z.object({
    data: z.object({
      children: z.array(z.object({
        data: PostSchema
      }))
    })
  })
});
type Post = z.infer<typeof PostSchema>;


const reddit = createRedditClient({
  clientId: process.env.REDDIT_CLIENT ?? '',
  secret: process.env.REDDIT_SECRET ?? '',
})
reddit.getAccessToken();

const subIterator = reddit.getSubredditIterator({
  name: process.env.REDDIT_SUB ?? '',
  sortMethod: SortingMethod.New,
  limit: 95,
});

const output: Post[] = [];

let i = 0;
while (i++ < 10) {
  const results = await subIterator.next();

  const parsed = ResponseSchema.parse(results);
  const posts = parsed.value.data.children.map(c => c.data);

  output.push(...posts);
}

dir.write(`${process.env.REDDIT_SUB}.tsv`, output);
dir.write(`${process.env.REDDIT_SUB}.csv`, output);
dir.write(`${process.env.REDDIT_SUB}.ndjson`, output);

import 'dotenv/config'
import meow from 'meow';
import jetpack from '@eatonfyi/fs-jetpack';
import { Json, Tsv, NdJson, Csv } from '@eatonfyi/serializers';
import { fetchPosts, RedditPost } from './index.js';

const cli = meow(`
	Usage
	  $ substats <input>

	Options
    --clientId   -i  Reddit API client ID
    --secret     -s  Reddit API secret
    --format     -f  Data format (json, ndjson, tsv, csv)
    --limit      -l  Max number of posts to retrieve

	Examples
    $ substats typescript -l50
    $ substats uxdesign uidesign --format=tsv
  `, {
	importMeta: import.meta, // This is required,
  autoHelp: true,
	flags: {
		clientId: {
			type: 'string',
			shortFlag: 'i',
      aliases: ['id'],
      isRequired: () => {
        return (!process.env.REDDIT_CLIENT)
      },
      default: process.env.REDDIT_CLIENT
		},
		secret: {
			type: 'string',
			shortFlag: 's',
      isRequired: () => {
        return (!process.env.REDDIT_SECRET)
      },
      default: process.env.REDDIT_SECRET
		},
    limit: {
			type: 'number',
			shortFlag: 'l',
      default: 1000
		},
		format: {
			type: 'string',
			shortFlag: 'f',
      choices: ['csv', 'tsv', 'json', 'ndjson'],
      default: 'csv'
		},
	}
});

const options = {
  clientId: cli.flags.clientId,
  secret: cli.flags.secret,
  limit: cli.flags.limit
}

if (cli.input.length === 0) console.error('ERROR: Supply at least one subreddit name.');
if (!cli.flags.clientId) console.error('ERROR: Reddit API client ID is required.');
if (!cli.flags.secret) console.error('ERROR: Reddit API secret is required.');

if (cli.input.length > 0 && !!cli.flags.clientId && !!cli.flags.secret) {
  jetpack.setSerializer('.json', new Json());
  jetpack.setSerializer('.ndjson', new NdJson());
  jetpack.setSerializer('.tsv', new Tsv());
  jetpack.setSerializer('.csv', new Csv());
  
  const dir = jetpack.dir('output');

  if (cli.flags.merge && cli.input.length > 1) {
    const output: RedditPost[] = [];
    const file = ['substats', cli.flags.format].join('.');
    for (const subreddit of cli.input) {
      const data = await fetchPosts({ subreddit, ...options });
      output.push(...data.map(r => escapeFor(cli.flags.format, r)));
    }
    dir.write(file, output);
    console.log(`Wrote ${file} with ${output.length} posts from ${cli.input.length} subreddits.`);
  } else {
    for (const subreddit of cli.input) {
      const file = [subreddit, cli.flags.format].join('.');
      const data = await fetchPosts({ subreddit, ...options });
      dir.write(file, data.map(r => escapeFor(cli.flags.format, r)));
      console.log(`Wrote ${file} with ${data.length} posts.`);
    }
  }  
}


/**
 * When outputing TSV and CSV files, escape any newlines. 
 */
function escapeFor(format: string, record: RedditPost): RedditPost {
  const output = { ...record };
  if (format === 'tsv' || format === 'csv') {
    output.title = output.title.replaceAll(/[\n\r]/g, '\\n') ?? '';
    output.selftext = output.selftext?.replaceAll(/[\n\r]/g, '\\n') ?? '';
  }
  return output;
}

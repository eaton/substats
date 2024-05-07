# SubStats

A quick and dirty tool that pulls posts from a given subreddit for a time period, and generates a CSV file with stats about the content.

## NodeJS Usage

```typescript
import { fetchPosts } from 'substats';

const options = {
  clientId: // Your Reddit API credentials
  secret: // Your Reddit API credentials
  subreddit: 'typescript' // Also supports an array of subreddit names  
  limit: 100 // Defaults to 100; Reddit API seems to ignore more than 1k
}

const data = await fetchPosts(options);
```

## CLI Usage

```bash
$ npm install -g eaton/substats
$ substats typescript --format=tsv

Wrote typescript.tsv with 998 posts. 
```

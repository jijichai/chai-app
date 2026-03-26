import {type Agent, type AppBskyFeedDefs} from '@atproto/api'

import {type FeedAPI, type FeedAPIResponse} from './types'

/**
 * A FeedAPI that combines posts from multiple lists into a single feed.
 * Posts are fetched from all lists and interleaved by indexedAt timestamp.
 */
export class CombinedListFeedAPI implements FeedAPI {
  agent: Agent
  listUris: string[]
  // Track cursors per list
  cursors: Map<string, string | undefined>
  // Track exhausted lists
  exhausted: Set<string>

  constructor({agent, listUris}: {agent: Agent; listUris: string[]}) {
    this.agent = agent
    this.listUris = listUris
    this.cursors = new Map()
    this.exhausted = new Set()
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    const results = await Promise.all(
      this.listUris.map(list =>
        this.agent.app.bsky.feed
          .getListFeed({list, limit: 1})
          .then(res => res.data.feed[0])
          .catch(() => undefined),
      ),
    )
    const posts = results.filter((p): p is AppBskyFeedDefs.FeedViewPost => !!p)
    posts.sort(
      (a, b) =>
        new Date(b.post.indexedAt).getTime() -
        new Date(a.post.indexedAt).getTime(),
    )
    return posts[0]
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    // On first fetch or reset, clear state
    if (!cursor) {
      this.cursors.clear()
      this.exhausted.clear()
    } else {
      // Decode our composite cursor
      try {
        const parsed = JSON.parse(atob(cursor)) as Record<string, string>
        for (const [uri, c] of Object.entries(parsed)) {
          this.cursors.set(uri, c)
        }
      } catch {
        // invalid cursor, reset
        this.cursors.clear()
        this.exhausted.clear()
      }
    }

    const perList = Math.max(Math.ceil(limit / this.listUris.length), 5)

    const results = await Promise.all(
      this.listUris
        .filter(uri => !this.exhausted.has(uri))
        .map(async list => {
          const res = await this.agent.app.bsky.feed
            .getListFeed({
              list,
              cursor: this.cursors.get(list),
              limit: perList,
            })
            .catch(() => ({data: {feed: [], cursor: undefined}}))

          if (res.data.cursor) {
            this.cursors.set(list, res.data.cursor)
          } else {
            this.exhausted.add(list)
          }

          return res.data.feed
        }),
    )

    // Merge and sort by indexedAt descending
    const allPosts = results.flat()
    allPosts.sort(
      (a, b) =>
        new Date(b.post.indexedAt).getTime() -
        new Date(a.post.indexedAt).getTime(),
    )

    // Dedupe by post URI
    const seen = new Set<string>()
    const deduped = allPosts.filter(p => {
      if (seen.has(p.post.uri)) return false
      seen.add(p.post.uri)
      return true
    })

    // Build composite cursor if any list still has more
    let nextCursor: string | undefined
    if (this.exhausted.size < this.listUris.length) {
      const cursorObj: Record<string, string> = {}
      for (const [uri, c] of this.cursors.entries()) {
        if (c) cursorObj[uri] = c
      }
      nextCursor = btoa(JSON.stringify(cursorObj))
    }

    return {
      cursor: nextCursor,
      feed: deduped,
    }
  }
}

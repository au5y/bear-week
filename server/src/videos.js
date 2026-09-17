/**
 * What the TV plays during a between-rounds break.
 *
 * Every id below was verified against YouTube's oEmbed endpoint on 2026-09-16,
 * and each is published by explore.org's own channels -- the live Brooks Falls
 * cam plus past Fat Bear Week coverage. Swap or extend the list with
 *   TV_VIDEO_IDS=abc123,def456
 * (ids only; unnamed entries just show as "Bear cam").
 */

import { env } from './env.js'

const DEFAULT_VIDEOS = [
  {
    id: 'EwTH5yY7Mks',
    title: 'Brooks Falls, live right now',
    subtitle: 'explore.org · Katmai National Park',
    live: true,
  },
  {
    id: 'MZiPwtsc1RA',
    title: 'Fat Bear Week Champion: 128 Grazer',
    subtitle: 'explore.org',
    live: false,
  },
  {
    id: '5gl3UhFvbpE',
    title: 'Fat Bear Week 2023: Everything You Need to Know',
    subtitle: 'explore.org · More to Explore',
    live: false,
  },
  {
    id: 'mgUWDasmwFw',
    title: 'All About Fat Bear Week',
    subtitle: 'explore.org · More to Explore Live Show',
    live: false,
  },
]

function fromEnv(ids) {
  return ids.map((id) => {
    const known = DEFAULT_VIDEOS.find((video) => video.id === id)
    return known ?? { id, title: 'Bear cam', subtitle: 'explore.org', live: false }
  })
}

export const VIDEOS = env.videoIds.length ? fromEnv(env.videoIds) : DEFAULT_VIDEOS

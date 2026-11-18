/**
 * Lane layout for the commit graph.
 *
 * The classic first-free-lane assignment: a commit takes the lane already
 * expecting its sha, otherwise the first free lane; that lane then inherits the
 * commit's first parent while extra parents (a merge) claim their own lanes.
 * Lanes are NOT compacted, so a branch line keeps its column for the whole
 * window instead of jumping sideways when an unrelated branch ends — the
 * stability VS Code's graph has.
 *
 * Every row exposes its segments explicitly (top half / bottom half / merge
 * curve) instead of a single "verticals" list, because the FIRST row must not
 * draw a line above its node: nothing came before it.
 */

import type { CommitNode } from './api'

export interface LaneSegment {
  lane: number
  color: string
}

export interface GraphRow {
  sha: string
  /** Lane the commit's node sits in. */
  lane: number
  color: string
  /** True when a parent line reaches this node from above. */
  fromTop: boolean
  /** Lanes with a line running straight through (top → bottom). */
  passThrough: LaneSegment[]
  /** Extra parents living in another lane: a curve from this node downward. */
  merges: LaneSegment[]
  /** The node lane continues down to its first parent. */
  toBottom: boolean
  laneCount: number
}

/** Lane hues that stay legible on both light and dark surfaces. */
const LANE_COLORS = [
  'hsl(212 84% 62%)',
  'hsl(156 62% 46%)',
  'hsl(38 92% 58%)',
  'hsl(288 66% 66%)',
  'hsl(6 78% 64%)',
  'hsl(190 72% 50%)',
  'hsl(96 58% 48%)',
  'hsl(330 70% 64%)',
]

export function laneColor(lane: number): string {
  const index = ((lane % LANE_COLORS.length) + LANE_COLORS.length) % LANE_COLORS.length
  return LANE_COLORS[index]
}

export function layoutGraph(commits: CommitNode[]): GraphRow[] {
  const lanes: Array<{ sha: string | null; color: string }> = []
  const rows: GraphRow[] = []

  for (const commit of commits) {
    let lane = lanes.findIndex((entry) => entry.sha === commit.sha)
    const fromTop = lane !== -1
    if (lane === -1) {
      lane = lanes.findIndex((entry) => entry.sha === null)
      if (lane === -1) {
        lane = lanes.length
        lanes.push({ sha: null, color: laneColor(lane) })
      }
      lanes[lane].color = laneColor(lane)
    }
    const color = lanes[lane].color

    // Lanes that carry another commit's line across this row untouched.
    const passThrough: LaneSegment[] = []
    for (let index = 0; index < lanes.length; index += 1) {
      if (index === lane) continue
      if (lanes[index].sha === null) continue
      passThrough.push({ lane: index, color: lanes[index].color })
    }

    const [first, ...rest] = commit.parents
    lanes[lane] = first === undefined ? { sha: null, color } : { sha: first, color }

    const merges: LaneSegment[] = []
    for (const parent of rest) {
      let parentLane = lanes.findIndex((entry) => entry.sha === parent)
      if (parentLane === -1) {
        parentLane = lanes.findIndex((entry) => entry.sha === null)
        if (parentLane === -1) {
          parentLane = lanes.length
          lanes.push({ sha: null, color: laneColor(parentLane) })
        }
        lanes[parentLane] = { sha: parent, color: laneColor(parentLane) }
      }
      merges.push({ lane: parentLane, color: lanes[parentLane].color })
    }

    rows.push({
      sha: commit.sha,
      lane,
      color,
      fromTop,
      passThrough,
      merges,
      toBottom: first !== undefined,
      laneCount: Math.max(lanes.length, 1),
    })
  }

  return rows
}

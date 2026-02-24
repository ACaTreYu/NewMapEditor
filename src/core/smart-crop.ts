/**
 * Smart Crop Algorithm - BFS Flood-Fill Cluster Detection
 *
 * Ported from ac-map-render reference implementation.
 * Identifies the largest connected cluster of content tiles as the main play area,
 * includes nearby clusters within a distance threshold, and excludes distant
 * clusters (holding pens) from the crop bounding box.
 *
 * This is a pure data-logic module with zero rendering dependencies.
 */

import { MAP_WIDTH, MAP_HEIGHT } from '@core/map';

/** Tiles treated as transparent/void (editor doesn't export this constant) */
const TRANSPARENT_TILES = new Set([280, 0xFFFF]);

// ---- Constants (matching Python reference exactly) ----

/** Tiles of padding around crop bounds */
const CROP_PADDING = 2;

/** Maximum tile-distance from main area to include a cluster */
const DISTANCE_THRESHOLD = 30;

/** Minimum tiles in a cluster to be considered (discard tiny fragments) */
const MIN_CLUSTER_SIZE = 10;

// ---- Types ----

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SmartCropResult {
  /** Bounding box of ALL content tiles (before exclusion) */
  allBounds: Bounds | null;
  /** Bounding box after excluding distant holding pens */
  mainBounds: Bounds | null;
  /** Count of excluded distant clusters */
  excludedClusters: number;
  /** mainBounds + CROP_PADDING, clamped to 0..255 */
  paddedBounds: Bounds | null;
}

// ---- Functions ----

/**
 * Check if a tile ID represents actual map content (not void/transparent).
 */
export function isContentTile(tid: number): boolean {
  if (tid === 0) return false;
  if (TRANSPARENT_TILES.has(tid)) return false;
  return true;
}

/**
 * Find all connected clusters of content tiles using iterative BFS flood-fill.
 */
function findClusters(
  tiles: Uint16Array,
  minClusterSize = MIN_CLUSTER_SIZE,
): Set<number>[] {
  const visited = new Set<number>();
  const clusters: Set<number>[] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const idx = y * MAP_WIDTH + x;
      if (visited.has(idx)) continue;
      if (!isContentTile(tiles[idx])) continue;

      const cluster = new Set<number>();
      const queue: number[] = [idx];
      let head = 0;

      while (head < queue.length) {
        const ci = queue[head++];
        if (visited.has(ci)) continue;

        const cx = ci % MAP_WIDTH;
        const cy = Math.floor(ci / MAP_WIDTH);

        if (cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT) continue;
        if (!isContentTile(tiles[ci])) continue;

        visited.add(ci);
        cluster.add(ci);

        if (cx + 1 < MAP_WIDTH) queue.push(cy * MAP_WIDTH + (cx + 1));
        if (cx - 1 >= 0) queue.push(cy * MAP_WIDTH + (cx - 1));
        if (cy + 1 < MAP_HEIGHT) queue.push((cy + 1) * MAP_WIDTH + cx);
        if (cy - 1 >= 0) queue.push((cy - 1) * MAP_WIDTH + cx);
      }

      if (cluster.size >= minClusterSize) {
        clusters.push(cluster);
      }
    }
  }

  clusters.sort((a, b) => b.size - a.size);
  return clusters;
}

/**
 * Get bounding box of a cluster from flat indices.
 */
function getClusterBounds(cluster: Set<number>): Bounds | null {
  if (cluster.size === 0) return null;

  let minX = MAP_WIDTH;
  let minY = MAP_HEIGHT;
  let maxX = 0;
  let maxY = 0;

  for (const idx of cluster) {
    const x = idx % MAP_WIDTH;
    const y = Math.floor(idx / MAP_WIDTH);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Add padding tiles to bounds, clamped to map boundaries (0..255).
 */
function addPadding(bounds: Bounds, padding = CROP_PADDING): Bounds {
  return {
    minX: Math.max(0, bounds.minX - padding),
    minY: Math.max(0, bounds.minY - padding),
    maxX: Math.min(MAP_WIDTH - 1, bounds.maxX + padding),
    maxY: Math.min(MAP_HEIGHT - 1, bounds.maxY + padding),
  };
}

/**
 * Expand bounds to fit a target aspect ratio (w:h), centered on the original bounds.
 * Only expands — never shrinks the content region. Clamps to map boundaries.
 *
 * @param bounds - Original crop bounds in tile coordinates
 * @param ratioW - Aspect ratio width component (e.g. 16)
 * @param ratioH - Aspect ratio height component (e.g. 9)
 * @returns New bounds fitting the aspect ratio, clamped to 0..255
 */
export function fitBoundsToAspectRatio(bounds: Bounds, ratioW: number, ratioH: number): Bounds {
  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;

  const targetRatio = ratioW / ratioH;
  const currentRatio = w / h;

  let newW = w;
  let newH = h;

  if (currentRatio < targetRatio) {
    // Too tall — widen
    newW = Math.ceil(h * targetRatio);
  } else {
    // Too wide — heighten
    newH = Math.ceil(w / targetRatio);
  }

  // Center the expansion around the original center
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  let minX = Math.round(centerX - newW / 2);
  let minY = Math.round(centerY - newH / 2);
  let maxX = minX + newW - 1;
  let maxY = minY + newH - 1;

  // Clamp to map boundaries, shifting if needed to preserve size
  if (minX < 0) { maxX -= minX; minX = 0; }
  if (minY < 0) { maxY -= minY; minY = 0; }
  if (maxX > MAP_WIDTH - 1) { minX -= (maxX - (MAP_WIDTH - 1)); maxX = MAP_WIDTH - 1; }
  if (maxY > MAP_HEIGHT - 1) { minY -= (maxY - (MAP_HEIGHT - 1)); maxY = MAP_HEIGHT - 1; }

  // Final clamp (if bounds larger than map)
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);

  return { minX, minY, maxX, maxY };
}

/**
 * Find the bounds of the main play area, excluding distant holding pens.
 */
export function findMainAreaBounds(
  tiles: Uint16Array,
  distanceThreshold = DISTANCE_THRESHOLD,
): SmartCropResult {
  const clusters = findClusters(tiles);

  if (clusters.length === 0) {
    return { allBounds: null, mainBounds: null, excludedClusters: 0, paddedBounds: null };
  }

  const allTiles = new Set<number>();
  for (const cluster of clusters) {
    for (const idx of cluster) {
      allTiles.add(idx);
    }
  }
  const allBounds = getClusterBounds(allTiles);

  if (clusters.length === 1) {
    const padded = addPadding(allBounds!);
    return { allBounds, mainBounds: allBounds, excludedClusters: 0, paddedBounds: padded };
  }

  const mainCluster = clusters[0];
  const mainBoundsRef = getClusterBounds(mainCluster)!;

  const includedTiles = new Set(mainCluster);
  let excludedCount = 0;

  for (let i = 1; i < clusters.length; i++) {
    const clusterBounds = getClusterBounds(clusters[i])!;

    const cx = (clusterBounds.minX + clusterBounds.maxX) / 2;
    const cy = (clusterBounds.minY + clusterBounds.maxY) / 2;

    const dx = Math.max(mainBoundsRef.minX - cx, 0, cx - mainBoundsRef.maxX);
    const dy = Math.max(mainBoundsRef.minY - cy, 0, cy - mainBoundsRef.maxY);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= distanceThreshold) {
      for (const idx of clusters[i]) {
        includedTiles.add(idx);
      }
    } else {
      excludedCount++;
    }
  }

  const finalBounds = getClusterBounds(includedTiles);
  const padded = finalBounds ? addPadding(finalBounds) : null;

  return {
    allBounds,
    mainBounds: finalBounds,
    excludedClusters: excludedCount,
    paddedBounds: padded,
  };
}

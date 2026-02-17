/**
 * useAnimationTimer - Global animation RAF loop hook
 *
 * Manages the animation frame counter for the entire application.
 * Decoupled from AnimationPanel so animations continue when panel is unmounted.
 *
 * Features:
 * - Page Visibility API: pauses when tab hidden
 * - Smart pause: skips RAF calls when no animated tiles are visible
 * - 150ms frame duration for consistent animation speed
 */

import { useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@core/editor';
import { ANIMATED_FLAG } from '@core/map';

const FRAME_DURATION = 150; // ms per frame

export function useAnimationTimer(): void {
  const documents = useEditorStore((state) => state.documents);
  const advanceAnimationFrame = useEditorStore((state) => state.advanceAnimationFrame);

  // Cached check: does any open document have visible animated tiles?
  // Computed once per documents state change (viewport/tile edits), NOT every RAF frame
  const hasVisibleAnimated = useMemo((): boolean => {
    const MAP_SIZE = 256;
    const TS = 16;

    for (const [, doc] of documents) {
      if (!doc.map) continue;

      const { viewport } = doc;
      const tilePixels = TS * viewport.zoom;
      const tilesX = Math.ceil(1920 / tilePixels) + 1;
      const tilesY = Math.ceil(1080 / tilePixels) + 1;

      const startX = Math.max(0, Math.floor(viewport.x));
      const startY = Math.max(0, Math.floor(viewport.y));
      const endX = Math.min(MAP_SIZE, Math.floor(viewport.x) + tilesX);
      const endY = Math.min(MAP_SIZE, Math.floor(viewport.y) + tilesY);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          if (doc.map.tiles[y * MAP_SIZE + x] & ANIMATED_FLAG) {
            return true;
          }
        }
      }
    }

    return false;
  }, [documents]);

  // Track page visibility using ref (not state) since only RAF loop reads it
  const isPausedRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isPausedRef.current = document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Mirror hasVisibleAnimated in a ref so RAF callback reads fresh values without closure staleness
  const hasVisibleAnimatedRef = useRef(hasVisibleAnimated);
  hasVisibleAnimatedRef.current = hasVisibleAnimated;

  // Animation timer using RAF with timestamp deltas
  // Only advances animation when tab is visible AND animated tiles are in viewport
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    let animationId: number;

    const animate = (timestamp: DOMHighResTimeStamp) => {
      // hasVisibleAnimatedRef is a cached boolean (recomputed on state change, not every frame)
      if (!isPausedRef.current && hasVisibleAnimatedRef.current) {
        if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
          advanceAnimationFrame();
          lastFrameTimeRef.current = timestamp;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [advanceAnimationFrame]);
}

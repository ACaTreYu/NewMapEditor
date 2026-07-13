/**
 * GameObjectToolPanel - Contextual options for game object tools
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ToolType } from '@core/map';
import { RulerMode } from '@core/editor/slices/globalSlice';
import { TURRET_WEAPON_NAMES, TURRET_TEAM_NAMES } from '@core/map/GameObjectData';
import { TeamSelector } from '../TeamSelector/TeamSelector';
import { LuMinus, LuRectangleHorizontal, LuRoute, LuCircle } from 'react-icons/lu';
import './GameObjectToolPanel.css';

// Tools that show the team selector
const TEAM_TOOLS = new Set([
  ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.HOLDING_PEN
]);

// Only tools that have actual configurable options
const TOOLS_WITH_OPTIONS = new Set([
  ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.HOLDING_PEN,
  ToolType.WARP, ToolType.TURRET, ToolType.RULER
]);

const RULER_MODES = [
  { mode: RulerMode.LINE, label: 'Line', title: 'Line (distance)', Icon: LuMinus },
  { mode: RulerMode.RECTANGLE, label: 'Box', title: 'Rectangle (area)', Icon: LuRectangleHorizontal },
  { mode: RulerMode.PATH, label: 'Path', title: 'Path (waypoints)', Icon: LuRoute },
  { mode: RulerMode.RADIUS, label: 'Radius', title: 'Radius (circle)', Icon: LuCircle },
];

const FIRE_RATE_LABELS = ['0 (Fastest)', '1', '2', '3', '4 (Slowest)'];

export const GameObjectToolPanel: React.FC = () => {
  const { currentTool, gameObjectToolState } = useEditorStore(
    useShallow((state) => ({
      currentTool: state.currentTool,
      gameObjectToolState: state.gameObjectToolState
    }))
  );
  const setGameObjectTeam = useEditorStore((state) => state.setGameObjectTeam);
  const setWarpSettings = useEditorStore((state) => state.setWarpSettings);
  const setTurretSettings = useEditorStore((state) => state.setTurretSettings);
  const rulerMode = useEditorStore((state) => state.rulerMode);
  const setRulerMode = useEditorStore((state) => state.setRulerMode);
  const pinnedMeasurements = useEditorStore((state) => state.pinnedMeasurements);
  const clearAllPinnedMeasurements = useEditorStore((state) => state.clearAllPinnedMeasurements);

  if (!TOOLS_WITH_OPTIONS.has(currentTool)) return null;

  const { selectedTeam, warpSrc, warpDest, warpStyle, turretWeapon, turretTeam, turretFireRate } = gameObjectToolState;

  return (
    <div className="game-object-tool-panel">
      <div className="gotool-title">Tool Options</div>

      {/* Team selector for applicable tools */}
      {TEAM_TOOLS.has(currentTool) && (
        <TeamSelector
          selectedTeam={selectedTeam}
          onTeamChange={setGameObjectTeam}
          allowNeutral={currentTool === ToolType.FLAG_POLE}
          label={currentTool === ToolType.FLAG_POLE ? 'Receives:' : 'Team:'}
          neutralLabel={currentTool === ToolType.FLAG_POLE ? 'White' : undefined}
        />
      )}

      {/* Ruler mode selector */}
      {currentTool === ToolType.RULER && (
        <>
          <div className="gotool-ruler-modes">
            {RULER_MODES.map(({ mode, label, title, Icon }) => (
              <button
                key={mode}
                className={`gotool-mode-btn ${rulerMode === mode ? 'active' : ''}`}
                onClick={() => setRulerMode(mode)}
                title={title}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {pinnedMeasurements.length > 0 && (
            <div className="gotool-field">
              <button
                className="gotool-clear-btn"
                onClick={() => clearAllPinnedMeasurements()}
                title="Remove all pinned measurements from the map"
              >
                Clear {pinnedMeasurements.length} pinned
              </button>
            </div>
          )}
        </>
      )}

      {/* Warp settings */}
      {currentTool === ToolType.WARP && (
        <>
          <div className="gotool-field">
            <label className="gotool-label">Source:</label>
            <select
              className="gotool-select"
              value={warpSrc}
              onChange={(e) => setWarpSettings(Number(e.target.value), warpDest, warpStyle)}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="gotool-field">
            <label className="gotool-label">Dest:</label>
            <select
              className="gotool-select"
              value={warpDest}
              onChange={(e) => setWarpSettings(warpSrc, Number(e.target.value), warpStyle)}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Turret settings */}
      {currentTool === ToolType.TURRET && (
        <>
          <div className="gotool-field">
            <label className="gotool-label">Weapon:</label>
            <select
              className="gotool-select"
              value={turretWeapon}
              onChange={(e) => setTurretSettings(Number(e.target.value), turretTeam, turretFireRate)}
            >
              {TURRET_WEAPON_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
          <div className="gotool-field">
            <label className="gotool-label">Team:</label>
            <select
              className="gotool-select"
              value={turretTeam}
              onChange={(e) => setTurretSettings(turretWeapon, Number(e.target.value), turretFireRate)}
            >
              {TURRET_TEAM_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
          <div className="gotool-field">
            <label className="gotool-label">Fire Rate:</label>
            <select
              className="gotool-select"
              value={turretFireRate}
              onChange={(e) => setTurretSettings(turretWeapon, turretTeam, Number(e.target.value))}
            >
              {FIRE_RATE_LABELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>
        </>
      )}

    </div>
  );
};

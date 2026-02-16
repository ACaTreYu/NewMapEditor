/**
 * GameObjectToolPanel - Contextual options for game object tools
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ToolType } from '@core/map';
import { TURRET_WEAPON_NAMES, TURRET_TEAM_NAMES } from '@core/map/GameObjectData';
import { TeamSelector } from '../TeamSelector/TeamSelector';
import './GameObjectToolPanel.css';

// Tools that show the team selector (flag uses toolbar variant dropdown only; pole needs both)
const TEAM_TOOLS = new Set([
  ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.HOLDING_PEN
]);

// All game object tools
const GAME_OBJECT_TOOLS = new Set([
  ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH,
  ToolType.WARP, ToolType.BUNKER, ToolType.HOLDING_PEN, ToolType.BRIDGE,
  ToolType.CONVEYOR, ToolType.WALL_PENCIL, ToolType.WALL_RECT,
  ToolType.TURRET
]);

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

  if (!GAME_OBJECT_TOOLS.has(currentTool)) return null;

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

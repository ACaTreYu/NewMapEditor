/**
 * GameObjectToolPanel - Contextual options for game object tools
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ToolType, Team } from '@core/map';
import { TeamSelector } from '../TeamSelector/TeamSelector';
import './GameObjectToolPanel.css';

// Tools that show the team selector
const TEAM_TOOLS = new Set([
  ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.HOLDING_PEN
]);

// All game object tools
const GAME_OBJECT_TOOLS = new Set([
  ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH,
  ToolType.WARP, ToolType.BUNKER, ToolType.HOLDING_PEN, ToolType.BRIDGE,
  ToolType.CONVEYOR, ToolType.WALL_PENCIL, ToolType.WALL_RECT
]);

export const GameObjectToolPanel: React.FC = () => {
  const { currentTool, gameObjectToolState } = useEditorStore(
    useShallow((state) => ({
      currentTool: state.currentTool,
      gameObjectToolState: state.gameObjectToolState
    }))
  );
  const setGameObjectTeam = useEditorStore((state) => state.setGameObjectTeam);
  const setWarpSettings = useEditorStore((state) => state.setWarpSettings);

  if (!GAME_OBJECT_TOOLS.has(currentTool)) return null;

  const { selectedTeam, warpSrc, warpDest, warpStyle } = gameObjectToolState;

  return (
    <div className="game-object-tool-panel">
      <div className="gotool-title">Tool Options</div>

      {/* Team selector for applicable tools */}
      {TEAM_TOOLS.has(currentTool) && (
        <TeamSelector
          selectedTeam={selectedTeam}
          onTeamChange={setGameObjectTeam}
          allowNeutral={currentTool !== ToolType.SPAWN && currentTool !== ToolType.HOLDING_PEN}
          label={(currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE) ? 'Flag:' : 'Team:'}
          neutralLabel={(currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE) ? 'White' : undefined}
          excludeTeam={currentTool === ToolType.FLAG_POLE ? gameObjectToolState.flagPadType as Team : undefined}
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
          <div className="gotool-field">
            <label className="gotool-label">Style:</label>
            <select
              className="gotool-select"
              value={warpStyle}
              onChange={(e) => setWarpSettings(warpSrc, warpDest, Number(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <option key={i} value={i}>Style {i + 1}</option>
              ))}
            </select>
          </div>
        </>
      )}

    </div>
  );
};

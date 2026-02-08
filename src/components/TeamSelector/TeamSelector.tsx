/**
 * TeamSelector - Radio button group for team selection
 */

import React from 'react';
import { Team } from '@core/map';
import './TeamSelector.css';

interface Props {
  selectedTeam: Team;
  onTeamChange: (team: Team) => void;
  allowNeutral?: boolean;
  label?: string;
  neutralLabel?: string;
  excludeTeam?: Team;
}

const TEAM_INFO = [
  { team: Team.GREEN, label: 'Green', color: '#00aa00' },
  { team: Team.RED, label: 'Red', color: '#cc0000' },
  { team: Team.BLUE, label: 'Blue', color: '#0044cc' },
  { team: Team.YELLOW, label: 'Yellow', color: '#ccaa00' },
  { team: Team.NEUTRAL, label: 'Neutral', color: '#888888' },
];

export const TeamSelector: React.FC<Props> = ({ selectedTeam, onTeamChange, allowNeutral = true, label = 'Team:', neutralLabel, excludeTeam }) => {
  let teams = allowNeutral ? TEAM_INFO : TEAM_INFO.filter(t => t.team !== Team.NEUTRAL);
  if (excludeTeam !== undefined) {
    teams = teams.filter(t => t.team !== excludeTeam);
  }
  // Apply custom neutral label if provided
  if (neutralLabel) {
    teams = teams.map(t => t.team === Team.NEUTRAL ? { ...t, label: neutralLabel } : t);
  }

  return (
    <div className="team-selector">
      <div className="team-selector-label">{label}</div>
      <div className="team-selector-options">
        {teams.map(({ team, label, color }) => (
          <label key={team} className="team-option">
            <input
              type="radio"
              name="team"
              checked={selectedTeam === team}
              onChange={() => onTeamChange(team)}
            />
            <span className="team-dot" style={{ backgroundColor: color }} />
            <span className="team-name">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

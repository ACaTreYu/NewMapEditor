/**
 * Game Settings definitions for Armor Critical maps
 * Based on AC_Setting_Info_25.txt
 */

export interface GameSetting {
  key: string;           // Setting key (e.g., 'LaserDamage')
  label: string;         // Display label (e.g., 'Laser Damage')
  min: number;           // Minimum value
  max: number;           // Maximum value
  default: number;       // Default value
  category: string;      // Category for tab grouping
  subcategory?: string;  // For visual grouping within a tab
  description?: string;  // Optional tooltip text
}

export const SETTING_CATEGORIES = [
  'General',     // Map info + header fields + general settings
  'Weapons',     // Laser, Missile, Bouncy, Grenade
  'Game Rules',  // HoldingTime, ElectionTime, SwitchWin, DominationWin + Toggles
  'Flagger',     // All F-prefixed variants
  'Advanced',    // DHT settings
] as const;

// Subcategory metadata for tabs with internal groupings
export const SETTING_SUBCATEGORIES: Record<string, string[]> = {
  'Weapons': ['Laser', 'Missile', 'Bouncy', 'Grenade'],
  'Game Rules': ['Game', 'Toggles'],
  'Advanced': ['DHT']
};

export const GAME_SETTINGS: GameSetting[] = [
  // ===== General Settings =====
  {
    key: 'ShipSpeed',
    label: 'Ship Speed',
    min: 0,
    max: 200,
    default: 100,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'Speed of ships. Normal is 100.'
  },
  {
    key: 'HealthBonus',
    label: 'Health Bonus',
    min: 0,
    max: 224,
    default: 60,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'How much health you get for a kill.'
  },
  {
    key: 'HealthDecay',
    label: 'Health Decay',
    min: 0,
    max: 224,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'Amount of health player will lose per second.'
  },
  {
    key: 'RepairRate',
    label: 'Repair Rate',
    min: 0,
    max: 244,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'Amount of health a player will gain per second while on a repair tile.'
  },
  {
    key: 'TurretHealth',
    label: 'Turret Health',
    min: 0,
    max: 224,
    default: 224,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'Amount of health for turrets.'
  },

  // ===== Laser Settings =====
  {
    key: 'LaserDamage',
    label: 'Laser Damage',
    min: 0,
    max: 225,
    default: 27,
    category: 'Weapons',
    subcategory: 'Laser',
    description: 'The amount of damage a laser does.'
  },
  {
    key: 'LaserEnergy',
    label: 'Laser Energy',
    min: 0,
    max: 57,
    default: 12,
    category: 'Weapons',
    subcategory: 'Laser',
    description: 'The amount of blue bar it takes to shoot a laser. A setting of 57 will effectively disable the weapon.'
  },
  {
    key: 'LaserTTL',
    label: 'Laser TTL',
    min: 0,
    max: 10000,
    default: 480,
    category: 'Weapons',
    subcategory: 'Laser',
    description: 'How long a laser will last before dying out.'
  },
  {
    key: 'LaserSpeed',
    label: 'Laser Speed',
    min: 0,
    max: 100,
    default: 50,
    category: 'Weapons',
    subcategory: 'Laser',
    description: 'How fast a laser moves. Higher = faster.'
  },

  // ===== Missile Settings =====
  {
    key: 'MissileDamage',
    label: 'Missile Damage',
    min: 0,
    max: 225,
    default: 102,
    category: 'Weapons',
    subcategory: 'Missile',
    description: 'The amount of damage a missile does.'
  },
  {
    key: 'MissileEnergy',
    label: 'Missile Energy',
    min: 0,
    max: 57,
    default: 37,
    category: 'Weapons',
    subcategory: 'Missile',
    description: 'The amount of blue bar it takes to shoot a missile. A setting of 57 will effectively disable the weapon.'
  },
  {
    key: 'MissileTTL',
    label: 'Missile TTL',
    min: 0,
    max: 10000,
    default: 480,
    category: 'Weapons',
    subcategory: 'Missile',
    description: 'How long a missile will last before dying out.'
  },
  {
    key: 'MissileRecharge',
    label: 'Missile Recharge',
    min: 0,
    max: 100000,
    default: 945,
    category: 'Weapons',
    subcategory: 'Missile',
    description: 'How fast a missile charges up. Lower = faster recharge.'
  },
  {
    key: 'MissileSpeed',
    label: 'Missile Speed',
    min: 0,
    max: 100,
    default: 50,
    category: 'Weapons',
    subcategory: 'Missile',
    description: 'How fast a missile moves. Higher = faster.'
  },

  // ===== Bouncy Settings =====
  {
    key: 'BouncyDamage',
    label: 'Bouncy Damage',
    min: 0,
    max: 225,
    default: 48,
    category: 'Weapons',
    subcategory: 'Bouncy',
    description: 'The amount of damage a bouncy does.'
  },
  {
    key: 'BouncyEnergy',
    label: 'Bouncy Energy',
    min: 0,
    max: 57,
    default: 12,
    category: 'Weapons',
    subcategory: 'Bouncy',
    description: 'The amount of blue bar it takes to shoot a bouncy. A setting of 57 will effectively disable the weapon.'
  },
  {
    key: 'BouncyTTL',
    label: 'Bouncy TTL',
    min: 0,
    max: 10000,
    default: 970,
    category: 'Weapons',
    subcategory: 'Bouncy',
    description: 'How long a bouncy will last before dying out. SuperBouncy mode is 9700.'
  },
  {
    key: 'BouncyRecharge',
    label: 'Bouncy Recharge',
    min: 0,
    max: 100000,
    default: 765,
    category: 'Weapons',
    subcategory: 'Bouncy',
    description: 'How fast a bouncy charges up. Lower = faster recharge.'
  },
  {
    key: 'BouncySpeed',
    label: 'Bouncy Speed',
    min: 0,
    max: 100,
    default: 50,
    category: 'Weapons',
    subcategory: 'Bouncy',
    description: 'How fast a bouncy moves. Higher = faster.'
  },

  // ===== Grenade Settings =====
  {
    key: 'NadeDamage',
    label: 'Grenade Damage',
    min: 0,
    max: 225,
    default: 21,
    category: 'Weapons',
    subcategory: 'Grenade',
    description: 'The amount of damage a grenade shrapnel does.'
  },
  {
    key: 'NadeEnergy',
    label: 'Grenade Energy',
    min: 0,
    max: 57,
    default: 19,
    category: 'Weapons',
    subcategory: 'Grenade',
    description: 'The amount of blue bar it takes to shoot a grenade. A setting of 57 will effectively disable the weapon.'
  },
  {
    key: 'ShrapTTL',
    label: 'Shrapnel TTL',
    min: 0,
    max: 10000,
    default: 128,
    category: 'Weapons',
    subcategory: 'Grenade',
    description: 'How long a grenade shrapnel will last before dying out.'
  },
  {
    key: 'ShrapSpeed',
    label: 'Shrapnel Speed',
    min: 0,
    max: 100,
    default: 50,
    category: 'Weapons',
    subcategory: 'Grenade',
    description: 'How fast a grenade shrapnel moves. Higher = faster.'
  },
  {
    key: 'NadeRecharge',
    label: 'Grenade Recharge',
    min: 0,
    max: 100000,
    default: 1950,
    category: 'Weapons',
    subcategory: 'Grenade',
    description: 'How fast a grenade charges up. Lower = faster recharge.'
  },
  {
    key: 'NadeSpeed',
    label: 'Grenade Speed',
    min: 0,
    max: 100,
    default: 50,
    category: 'Weapons',
    subcategory: 'Grenade',
    description: 'How fast a grenade moves. Higher = faster.'
  },

  // ===== Game Settings =====
  {
    key: 'HoldingTime',
    label: 'Holding Time',
    min: 0,
    max: 255,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'The base holding time in seconds. Allows a base holding time of 0 (which Sedit does not).'
  },
  {
    key: 'ElectionTime',
    label: 'Election Time',
    min: 0,
    max: 255,
    default: 50,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'For assassin maps, the time teams have to grab a flag. Specified in seconds.'
  },
  {
    key: 'SwitchWin',
    label: 'Switch Win',
    min: 0,
    max: 9999,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'Number of switches a team must get to win a round on a switch map.'
  },
  {
    key: 'DominationWin',
    label: 'Domination Win',
    min: 0,
    max: 9999999,
    default: 9999999,
    category: 'Game Rules',
    subcategory: 'Game',
    description: 'Points that a team must get to win a round on a domination map.'
  },

  // ===== DHT (Dynamic Holding Time) Settings =====
  {
    key: 'DHT_players',
    label: 'DHT Players',
    min: -999999,
    max: 999999,
    default: 0,
    category: 'Advanced',
    subcategory: 'DHT',
    description: 'Adds time (in milliseconds) for each player in the game.'
  },
  {
    key: 'DHT_time',
    label: 'DHT Time',
    min: -999999,
    max: 999999,
    default: 0,
    category: 'Advanced',
    subcategory: 'DHT',
    description: 'Adds time (in milliseconds) for each elapsed minute of the game.'
  },
  {
    key: 'DHT_deaths',
    label: 'DHT Deaths',
    min: -999999,
    max: 999999,
    default: 0,
    category: 'Advanced',
    subcategory: 'DHT',
    description: 'Adds time (in milliseconds) for each death that player has.'
  },
  {
    key: 'DHT_score',
    label: 'DHT Score',
    min: -999999,
    max: 999999,
    default: 0,
    category: 'Advanced',
    subcategory: 'DHT',
    description: "Adds time (in milliseconds) for each cap that player's team has."
  },
  {
    key: 'DHT_turrets',
    label: 'DHT Turrets',
    min: -999999,
    max: 999999,
    default: 0,
    category: 'Advanced',
    subcategory: 'DHT',
    description: "Adds time (in milliseconds) for each dead turret on that player's team."
  },
  {
    key: 'DHT_minimum',
    label: 'DHT Minimum',
    min: 0,
    max: 255,
    default: 1,
    category: 'Advanced',
    subcategory: 'DHT',
    description: 'Minimum total holding time in seconds.'
  },
  {
    key: 'DHT_maximum',
    label: 'DHT Maximum',
    min: 0,
    max: 255,
    default: 255,
    category: 'Advanced',
    subcategory: 'DHT',
    description: 'Maximum total holding time in seconds.'
  },

  // ===== Flagger Settings (F-prefixed variants) =====
  {
    key: 'FShipSpeed',
    label: 'Flagger Ship Speed',
    min: 0,
    max: 200,
    default: 100,
    category: 'Flagger',
    description: 'Relative to ShipSpeed. FShipSpeed=50 with ShipSpeed=200 means flagging ship moves at 50% speed (100).'
  },
  {
    key: 'FLaserDamage',
    label: 'Flagger Laser Damage',
    min: 0,
    max: 225,
    default: 27,
    category: 'Flagger',
    description: 'Laser damage received by flagging ship.'
  },
  {
    key: 'FLaserEnergy',
    label: 'Flagger Laser Energy',
    min: 0,
    max: 57,
    default: 12,
    category: 'Flagger',
    description: 'Energy cost for flagging ship to fire laser.'
  },
  {
    key: 'FMissileDamage',
    label: 'Flagger Missile Damage',
    min: 0,
    max: 225,
    default: 102,
    category: 'Flagger',
    description: 'Missile damage received by flagging ship.'
  },
  {
    key: 'FMissileEnergy',
    label: 'Flagger Missile Energy',
    min: 0,
    max: 57,
    default: 37,
    category: 'Flagger',
    description: 'Energy cost for flagging ship to fire missile.'
  },
  {
    key: 'FBouncyDamage',
    label: 'Flagger Bouncy Damage',
    min: 0,
    max: 225,
    default: 48,
    category: 'Flagger',
    description: 'Bouncy damage received by flagging ship.'
  },
  {
    key: 'FBouncyEnergy',
    label: 'Flagger Bouncy Energy',
    min: 0,
    max: 57,
    default: 12,
    category: 'Flagger',
    description: 'Energy cost for flagging ship to fire bouncy.'
  },
  {
    key: 'FNadeDamage',
    label: 'Flagger Grenade Damage',
    min: 0,
    max: 225,
    default: 21,
    category: 'Flagger',
    description: 'Grenade damage received by flagging ship.'
  },
  {
    key: 'FNadeEnergy',
    label: 'Flagger Grenade Energy',
    min: 0,
    max: 57,
    default: 19,
    category: 'Flagger',
    description: 'Energy cost for flagging ship to fire grenade.'
  },
  {
    key: 'FHealthBonus',
    label: 'Flagger Health Bonus',
    min: 0,
    max: 224,
    default: 60,
    category: 'Flagger',
    description: 'Health bonus for flagging ship on kill.'
  },
  {
    key: 'FHealthDecay',
    label: 'Flagger Health Decay',
    min: 0,
    max: 224,
    default: 0,
    category: 'Flagger',
    description: 'Health decay per second for flagging ship.'
  },
  {
    key: 'FRepairRate',
    label: 'Flagger Repair Rate',
    min: 0,
    max: 244,
    default: 0,
    category: 'Flagger',
    description: 'Repair rate for flagging ship on repair tile.'
  },

  // ===== Toggle Settings =====
  {
    key: 'DisableSwitchSound',
    label: 'Disable Switch Sound',
    min: 0,
    max: 1,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Toggles',
    description: 'Disables the switch notification sound. 0 = off, 1 = on.'
  },
  {
    key: 'InvisibleMap',
    label: 'Invisible Map',
    min: 0,
    max: 1,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Toggles',
    description: 'Disables drawing of the map. 0 = off, 1 = on.'
  },
  {
    key: 'FogOfWar',
    label: 'Fog of War',
    min: 0,
    max: 1,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Toggles',
    description: 'Enables fog of war shading in that map. 0 = off, 1 = on.'
  },
  {
    key: 'FlagInPlay',
    label: 'Flag In Play',
    min: 0,
    max: 1,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Toggles',
    description: 'Enables extension of the game clock if a flag is in play. 0 = off, 1 = on.'
  },
  {
    key: 'Widescreen',
    label: 'Widescreen',
    min: 0,
    max: 1,
    default: 0,
    category: 'Game Rules',
    subcategory: 'Toggles',
    description: 'Makes the game resolution "wide". Grenade range is limited. 0 = off, 1 = on.'
  },
];

/**
 * Get settings by category
 */
export function getSettingsByCategory(category: string): GameSetting[] {
  return GAME_SETTINGS.filter(s => s.category === category);
}

/**
 * Get settings by subcategory
 */
export function getSettingsBySubcategory(category: string, subcategory: string): GameSetting[] {
  return GAME_SETTINGS.filter(s => s.category === category && s.subcategory === subcategory);
}

/**
 * Get default values as Record
 */
export function getDefaultSettings(): Record<string, number> {
  return GAME_SETTINGS.reduce((acc, s) => {
    acc[s.key] = s.default;
    return acc;
  }, {} as Record<string, number>);
}

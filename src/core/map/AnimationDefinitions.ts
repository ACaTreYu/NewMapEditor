/**
 * Hardcoded animation definitions for Armor Critical
 * Animation IDs 0x00-0xFF (0-255), each mapping to specific tileset frames
 * Based on SEdit animation structure documentation
 */

import { Animation } from './types';

export interface AnimationDefinition extends Animation {
  name: string;
}

// Helper to create range array (e.g., 520-525 -> [520,521,522,523,524,525])
const range = (start: number, end: number): number[] => {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
};

/**
 * All 256 animation definitions (0x00-0xFF)
 * Entries with empty frames[] are undefined/unused animations
 */
export const ANIMATION_DEFINITIONS: AnimationDefinition[] = [
  // 0x00-0x03: Animated wall corners
  { id: 0x00, name: 'TopLeft Wall Corner', frames: [1680, 1682, 1684, 1686, 1688, 1690, 1692, 1694, 1696, 1698], frameCount: 10, speed: 1 },
  { id: 0x01, name: 'TopRight Wall Corner', frames: [1681, 1683, 1685, 1687, 1689, 1691, 1693, 1695, 1697, 1699], frameCount: 10, speed: 1 },
  { id: 0x02, name: 'BotLeft Wall Corner', frames: [1720, 1722, 1724, 1726, 1728, 1730, 1732, 1734, 1736, 1738], frameCount: 10, speed: 1 },
  { id: 0x03, name: 'BotRight Wall Corner', frames: [1721, 1723, 1725, 1727, 1729, 1731, 1733, 1735, 1737, 1739], frameCount: 10, speed: 1 },

  // 0x04-0x07: Red Team Spawn Animations
  { id: 0x04, name: 'Red Team N Spawn', frames: range(520, 525), frameCount: 6, speed: 1 },
  { id: 0x05, name: 'Red Team E Spawn', frames: range(560, 565), frameCount: 6, speed: 1 },
  { id: 0x06, name: 'Red Team W Spawn', frames: range(600, 605), frameCount: 6, speed: 1 },
  { id: 0x07, name: 'Red Team S Spawn', frames: range(640, 645), frameCount: 6, speed: 1 },

  // 0x08-0x0B: Green Team Spawn Animations
  { id: 0x08, name: 'Green Team N Spawn', frames: range(680, 685), frameCount: 6, speed: 1 },
  { id: 0x09, name: 'Green Team E Spawn', frames: range(720, 725), frameCount: 6, speed: 1 },
  { id: 0x0A, name: 'Green Team W Spawn', frames: range(760, 765), frameCount: 6, speed: 1 },
  { id: 0x0B, name: 'Green Team S Spawn', frames: range(800, 805), frameCount: 6, speed: 1 },

  // 0x0C-0x0D: Health Regeneration
  { id: 0x0C, name: 'Health Regen 01', frames: range(1760, 1765), frameCount: 6, speed: 1 },
  { id: 0x0D, name: 'Health Regen 02', frames: range(1800, 1805), frameCount: 6, speed: 1 },

  // 0x0E-0x17: Reserved/Skip
  { id: 0x0E, name: 'Reserved 0E', frames: [], frameCount: 0, speed: 1 },
  { id: 0x0F, name: 'Reserved 0F', frames: [], frameCount: 0, speed: 1 },
  { id: 0x10, name: 'Reserved 10', frames: [], frameCount: 0, speed: 1 },
  { id: 0x11, name: 'Reserved 11', frames: [], frameCount: 0, speed: 1 },
  { id: 0x12, name: 'Reserved 12', frames: [], frameCount: 0, speed: 1 },
  { id: 0x13, name: 'Reserved 13', frames: [], frameCount: 0, speed: 1 },
  { id: 0x14, name: 'Reserved 14', frames: [], frameCount: 0, speed: 1 },
  { id: 0x15, name: 'Reserved 15', frames: [], frameCount: 0, speed: 1 },
  { id: 0x16, name: 'Reserved 16', frames: [], frameCount: 0, speed: 1 },
  { id: 0x17, name: 'Reserved 17', frames: [], frameCount: 0, speed: 1 },

  // 0x18-0x1F: Green Team Flag Pad States
  { id: 0x18, name: 'Green Pad GreenFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x19, name: 'Green Pad RedFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x1A, name: 'Green Pad BlueFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x1B, name: 'Green Pad YellowFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x1C, name: 'Green Pad GreenFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x1D, name: 'Green Pad RedFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x1E, name: 'Green Pad BlueFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x1F, name: 'Green Pad YellowFlag Secured', frames: [], frameCount: 0, speed: 1 },

  // 0x20-0x27: Red Team Flag Pad States
  { id: 0x20, name: 'Red Pad GreenFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x21, name: 'Red Pad RedFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x22, name: 'Red Pad BlueFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x23, name: 'Red Pad YellowFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x24, name: 'Red Pad GreenFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x25, name: 'Red Pad RedFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x26, name: 'Red Pad BlueFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x27, name: 'Red Pad YellowFlag Secured', frames: [], frameCount: 0, speed: 1 },

  // 0x28-0x2F: Blue Team Flag Pad States
  { id: 0x28, name: 'Blue Pad GreenFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x29, name: 'Blue Pad RedFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x2A, name: 'Blue Pad BlueFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x2B, name: 'Blue Pad YellowFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x2C, name: 'Blue Pad GreenFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x2D, name: 'Blue Pad RedFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x2E, name: 'Blue Pad BlueFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x2F, name: 'Blue Pad YellowFlag Secured', frames: [], frameCount: 0, speed: 1 },

  // 0x30-0x31: Reserved
  { id: 0x30, name: 'Reserved 30', frames: [], frameCount: 0, speed: 1 },
  { id: 0x31, name: 'Reserved 31', frames: [], frameCount: 0, speed: 1 },

  // 0x32-0x35: Blue Team Spawn Animations
  { id: 0x32, name: 'Blue Team N Spawn', frames: range(30, 35), frameCount: 6, speed: 1 },
  { id: 0x33, name: 'Blue Team E Spawn', frames: range(70, 75), frameCount: 6, speed: 1 },
  { id: 0x34, name: 'Blue Team W Spawn', frames: range(110, 115), frameCount: 6, speed: 1 },
  { id: 0x35, name: 'Blue Team S Spawn', frames: range(150, 155), frameCount: 6, speed: 1 },

  // 0x36-0x39: Yellow Team Spawn Animations
  { id: 0x36, name: 'Yellow Team N Spawn', frames: range(428, 433), frameCount: 6, speed: 1 },
  { id: 0x37, name: 'Yellow Team E Spawn', frames: range(468, 473), frameCount: 6, speed: 1 },
  { id: 0x38, name: 'Yellow Team W Spawn', frames: range(508, 513), frameCount: 6, speed: 1 },
  { id: 0x39, name: 'Yellow Team S Spawn', frames: range(548, 553), frameCount: 6, speed: 1 },

  // 0x3A-0x41: Yellow Team Flag Pad States
  { id: 0x3A, name: 'Yellow Pad GreenFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x3B, name: 'Yellow Pad RedFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x3C, name: 'Yellow Pad BlueFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x3D, name: 'Yellow Pad YellowFlag Unsecured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x3E, name: 'Yellow Pad GreenFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x3F, name: 'Yellow Pad RedFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x40, name: 'Yellow Pad BlueFlag Secured', frames: [], frameCount: 0, speed: 1 },
  { id: 0x41, name: 'Yellow Pad YellowFlag Secured', frames: [], frameCount: 0, speed: 1 },

  // 0x42-0x4A: Green Team Flag Cap Pad (3x3 grid)
  { id: 0x42, name: 'Green Cap Pad TL', frames: [840, 843, 846, 849, 852], frameCount: 5, speed: 1 },
  { id: 0x43, name: 'Green Cap Pad TM', frames: [841, 844, 847, 850, 853], frameCount: 5, speed: 1 },
  { id: 0x44, name: 'Green Cap Pad TR', frames: [842, 845, 848, 851, 854], frameCount: 5, speed: 1 },
  { id: 0x45, name: 'Green Cap Pad ML', frames: [880, 883, 886, 889, 892], frameCount: 5, speed: 1 },
  { id: 0x46, name: 'Unrelated Anim 46', frames: [], frameCount: 0, speed: 1 },
  { id: 0x47, name: 'Green Cap Pad MR', frames: [882, 885, 888, 891, 894], frameCount: 5, speed: 1 },
  { id: 0x48, name: 'Green Cap Pad BL', frames: [920, 923, 926, 929, 932], frameCount: 5, speed: 1 },
  { id: 0x49, name: 'Green Cap Pad BM', frames: [921, 924, 927, 930, 933], frameCount: 5, speed: 1 },
  { id: 0x4A, name: 'Green Cap Pad BR', frames: [922, 925, 928, 931, 934], frameCount: 5, speed: 1 },

  // 0x4B-0x53: Red Team Flag Cap Pad (3x3 grid)
  { id: 0x4B, name: 'Red Cap Pad TL', frames: [960, 963, 966, 969, 972], frameCount: 5, speed: 1 },
  { id: 0x4C, name: 'Red Cap Pad TM', frames: [961, 964, 967, 970, 973], frameCount: 5, speed: 1 },
  { id: 0x4D, name: 'Red Cap Pad TR', frames: [962, 965, 968, 971, 974], frameCount: 5, speed: 1 },
  { id: 0x4E, name: 'Red Cap Pad ML', frames: [1000, 1003, 1006, 1009, 1012], frameCount: 5, speed: 1 },
  { id: 0x4F, name: 'Unrelated Anim 4F', frames: [], frameCount: 0, speed: 1 },
  { id: 0x50, name: 'Red Cap Pad MR', frames: [1002, 1005, 1008, 1011, 1014], frameCount: 5, speed: 1 },
  { id: 0x51, name: 'Red Cap Pad BL', frames: [1040, 1043, 1046, 1049, 1052], frameCount: 5, speed: 1 },
  { id: 0x52, name: 'Red Cap Pad BM', frames: [1041, 1044, 1047, 1050, 1053], frameCount: 5, speed: 1 },
  { id: 0x53, name: 'Red Cap Pad BR', frames: [1042, 1045, 1048, 1051, 1054], frameCount: 5, speed: 1 },

  // 0x54-0x5C: Blue Team Flag Cap Pad (3x3 grid)
  { id: 0x54, name: 'Blue Cap Pad TL', frames: [1080, 1083, 1086, 1089, 1092], frameCount: 5, speed: 1 },
  { id: 0x55, name: 'Blue Cap Pad TM', frames: [1081, 1084, 1087, 1090, 1093], frameCount: 5, speed: 1 },
  { id: 0x56, name: 'Blue Cap Pad TR', frames: [1082, 1085, 1088, 1091, 1094], frameCount: 5, speed: 1 },
  { id: 0x57, name: 'Blue Cap Pad ML', frames: [1120, 1123, 1126, 1129, 1132], frameCount: 5, speed: 1 },
  { id: 0x58, name: 'Unrelated Anim 58', frames: [], frameCount: 0, speed: 1 },
  { id: 0x59, name: 'Blue Cap Pad MR', frames: [1122, 1125, 1128, 1131, 1134], frameCount: 5, speed: 1 },
  { id: 0x5A, name: 'Blue Cap Pad BL', frames: [1160, 1163, 1166, 1169, 1172], frameCount: 5, speed: 1 },
  { id: 0x5B, name: 'Blue Cap Pad BM', frames: [1161, 1164, 1167, 1170, 1173], frameCount: 5, speed: 1 },
  { id: 0x5C, name: 'Blue Cap Pad BR', frames: [1162, 1165, 1168, 1171, 1174], frameCount: 5, speed: 1 },

  // 0x5D-0x65: Yellow Team Flag Cap Pad (3x3 grid) - single frame each
  { id: 0x5D, name: 'Yellow Cap Pad TL', frames: [1200], frameCount: 1, speed: 1 },
  { id: 0x5E, name: 'Yellow Cap Pad TM', frames: [1201], frameCount: 1, speed: 1 },
  { id: 0x5F, name: 'Yellow Cap Pad TR', frames: [1202], frameCount: 1, speed: 1 },
  { id: 0x60, name: 'Yellow Cap Pad ML', frames: [1240], frameCount: 1, speed: 1 },
  { id: 0x61, name: 'Unrelated Anim 61', frames: [], frameCount: 0, speed: 1 },
  { id: 0x62, name: 'Yellow Cap Pad MR', frames: [1242], frameCount: 1, speed: 1 },
  { id: 0x63, name: 'Yellow Cap Pad BL', frames: [1280], frameCount: 1, speed: 1 },
  { id: 0x64, name: 'Yellow Cap Pad BM', frames: [1281], frameCount: 1, speed: 1 },
  { id: 0x65, name: 'Yellow Cap Pad BR', frames: [1282], frameCount: 1, speed: 1 },

  // 0x66-0x6E: Neutral Team Flag Cap Pad (3x3 grid)
  { id: 0x66, name: 'Neutral Cap Pad TL', frames: [1320], frameCount: 1, speed: 1 },
  { id: 0x67, name: 'Neutral Cap Pad TM', frames: [1321], frameCount: 1, speed: 1 },
  { id: 0x68, name: 'Neutral Cap Pad TR', frames: [1322], frameCount: 1, speed: 1 },
  { id: 0x69, name: 'Neutral Cap Pad ML', frames: [1360], frameCount: 1, speed: 1 },
  { id: 0x6A, name: 'Unrelated Anim 6A', frames: [], frameCount: 0, speed: 1 },
  { id: 0x6B, name: 'Neutral Cap Pad MR', frames: [1362], frameCount: 1, speed: 1 },
  { id: 0x6C, name: 'Neutral Cap Pad BL', frames: [1400], frameCount: 1, speed: 1 },
  { id: 0x6D, name: 'Neutral Cap Pad BM', frames: [1401], frameCount: 1, speed: 1 },
  { id: 0x6E, name: 'Neutral Cap Pad BR', frames: [1402, 1405, 1408, 1411], frameCount: 4, speed: 1 },

  // 0x6F-0x76: Energy Field Animations
  { id: 0x6F, name: 'EnergyField L/R Gate', frames: range(651, 654), frameCount: 4, speed: 1 },
  { id: 0x70, name: 'EnergyField R End', frames: range(655, 657), frameCount: 3, speed: 1 },
  { id: 0x71, name: 'EnergyField L End', frames: [615, 616, 650], frameCount: 3, speed: 1 },
  { id: 0x72, name: 'Reserved 72', frames: [], frameCount: 0, speed: 1 },
  { id: 0x73, name: 'Reserved 73', frames: [], frameCount: 0, speed: 1 },
  { id: 0x74, name: 'EnergyField Bot End', frames: [532, 572, 612], frameCount: 3, speed: 1 },
  { id: 0x75, name: 'EnergyField Top End', frames: [412, 452, 492], frameCount: 3, speed: 1 },
  { id: 0x76, name: 'EnergyField U/D Gate', frames: [491, 531, 571, 611], frameCount: 4, speed: 1 },

  // 0x77-0x7A: Reserved
  { id: 0x77, name: 'Reserved 77', frames: [], frameCount: 0, speed: 1 },
  { id: 0x78, name: 'Reserved 78', frames: [], frameCount: 0, speed: 1 },
  { id: 0x79, name: 'Reserved 79', frames: [], frameCount: 0, speed: 1 },
  { id: 0x7A, name: 'Reserved 7A', frames: [], frameCount: 0, speed: 1 },

  // 0x7B-0x7F: Switch Animations
  { id: 0x7B, name: 'Unflipped Switch', frames: [743], frameCount: 1, speed: 1 },
  { id: 0x7C, name: 'Flipped Green Switch', frames: range(705, 711), frameCount: 7, speed: 1 },
  { id: 0x7D, name: 'Flipped Red Switch', frames: range(745, 751), frameCount: 7, speed: 1 },
  { id: 0x7E, name: 'Flipped Blue Switch', frames: range(785, 791), frameCount: 7, speed: 1 },
  { id: 0x7F, name: 'Flipped Yellow Switch', frames: range(825, 831), frameCount: 7, speed: 1 },

  // 0x80-0x83: Team Pad NeutralFlag Unsecured
  { id: 0x80, name: 'Green Pad NeutralFlag Unsecured', frames: [1336, 1337, 1375, 1376, 1377, 1415, 1416, 1417], frameCount: 8, speed: 1 },
  { id: 0x81, name: 'Red Pad NeutralFlag Unsecured', frames: [1342, 1343, 1381, 1382, 1383, 1421, 1422, 1423], frameCount: 8, speed: 1 },
  { id: 0x82, name: 'Blue Pad NeutralFlag Unsecured', frames: [1456, 1457, 1495, 1496, 1497, 1535, 1536, 1537], frameCount: 8, speed: 1 },
  { id: 0x83, name: 'Yellow Pad NeutralFlag Unsecured', frames: [1462, 1463, 1501, 1502, 1503, 1541, 1542, 1543], frameCount: 8, speed: 1 },

  // 0x84-0x87: Neutral Flag in Team Holder
  { id: 0x84, name: 'NeutralFlag in Green Holder', frames: [1338, 1339, 1340, 1378], frameCount: 4, speed: 1 },
  { id: 0x85, name: 'NeutralFlag in Red Holder', frames: [1344, 1345, 1346, 1384], frameCount: 4, speed: 1 },
  { id: 0x86, name: 'NeutralFlag in Blue Holder', frames: [1458, 1459, 1460, 1498], frameCount: 4, speed: 1 },
  { id: 0x87, name: 'NeutralFlag in Yellow Holder', frames: [1464, 1465, 1466, 1504], frameCount: 4, speed: 1 },

  // 0x88: Neutral Team Pad NeutralFlag
  { id: 0x88, name: 'Neutral Pad NeutralFlag Unsecured', frames: [1658], frameCount: 1, speed: 1 },

  // 0x89-0x8A: Reserved
  { id: 0x89, name: 'Reserved 89', frames: [], frameCount: 0, speed: 1 },
  { id: 0x8A, name: 'Reserved 8A', frames: [], frameCount: 0, speed: 1 },

  // 0x8B-0x90: Spawn Animations
  { id: 0x8B, name: 'Spawn Into Map', frames: range(866, 869), frameCount: 4, speed: 1 },
  { id: 0x8C, name: 'NeutralFlag Capped', frames: [1578, 1579, 1580, 618], frameCount: 4, speed: 1 },
  { id: 0x8D, name: 'Green Spawn HoldingPen', frames: range(65, 68), frameCount: 4, speed: 1 },
  { id: 0x8E, name: 'Red Spawn HoldingPen', frames: range(105, 108), frameCount: 4, speed: 1 },
  { id: 0x8F, name: 'Blue Spawn HoldingPen', frames: range(188, 191), frameCount: 4, speed: 1 },
  { id: 0x90, name: 'Yellow Spawn HoldingPen', frames: range(228, 231), frameCount: 4, speed: 1 },

  // 0x91-0x99: Reserved
  { id: 0x91, name: 'Reserved 91', frames: [], frameCount: 0, speed: 1 },
  { id: 0x92, name: 'Reserved 92', frames: [], frameCount: 0, speed: 1 },
  { id: 0x93, name: 'Reserved 93', frames: [], frameCount: 0, speed: 1 },
  { id: 0x94, name: 'Reserved 94', frames: [], frameCount: 0, speed: 1 },
  { id: 0x95, name: 'Reserved 95', frames: [], frameCount: 0, speed: 1 },
  { id: 0x96, name: 'Reserved 96', frames: [], frameCount: 0, speed: 1 },
  { id: 0x97, name: 'Reserved 97', frames: [], frameCount: 0, speed: 1 },
  { id: 0x98, name: 'Reserved 98', frames: [], frameCount: 0, speed: 1 },
  { id: 0x99, name: 'Reserved 99', frames: [], frameCount: 0, speed: 1 },

  // 0x9A-0xA2: Big Warp (3x3 grid)
  { id: 0x9A, name: 'BigWarp TL', frames: [1347, 1350, 1353, 1356], frameCount: 4, speed: 1 },
  { id: 0x9B, name: 'BigWarp TM', frames: [1348, 1351, 1354, 1357], frameCount: 4, speed: 1 },
  { id: 0x9C, name: 'BigWarp TR', frames: [1349, 1352, 1355, 1358], frameCount: 4, speed: 1 },
  { id: 0x9D, name: 'BigWarp ML', frames: [1387, 1390, 1393, 1396], frameCount: 4, speed: 1 },
  { id: 0x9E, name: 'BigWarp MM', frames: [1388, 1391, 1394, 1397], frameCount: 4, speed: 1 },
  { id: 0x9F, name: 'BigWarp MR', frames: [1389, 1392, 1395, 1398], frameCount: 4, speed: 1 },
  { id: 0xA0, name: 'BigWarp BL', frames: [1427, 1430, 1433, 1436], frameCount: 4, speed: 1 },
  { id: 0xA1, name: 'BigWarp BM', frames: [1428, 1431, 1434, 1437], frameCount: 4, speed: 1 },
  { id: 0xA2, name: 'BigWarp BR', frames: [1429, 1432, 1435, 1438], frameCount: 4, speed: 1 },

  // 0xA3-0xA6: On-Map Spawn Animations
  { id: 0xA3, name: 'Green OnMapSpawn', frames: range(870, 875), frameCount: 6, speed: 1 },
  { id: 0xA4, name: 'Red OnMapSpawn', frames: [976, 977, 978, 979, 1016, 1017], frameCount: 6, speed: 1 },
  { id: 0xA5, name: 'Blue OnMapSpawn', frames: [1099, 1100, 1101, 1102, 1139, 1140], frameCount: 6, speed: 1 },
  { id: 0xA6, name: 'Yellow OnMapSpawn', frames: [1222, 1223, 1224, 1225, 1262, 1263], frameCount: 6, speed: 1 },

  // 0xA7-0xBC: Reserved
  ...Array.from({ length: 22 }, (_, i) => ({
    id: 0xA7 + i,
    name: `Reserved ${(0xA7 + i).toString(16).toUpperCase()}`,
    frames: [] as number[],
    frameCount: 0,
    speed: 1
  })),

  // 0xBD: Turret Animation
  { id: 0xBD, name: 'Turret Animation', frames: range(2728, 2731), frameCount: 4, speed: 1 },

  // 0xBE-0xF5: Reserved
  ...Array.from({ length: 56 }, (_, i) => ({
    id: 0xBE + i,
    name: `Reserved ${(0xBE + i).toString(16).toUpperCase()}`,
    frames: [] as number[],
    frameCount: 0,
    speed: 1
  })),

  // 0xF6-0xFA: Warp Tiles (single frame each)
  { id: 0xF6, name: 'Warp Tile F6', frames: [1386], frameCount: 1, speed: 1 },
  { id: 0xF7, name: 'Warp Tile F7', frames: [1426], frameCount: 1, speed: 1 },
  { id: 0xF8, name: 'Warp Tile F8', frames: [1359], frameCount: 1, speed: 1 },
  { id: 0xF9, name: 'Warp Tile F9', frames: [1399], frameCount: 1, speed: 1 },
  { id: 0xFA, name: 'Warp Tile FA', frames: [1439], frameCount: 1, speed: 1 },

  // 0xFB-0xFF: Reserved
  { id: 0xFB, name: 'Reserved FB', frames: [], frameCount: 0, speed: 1 },
  { id: 0xFC, name: 'Reserved FC', frames: [], frameCount: 0, speed: 1 },
  { id: 0xFD, name: 'Reserved FD', frames: [], frameCount: 0, speed: 1 },
  { id: 0xFE, name: 'Reserved FE', frames: [], frameCount: 0, speed: 1 },
  { id: 0xFF, name: 'Reserved FF', frames: [], frameCount: 0, speed: 1 },
];

/**
 * Get animation by ID
 */
export function getAnimationById(id: number): AnimationDefinition | undefined {
  if (id < 0 || id > 255) return undefined;
  return ANIMATION_DEFINITIONS[id];
}

/**
 * Get all defined (non-empty) animations
 */
export function getDefinedAnimations(): AnimationDefinition[] {
  return ANIMATION_DEFINITIONS.filter(a => a.frames.length > 0);
}

/**
 * Check if an animation ID has frame data
 */
export function isAnimationDefined(id: number): boolean {
  const anim = getAnimationById(id);
  return anim !== undefined && anim.frames.length > 0;
}

export const areaConfig = {
  "Area 1": ["T1", "T2", "T3", "T4", "T5", "T6", "T14", "T15"],
  "Area 2": ["T16", "T17", "T18", "T12"],
  "Area 3": ["T7", "T8", "T9", "T10"],
  "Area 4": ["Club House", "NTA"],
};

const buildTowerConfig = () => {
  const config = {};

  Object.values(areaConfig).flat().forEach((tower) => {
    config[tower] = {
      area: Object.keys(areaConfig).find((area) => areaConfig[area].includes(tower)),
      maxLevel: ["T16", "T17", "T18"].includes(tower) ? 42 : 34,
      poursPerLevel: tower === "Club House" || tower === "NTA" ? 2 : 3,
      phase: "Phase 1",
    };
  });

  return config;
};

export const towerConfig = buildTowerConfig();

export const getAreas = () => Object.keys(areaConfig);

export const getTowersForArea = (area) => areaConfig[area] || [];

export const getLevelsForTower = (tower) => {
  const maxLevel = towerConfig[tower]?.maxLevel || 0;

  return Array.from({ length: maxLevel }, (_, index) => `Level ${index + 1}`);
};

export const getPoursForTower = (tower) => {
  const poursPerLevel = towerConfig[tower]?.poursPerLevel || 0;

  return Array.from({ length: poursPerLevel }, (_, index) => `Pour ${index + 1}`);
};

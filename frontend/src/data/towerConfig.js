export const areaConfig = {
  "Area 1": ["T1", "T2", "T3", "T4", "T5", "T6", "T14", "T15"],
  "Area 2": ["T16", "T17", "T18", "T12"],
  "Area 3": ["T7", "T8", "T9", "T10", "T11"],
  "Area 4": ["Area 4"],
};

const basementToTerraceLevels = [
  "PCC",
  ...Array.from({ length: 40 }, (_, index) => `Level ${index + 1}`),
  "Terrace",
];

const basementToGroundLevels = [
  "PCC",
  "Basement 3",
  "Basement 2",
  "Basement 1",
  "Ground Floor",
];

const buildTowerConfig = () => {
  const config = {};

  Object.values(areaConfig).flat().forEach((tower) => {
    if (areaConfig["Area 3"].includes(tower)) {
      config[tower] = {
        area: "Area 3",
        levels: basementToTerraceLevels,
        pours: ["Pour 1", "Pour 2", "Pour 3"],
        phase: "Phase 1",
      };
      return;
    }

    if (tower === "Area 4") {
      config[tower] = {
        area: "Area 4",
        levels: basementToGroundLevels,
        pours: ["Complete Floor"],
        phase: "Phase 1",
      };
      return;
    }

    config[tower] = {
      area: Object.keys(areaConfig).find((area) => areaConfig[area].includes(tower)),
      maxLevel: ["T16", "T17", "T18"].includes(tower) ? 42 : 34,
      poursPerLevel: 3,
      phase: "Phase 1",
    };
  });

  return config;
};

export const towerConfig = buildTowerConfig();

export const getAreas = () => Object.keys(areaConfig);

export const getTowersForArea = (area) => areaConfig[area] || [];

export const getLevelsForTower = (tower) => {
  if (towerConfig[tower]?.levels) {
    return towerConfig[tower].levels;
  }

  const maxLevel = towerConfig[tower]?.maxLevel || 0;
  const regularLevels = Array.from({ length: Math.min(maxLevel, 32) }, (_, index) => `Level ${index + 1}`);

  return ["PCC", ...regularLevels, "Terrace", "LMR Bottom Slab", "LMR Roof Slab"];
};

export const getPoursForTower = (tower) => {
  if (towerConfig[tower]?.pours) {
    return towerConfig[tower].pours;
  }

  const poursPerLevel = towerConfig[tower]?.poursPerLevel || 0;

  return Array.from({ length: poursPerLevel }, (_, index) => `Pour ${index + 1}`);
};

export const siteConfiguration = {
  phase1: {
    typicalTowers: [1, 2, 3, 4, 5, 6, 14, 15],
    area2: [10, 11, 12, 16, 17, 18, 19],
    pcc: ["PCC"],
    nta: ["NTA"],
    centralNta: ["Central NTA"],
  },
};

export const getSiteGroup = (towerName) => {
  if (!towerName) {
    return "other";
  }

  const normalized = String(towerName).trim();
  const numericMatch = normalized.match(/^Tower\s*(\d+)$/i);

  if (siteConfiguration.phase1.pcc.includes(normalized)) {
    return "pcc";
  }

  if (siteConfiguration.phase1.nta.includes(normalized)) {
    return "nta";
  }

  if (siteConfiguration.phase1.centralNta.includes(normalized)) {
    return "centralNta";
  }

  if (numericMatch) {
    const towerNumber = Number(numericMatch[1]);

    if (siteConfiguration.phase1.typicalTowers.includes(towerNumber)) {
      return "typicalTowers";
    }

    if (siteConfiguration.phase1.area2.includes(towerNumber)) {
      return "area2";
    }
  }

  return "other";
};

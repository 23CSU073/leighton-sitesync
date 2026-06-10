import siteLayout from "../assets/site-layout.png";
import { areaConfig, towerConfig } from "../data/towerConfig";

function SiteLayout() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-3 shadow">
        <img src={siteLayout} alt="Site Layout" className="w-full rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Object.entries(areaConfig).map(([area, towers]) => (
          <section key={area} className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">{area}</h2>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                Phase 1
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {towers.map((tower) => (
                <div key={tower} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-bold">{tower}</p>
                  <p className="text-sm text-slate-600">
                    {towerConfig[tower]?.maxLevel || 0} levels
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default SiteLayout;

import { projects } from "../data/projects";
import { towers } from "../data/towers";
import { floors } from "../data/floors";
import { zones } from "../data/zones";
import { activities } from "../data/activities";
import { subcontractors } from "../data/subcontractors";
import { weatherOptions } from "../data/weather";
import { shifts } from "../data/shifts";

function DprForm() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">

      <h2 className="text-xl font-bold mb-4">
        Daily Progress Report
      </h2>

      <form className="space-y-4">

        {/* Date */}

        <div>
          <label className="block mb-1 font-medium">
            Date
          </label>

          <input
            type="date"
            className="w-full border rounded-lg p-3"
          />
        </div>

        {/* Engineer Name */}

        <div>
          <label className="block mb-1 font-medium">
            Engineer Name
          </label>

          <input
            type="text"
            placeholder="Enter name"
            className="w-full border rounded-lg p-3"
          />
        </div>

        {/* Project */}

        <div>
          <label className="block mb-1 font-medium">
            Project
          </label>

          <select className="w-full border rounded-lg p-3">

            <option>Select Project</option>

            {projects.map((project) => (
              <option key={project}>
                {project}
              </option>
            ))}

          </select>
        </div>

        {/* Tower */}

        <div>
          <label className="block mb-1 font-medium">
            Tower
          </label>

          <select className="w-full border rounded-lg p-3">

            <option>Select Tower</option>

            {towers.map((tower) => (
              <option key={tower}>
                {tower}
              </option>
            ))}

          </select>
        </div>

        {/* Floor */}

        <div>
          <label className="block mb-1 font-medium">
            Floor
          </label>

          <select className="w-full border rounded-lg p-3">

            <option>Select Floor</option>

            {floors.map((floor) => (
              <option key={floor}>
                {floor}
              </option>
            ))}

          </select>
        </div>

      </form>
    </div>
  );
}

export default DprForm;
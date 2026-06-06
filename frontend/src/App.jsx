import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const towers = [
  'Tower A (Residential)',
  'Tower B (Residential)',
  'Commercial Block',
];

const subcontractors = [
  'Ahluwalia Contracts Ltd',
  'Larsen & Toubro (L&T)',
  'Sterling & Wilson',
];

const activityOptions = [
  { activity: 'Slab Concreting', unit: 'cum' },
  { activity: 'Formwork / Shuttering', unit: 'sqm' },
  { activity: 'Reinforcement / Steel Binding', unit: 'MT' },
  { activity: 'Brickwork / Masonry', unit: 'sqm' },
];

const weatherOptions = ['Clear/Sunny', 'Heavy Rains', 'Dust Storm', 'Extreme Heat'];

const progressPhotoUrls = [
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517089596392-fb9a9033e05e?auto=format&fit=crop&w=900&q=80',
];

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  date: today,
  engineerName: '',
  shift: 'Day',
  weather: 'Clear/Sunny',
  tower: towers[0],
  floor: '',
  subcontractor: subcontractors[0],
  activity: activityOptions[0].activity,
  quantity: '',
  unit: activityOptions[0].unit,
  photoUrl: '',
  remarks: '',
};

function App() {
  const [formData, setFormData] = useState(emptyForm);
  const [dprLogs, setDprLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchDprLogs();
  }, []);

  async function fetchDprLogs() {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/dpr`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to fetch DPR logs');
      }

      setDprLogs(data);
      setStatusMessage('');
    } catch (error) {
      setStatusMessage(`Backend connection issue: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(fieldName, value) {
    setFormData((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  }

  function handleActivityChange(selectedActivity) {
    const selectedOption = activityOptions.find(
      (option) => option.activity === selectedActivity
    );

    setFormData((currentForm) => ({
      ...currentForm,
      activity: selectedActivity,
      unit: selectedOption?.unit || '',
    }));
  }

  function attachMockPhoto() {
    const randomIndex = Math.floor(Math.random() * progressPhotoUrls.length);
    updateField('photoUrl', progressPhotoUrls[randomIndex]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
    };

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/dpr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Unable to save DPR');
      }

      setDprLogs((currentLogs) => [data.data, ...currentLogs]);
      setFormData({
        ...emptyForm,
        date: today,
        engineerName: formData.engineerName,
      });
      setStatusMessage('DPR saved successfully.');
    } catch (error) {
      setStatusMessage(`Save failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const insights = useMemo(() => {
    const concreteVolume = dprLogs.reduce((total, log) => {
      if (log.activity === 'Slab Concreting') {
        return total + Number(log.quantity || 0);
      }

      return total;
    }, 0);

    const todaysLogs = dprLogs.filter((log) => log.date === today);
    const activeSubcontractorsToday = new Set(
      todaysLogs.map((log) => log.subcontractor).filter(Boolean)
    ).size;

    const criticalHoldups = dprLogs.filter((log) => {
      const remarks = String(log.remarks || '').toLowerCase();
      return (
        remarks.includes('delay') ||
        remarks.includes('breakdown') ||
        remarks.includes('rain')
      );
    }).length;

    return {
      concreteVolume,
      activeSubcontractorsToday,
      criticalHoldups,
    };
  }, [dprLogs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return dprLogs;
    }

    return dprLogs.filter((log) => {
      const searchableText = `${log.tower} ${log.activity} ${log.subcontractor}`.toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [dprLogs, searchTerm]);

  function exportToCsv() {
    if (dprLogs.length === 0) {
      setStatusMessage('No DPR records available for export.');
      return;
    }

    const headers = [
      'Date',
      'Engineer Name',
      'Shift',
      'Weather',
      'Tower',
      'Floor',
      'Subcontractor',
      'Activity',
      'Quantity',
      'Unit',
      'Photo URL',
      'Remarks',
    ];

    const rows = dprLogs.map((log) => [
      log.date,
      log.engineerName,
      log.shift,
      log.weather,
      log.tower,
      log.floor,
      log.subcontractor,
      log.activity,
      log.quantity,
      log.unit,
      log.photoUrl,
      log.remarks,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = `leighton-sitesync-dpr-${today}.csv`;
    link.click();

    URL.revokeObjectURL(downloadUrl);
    setStatusMessage('Primavera P6 CSV export created.');
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b-4 border-yellow-400 bg-slate-950 px-4 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-300">
              Dwarka Expressway, Sector 106
            </p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">
              Leighton SiteSync
            </h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-300">
              Mobile DPR logging, live progress visibility, and Primavera-ready exports.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDprLogs}
            className="h-[48px] border-2 border-yellow-300 bg-yellow-300 px-5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-yellow-200"
          >
            Refresh Logs
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-3">
        <InsightCard
          label="Concrete Cast"
          value={`${insights.concreteVolume.toFixed(2)} cum`}
          note="Cumulative slab concreting volume"
        />
        <InsightCard
          label="Active Agencies Today"
          value={insights.activeSubcontractorsToday}
          note="Distinct subcontractors logged today"
        />
        <InsightCard
          label="Critical Holdups"
          value={insights.criticalHoldups}
          note="Remarks with delay, breakdown, or rain"
        />
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        <form
          onSubmit={handleSubmit}
          className="border-2 border-slate-900 bg-white p-4 shadow-md"
        >
          <div className="mb-4 border-b-2 border-slate-900 pb-3">
            <h2 className="text-xl font-black">Daily Progress Entry</h2>
            <p className="text-sm font-semibold text-slate-600">
              DPR fields are locked to site master data where possible.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={formData.date}
                onChange={(event) => updateField('date', event.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Engineer Name">
              <input
                type="text"
                value={formData.engineerName}
                onChange={(event) =>
                  updateField('engineerName', event.target.value)
                }
                className={inputClass}
                placeholder="Field engineer"
                required
              />
            </Field>

            <Field label="Shift">
              <select
                value={formData.shift}
                onChange={(event) => updateField('shift', event.target.value)}
                className={inputClass}
              >
                <option>Day</option>
                <option>Night</option>
              </select>
            </Field>

            <Field label="Weather">
              <select
                value={formData.weather}
                onChange={(event) => updateField('weather', event.target.value)}
                className={inputClass}
              >
                {weatherOptions.map((weather) => (
                  <option key={weather}>{weather}</option>
                ))}
              </select>
            </Field>

            <Field label="Tower / Zone">
              <select
                value={formData.tower}
                onChange={(event) => updateField('tower', event.target.value)}
                className={inputClass}
              >
                {towers.map((tower) => (
                  <option key={tower}>{tower}</option>
                ))}
              </select>
            </Field>

            <Field label="Floor">
              <input
                type="text"
                value={formData.floor}
                onChange={(event) => updateField('floor', event.target.value)}
                className={inputClass}
                placeholder="Example: Podium L2"
                required
              />
            </Field>

            <Field label="Subcontractor">
              <select
                value={formData.subcontractor}
                onChange={(event) =>
                  updateField('subcontractor', event.target.value)
                }
                className={inputClass}
              >
                {subcontractors.map((subcontractor) => (
                  <option key={subcontractor}>{subcontractor}</option>
                ))}
              </select>
            </Field>

            <Field label="Activity">
              <select
                value={formData.activity}
                onChange={(event) => handleActivityChange(event.target.value)}
                className={inputClass}
              >
                {activityOptions.map((option) => (
                  <option key={option.activity}>{option.activity}</option>
                ))}
              </select>
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(event) => updateField('quantity', event.target.value)}
                className={inputClass}
                placeholder="0.00"
                required
              />
            </Field>

            <Field label="Unit">
              <input
                type="text"
                value={formData.unit}
                className={`${inputClass} bg-slate-200`}
                readOnly
              />
            </Field>
          </div>

          <Field label="Remarks / Constraints">
            <textarea
              value={formData.remarks}
              onChange={(event) => updateField('remarks', event.target.value)}
              className={`${inputClass} min-h-28 resize-y py-3`}
              placeholder="Example: concrete pump breakdown caused delay"
            />
          </Field>

          <button
            type="button"
            onClick={attachMockPhoto}
            className="mt-3 h-[52px] w-full border-2 border-slate-900 bg-slate-100 px-4 text-base font-black text-slate-950 shadow-sm transition hover:bg-yellow-100"
          >
            Progress Verification Photo
          </button>

          {formData.photoUrl && (
            <img
              src={formData.photoUrl}
              alt="Progress verification preview"
              className="mt-3 h-44 w-full border-2 border-slate-900 object-cover"
            />
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 h-[56px] w-full bg-slate-950 px-4 text-lg font-black text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isLoading ? 'Saving DPR...' : 'Save DPR Entry'}
          </button>

          {statusMessage && (
            <p className="mt-3 border-l-4 border-yellow-400 bg-yellow-50 p-3 text-sm font-bold text-slate-900">
              {statusMessage}
            </p>
          )}
        </form>

        <section className="border-2 border-slate-900 bg-white p-4 shadow-md">
          <div className="flex flex-col gap-3 border-b-2 border-slate-900 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black">Live DPR Ledger</h2>
              <p className="text-sm font-semibold text-slate-600">
                Search by tower, activity, or executing agency.
              </p>
            </div>
            <button
              type="button"
              onClick={exportToCsv}
              className="h-[48px] bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              Export P6 CSV
            </button>
          </div>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="my-4 h-[52px] w-full border-2 border-slate-900 bg-white px-4 text-base font-bold outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200"
            placeholder="Search Tower A, concreting, L&T..."
          />

          <div className="grid max-h-[760px] gap-3 overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="border-2 border-dashed border-slate-400 bg-slate-50 p-6 text-center font-bold text-slate-600">
                No DPR logs found. Add the first site entry to begin tracking.
              </div>
            ) : (
              filteredLogs.map((log) => <LedgerCard key={log._id} log={log} />)
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

const inputClass =
  'mt-1 h-[52px] w-full border-2 border-slate-900 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200';

function Field({ label, children }) {
  return (
    <label className="mt-3 block text-left text-sm font-black uppercase text-slate-700">
      {label}
      {children}
    </label>
  );
}

function InsightCard({ label, value, note }) {
  return (
    <article className="border-2 border-slate-900 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{note}</p>
    </article>
  );
}

function LedgerCard({ log }) {
  return (
    <article className="border-2 border-slate-300 bg-slate-50 p-3 text-left">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {log.date} | {log.shift} Shift | {log.weather}
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {log.activity}
          </h3>
          <p className="text-sm font-bold text-slate-700">
            {log.tower} | {log.floor}
          </p>
        </div>
        <div className="bg-slate-950 px-3 py-2 text-left text-white sm:text-right">
          <p className="text-xs font-bold uppercase text-yellow-300">Quantity</p>
          <p className="text-lg font-black">
            {Number(log.quantity || 0).toFixed(2)} {log.unit}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-black text-slate-950">Engineer:</span>{' '}
          {log.engineerName}
        </p>
        <p>
          <span className="font-black text-slate-950">Agency:</span>{' '}
          {log.subcontractor}
        </p>
      </div>

      {log.remarks && (
        <p className="mt-3 border-l-4 border-yellow-400 bg-white p-3 text-sm font-semibold text-slate-800">
          {log.remarks}
        </p>
      )}

      {log.photoUrl && (
        <img
          src={log.photoUrl}
          alt="DPR progress verification"
          className="mt-3 h-40 w-full border-2 border-slate-300 object-cover"
        />
      )}
    </article>
  );
}

export default App;

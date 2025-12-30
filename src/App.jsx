import { useMemo, useState } from "react";
import "./App.css";

const LB_PER_KG = 2.2046226218;

const DEFAULTS_LB = {
  shield: { label: "Shield (Aspis)", default: 18, min: 12, max: 26 },
  doru: { label: "Spear (Doru)", default: 4.5, min: 2.5, max: 8 },
  helmet: { label: "Helmet", default: 4.5, min: 2, max: 8 },
  linothorax: { label: "Linothorax", default: 8, min: 4, max: 14 },
  bronzeCuirass: { label: "Bronze cuirass", default: 18, min: 10, max: 28 },
  greavesPair: { label: "Greaves (pair)", default: 4, min: 2, max: 8 },
  sidearm: { label: "Sidearm (xiphos/kopis)", default: 2.2, min: 1, max: 4 },
};

const PRESETS = {
  light_demo: {
    name: "Light demo",
    items: {
      shield: { enabled: true, weightLb: 18 },
      doru: { enabled: true, weightLb: 4.5 },
      helmet: { enabled: false, weightLb: 4.5 },
      linothorax: { enabled: false, weightLb: 8 },
      bronzeCuirass: { enabled: false, weightLb: 18 },
      greavesPair: { enabled: false, weightLb: 4 },
      sidearm: { enabled: false, weightLb: 2.2 },
    },
    waterLiters: 0,
  },
  standard_training: {
    name: "Standard training",
    items: {
      shield: { enabled: true, weightLb: 18 },
      doru: { enabled: true, weightLb: 4.5 },
      helmet: { enabled: true, weightLb: 4.5 },
      linothorax: { enabled: false, weightLb: 8 },
      bronzeCuirass: { enabled: false, weightLb: 18 },
      greavesPair: { enabled: false, weightLb: 4 },
      sidearm: { enabled: false, weightLb: 2.2 },
    },
    waterLiters: 1,
  },
  heavy: {
    name: "Heavy",
    items: {
      shield: { enabled: true, weightLb: 18 },
      doru: { enabled: true, weightLb: 4.5 },
      helmet: { enabled: true, weightLb: 4.5 },
      linothorax: { enabled: false, weightLb: 8 },
      bronzeCuirass: { enabled: true, weightLb: 18 },
      greavesPair: { enabled: true, weightLb: 4 },
      sidearm: { enabled: true, weightLb: 2.2 },
    },
    waterLiters: 1.5,
  },
};

function clampNumber(x, min, max) {
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function lbToKg(lb) {
  return lb / LB_PER_KG;
}

function litersToLb(liters) {
  // 1 liter water ≈ 2.2046 lb
  return liters * LB_PER_KG;
}

function loadBand(loadRatioPct) {
  if (!Number.isFinite(loadRatioPct)) return null;
  if (loadRatioPct < 12) return { label: "Light", note: "Demo-friendly." };
  if (loadRatioPct < 18) return { label: "Standard", note: "Training-ready." };
  if (loadRatioPct < 25) return { label: "Heavy", note: "Plan breaks." };
  return { label: "Very heavy", note: "Short sessions + strict breaks." };
}

export default function App() {
  const [bodyWeightLb, setBodyWeightLb] = useState("");
  const [waterLiters, setWaterLiters] = useState(1);

  const [items, setItems] = useState(() => {
    // start from standard training-ish
    return structuredClone(PRESETS.standard_training.items);
  });

  const [customItems, setCustomItems] = useState([
    { id: crypto.randomUUID(), name: "", weightLb: "", enabled: false },
  ]);

  const totals = useMemo(() => {
    const enabledItemEntries = Object.entries(items).filter(
      ([, v]) => v.enabled
    );

    const armorKeys = new Set([
      "helmet",
      "linothorax",
      "bronzeCuirass",
      "greavesPair",
    ]);
    const weaponKeys = new Set(["doru", "sidearm"]);
    const shieldKeys = new Set(["shield"]);

    let armorLb = 0;
    let weaponsLb = 0;
    let shieldLb = 0;

    for (const [k, v] of enabledItemEntries) {
      const w = Number(v.weightLb) || 0;
      if (armorKeys.has(k)) armorLb += w;
      else if (weaponKeys.has(k)) weaponsLb += w;
      else if (shieldKeys.has(k)) shieldLb += w;
    }

    const customLb = customItems.reduce((sum, ci) => {
      if (!ci.enabled) return sum;
      const w = Number(ci.weightLb);
      return sum + (Number.isFinite(w) ? w : 0);
    }, 0);

    const waterLb = litersToLb(Number(waterLiters) || 0);

    const totalLb = armorLb + weaponsLb + shieldLb + waterLb + customLb;

    const bw = Number(bodyWeightLb);
    const ratioPct =
      Number.isFinite(bw) && bw > 0 ? (totalLb / bw) * 100 : NaN;

    return {
      armorLb,
      weaponsLb,
      shieldLb,
      waterLb,
      customLb,
      totalLb,
      ratioPct,
      band: loadBand(ratioPct),
    };
  }, [items, customItems, waterLiters, bodyWeightLb]);

  function applyPreset(presetKey) {
    const p = PRESETS[presetKey];
    setItems(structuredClone(p.items));
    setWaterLiters(p.waterLiters);
  }

  function updateItem(key, patch) {
    setItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function addCustomItem() {
    setCustomItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", weightLb: "", enabled: true },
    ]);
  }

  function updateCustom(id, patch) {
    setCustomItems((prev) =>
      prev.map((ci) => (ci.id === id ? { ...ci, ...patch } : ci))
    );
  }

  function removeCustom(id) {
    setCustomItems((prev) => prev.filter((ci) => ci.id !== id));
  }

  async function copySummary() {
    const lines = [];
    lines.push("Kit Loadout");
    const enabledItemEntries = Object.entries(items).filter(
      ([, v]) => v.enabled
    );

    for (const [k, v] of enabledItemEntries) {
      const meta = DEFAULTS_LB[k];
      lines.push(`${meta?.label ?? k}: ${fmt(Number(v.weightLb), 1)} lb`);
    }

    if ((Number(waterLiters) || 0) > 0) {
      lines.push(`Water: ${fmt(Number(waterLiters), 1)} L (${fmt(totals.waterLb, 1)} lb)`);
    }

    for (const ci of customItems) {
      if (!ci.enabled) continue;
      const w = Number(ci.weightLb);
      if (!Number.isFinite(w)) continue;
      const name = ci.name?.trim() || "Custom item";
      lines.push(`${name}: ${fmt(w, 1)} lb`);
    }

    lines.push(`Total: ${fmt(totals.totalLb, 1)} lb (${fmt(lbToKg(totals.totalLb), 1)} kg)`);
    if (Number.isFinite(totals.ratioPct)) {
      lines.push(`Load ratio: ${fmt(totals.ratioPct, 1)}%`);
      if (totals.band) lines.push(`Band: ${totals.band.label} — ${totals.band.note}`);
    }

    const text = lines.join("\n");
    await navigator.clipboard.writeText(text);
    alert("Copied summary to clipboard.");
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Hoplite Kit Loadout Estimator</h1>
          <p className="sub">
            Personal-only calculator • edit weights to match your real kit • share to Facebook
          </p>
        </div>
      </header>

      <section className="card">
        <h2>Presets</h2>
        <div className="row wrap">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} className="btn" onClick={() => applyPreset(key)}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Profile (optional)</h2>
        <div className="grid2">
          <label className="field">
            <span>Body weight (lb)</span>
            <input
              inputMode="decimal"
              placeholder="e.g. 184"
              value={bodyWeightLb}
              onChange={(e) => setBodyWeightLb(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Water carried (liters)</span>
            <input
              inputMode="decimal"
              value={waterLiters}
              onChange={(e) => setWaterLiters(clampNumber(Number(e.target.value), 0, 10))}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Kit items</h2>

        <div className="items">
          {Object.entries(DEFAULTS_LB).map(([key, meta]) => {
            const v = items[key];
            return (
              <div className="item" key={key}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={v.enabled}
                    onChange={(e) => updateItem(key, { enabled: e.target.checked })}
                  />
                  <span className="title">{meta.label}</span>
                </label>

                <div className="controls">
                  <input
                    inputMode="decimal"
                    disabled={!v.enabled}
                    value={v.weightLb}
                    onChange={(e) =>
                      updateItem(key, {
                        weightLb: clampNumber(Number(e.target.value), meta.min, meta.max),
                      })
                    }
                    aria-label={`${meta.label} weight`}
                  />
                  <span className="unit">lb</span>
                  <button
                    className="btn ghost"
                    disabled={!v.enabled}
                    onClick={() => updateItem(key, { weightLb: meta.default })}
                    title="Reset to default"
                  >
                    Reset
                  </button>
                </div>

                <div className="hint">
                  Typical range: {meta.min}–{meta.max} lb
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Custom items (modern necessities)</h2>
        <div className="items">
          {customItems.map((ci) => (
            <div className="item" key={ci.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={ci.enabled}
                  onChange={(e) => updateCustom(ci.id, { enabled: e.target.checked })}
                />
                <span className="title">Custom</span>
              </label>

              <div className="controls custom">
                <input
                  placeholder="Name (e.g., First aid kit)"
                  value={ci.name}
                  onChange={(e) => updateCustom(ci.id, { name: e.target.value })}
                />
                <input
                  inputMode="decimal"
                  placeholder="Weight"
                  disabled={!ci.enabled}
                  value={ci.weightLb}
                  onChange={(e) => updateCustom(ci.id, { weightLb: e.target.value })}
                />
                <span className="unit">lb</span>
                <button className="btn ghost" onClick={() => removeCustom(ci.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <button className="btn" onClick={addCustomItem}>
            + Add custom item
          </button>
        </div>
      </section>

      <section className="card results">
        <h2>Results</h2>

        <div className="grid2">
          <div className="stat">
            <div className="statLabel">Total</div>
            <div className="statValue">
              {fmt(totals.totalLb, 1)} lb <span className="muted">({fmt(lbToKg(totals.totalLb), 1)} kg)</span>
            </div>
          </div>

          <div className="stat">
            <div className="statLabel">Load ratio</div>
            <div className="statValue">
              {Number.isFinite(totals.ratioPct) ? `${fmt(totals.ratioPct, 1)}%` : "—"}
              {totals.band ? (
                <div className="badge">
                  {totals.band.label}: {totals.band.note}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="breakdown">
          <div><span>Shield</span><span>{fmt(totals.shieldLb, 1)} lb</span></div>
          <div><span>Weapons</span><span>{fmt(totals.weaponsLb, 1)} lb</span></div>
          <div><span>Armor</span><span>{fmt(totals.armorLb, 1)} lb</span></div>
          <div><span>Water</span><span>{fmt(totals.waterLb, 1)} lb</span></div>
          <div><span>Custom</span><span>{fmt(totals.customLb, 1)} lb</span></div>
        </div>

        <div className="row wrap">
          <button className="btn primary" onClick={copySummary}>
            Copy summary for Facebook
          </button>
        </div>
      </section>

      <footer className="footer">
        <p className="muted">
          Tip: enter your *measured* weights for your actual shield/helmet for best results.
        </p>
      </footer>
    </div>
  );
}


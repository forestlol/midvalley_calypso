import { defineStore } from "pinia";

const LS_KEY = "mv_overrides_v1";

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveOverrides(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

export const useSiteStore = defineStore("site", {
  state: () => ({
    loading: false,
    error: null,
    loaded: false,

    raw: null,
    gateways: [],
    meters: [],
    gatewayDaily: [],

    overrides: loadOverrides(),

    gasDailyThresholdByTenant: {
      DEFAULT: 80,
    },
  }),

  getters: {
    meta: (s) => s.raw?.metadata || null,

    tenants(s) {
      const meters = Array.isArray(s.meters) ? s.meters : [];
      const base = new Set(meters.map((m) => m?.tenant).filter(Boolean));

      const o = s.overrides?.tenants || {};
      (o.removed || []).forEach((t) => base.delete(t));
      (o.added || []).forEach((t) => base.add(t));

      return Array.from(base).sort();
    },

    gatewaysResolved(s) {
      const base = Array.isArray(s.gateways) ? [...s.gateways] : [];
      const o = s.overrides?.gateways || {};
      const removed = new Set(o.removed || []);
      const filtered = base.filter(
        (g) => g?.gateway_id && !removed.has(g.gateway_id)
      );
      const added = Array.isArray(o.added) ? o.added : [];
      return [...filtered, ...added].sort((a, b) =>
        String(a.gateway_id).localeCompare(String(b.gateway_id))
      );
    },

    latestGatewayStatus(s) {
      const byId = {};
      const rows = Array.isArray(s.gatewayDaily) ? s.gatewayDaily : [];
      for (const row of rows) {
        if (!row?.gateway_id) continue;
        const cur = byId[row.gateway_id];
        if (!cur || row.date > cur.date) byId[row.gateway_id] = row;
      }
      return byId;
    },

    gasMeters(s) {
      const meters = Array.isArray(s.meters) ? s.meters : [];
      return meters.filter((m) => m?.meter_type === "gas");
    },
  },

  actions: {
    async load() {
      if (this.loaded) return;
      this.loading = true;
      this.error = null;

      try {
        const res = await fetch("/midvalley_meter_gateway_fake_data.json");
        if (!res.ok) throw new Error(`Failed to load dataset: ${res.status}`);
        const json = await res.json();

        this.raw = json;
        this.gateways = Array.isArray(json.gateways) ? json.gateways : [];
        this.meters = Array.isArray(json.meters) ? json.meters : [];
        this.gatewayDaily = Array.isArray(json.gateway_daily)
          ? json.gateway_daily
          : [];

        this.loaded = true;
      } catch (e) {
        this.error = e?.message || String(e);
      } finally {
        this.loading = false;
      }
    },

    // Tenant overrides
    addTenant(name) {
      const t = String(name || "").trim();
      if (!t) return;

      const o = this.overrides || {};
      o.tenants = o.tenants || { added: [], removed: [] };

      o.tenants.removed = (o.tenants.removed || []).filter((x) => x !== t);
      if (!(o.tenants.added || []).includes(t)) o.tenants.added.push(t);

      this.overrides = o;
      saveOverrides(o);
    },

    removeTenant(name) {
      const t = String(name || "").trim();
      if (!t) return;

      const o = this.overrides || {};
      o.tenants = o.tenants || { added: [], removed: [] };

      o.tenants.added = (o.tenants.added || []).filter((x) => x !== t);
      if (!(o.tenants.removed || []).includes(t)) o.tenants.removed.push(t);

      this.overrides = o;
      saveOverrides(o);
    },

    // Gateway overrides
    addGateway(gw) {
      if (!gw?.gateway_id) return;

      const o = this.overrides || {};
      o.gateways = o.gateways || { added: [], removed: [] };

      o.gateways.removed = (o.gateways.removed || []).filter(
        (x) => x !== gw.gateway_id
      );
      o.gateways.added = (o.gateways.added || []).filter(
        (x) => x.gateway_id !== gw.gateway_id
      );
      o.gateways.added.push(gw);

      this.overrides = o;
      saveOverrides(o);
    },

    removeGateway(id) {
      const gwId = String(id || "").trim();
      if (!gwId) return;

      const o = this.overrides || {};
      o.gateways = o.gateways || { added: [], removed: [] };

      o.gateways.added = (o.gateways.added || []).filter(
        (x) => x.gateway_id !== gwId
      );
      if (!(o.gateways.removed || []).includes(gwId))
        o.gateways.removed.push(gwId);

      this.overrides = o;
      saveOverrides(o);
    },
  },
});

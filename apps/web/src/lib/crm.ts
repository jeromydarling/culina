import * as React from 'react';
import { isLive } from './config';
import { persist, dataApi } from './dataApi';

/**
 * CRM layer for the super-admin area: per-customer status, tags, and a
 * human-first activity timeline (notes, calls, emails, meetings).
 *
 * Storage: a small reactive store backed by Cloudflare D1 in LIVE sessions
 * (crm_customer + crm_activity via the generic upsert; see migration 0008),
 * and by localStorage in DEMO sessions. Same public API either way — call
 * initCrm(profileId) once from the CRM page to set the author and load.
 */
export type CrmStatus = 'prospect' | 'active' | 'at_risk' | 'churned';
export type ActivityKind = 'note' | 'call' | 'email' | 'meeting' | 'status';

export interface CrmActivity {
  id: string;
  ts: string;
  kind: ActivityKind;
  body: string;
}

export interface CrmRecord {
  status: CrmStatus | null;
  tags: string[];
  activities: CrmActivity[];
  lastContacted: string | null;
}

export const CRM_STATUS_LABEL: Record<CrmStatus, string> = {
  prospect: 'Prospect',
  active: 'Active',
  at_risk: 'At risk',
  churned: 'Churned',
};

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  status: 'Status change',
};

const KEY = 'culina_crm_v1';
type DB = Record<string, CrmRecord>;

let db: DB = loadLocal();
let authorId: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function loadLocal(): DB {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore quota */
  }
}
const notify = () => listeners.forEach((l) => l());
const rid = () => Math.random().toString(36).slice(2, 10);

/** Call once from the CRM page: sets the activity author and (live) loads from D1. */
export function initCrm(profileId: string) {
  authorId = profileId;
  if (isLive() && !loaded) {
    loaded = true;
    void loadFromApi();
  }
}

async function loadFromApi() {
  try {
    const data = await dataApi.crm();
    const next: DB = {};
    for (const c of data.customers) {
      next[c.id] = { status: c.status ?? null, tags: Array.isArray(c.tags) ? c.tags : [], activities: [], lastContacted: c.last_contacted ?? null };
    }
    for (const a of data.activities) {
      const r = (next[a.kitchen_id] ??= { status: null, tags: [], activities: [], lastContacted: null });
      r.activities.push({ id: a.id, ts: a.created_at, kind: a.kind, body: a.body });
    }
    for (const k of Object.keys(next)) next[k].activities.sort((x, y) => y.ts.localeCompare(x.ts));
    db = next;
    notify();
  } catch {
    /* keep whatever we have (offline / not yet migrated) */
  }
}

// Write-through to D1 (live only). crm_customer holds status/tags/last_contacted.
function syncCustomer(id: string) {
  if (!isLive()) return;
  const r = db[id];
  if (r) persist('crm_customer', { id, status: r.status, tags: r.tags, last_contacted: r.lastContacted, updated_at: new Date().toISOString() });
}
function syncActivity(kitchenId: string, a: CrmActivity) {
  if (!isLive()) return;
  persist('crm_activity', { id: a.id, kitchen_id: kitchenId, author_id: authorId, kind: a.kind, body: a.body, created_at: a.ts });
}

const EMPTY: CrmRecord = { status: null, tags: [], activities: [], lastContacted: null };

export function getCrm(id: string): CrmRecord {
  return db[id] ?? EMPTY;
}

function edit(id: string, fn: (r: CrmRecord) => void) {
  const r: CrmRecord = db[id] ? { ...db[id] } : { status: null, tags: [], activities: [], lastContacted: null };
  fn(r);
  db = { ...db, [id]: r };
  if (!isLive()) saveLocal();
  notify();
}

export function addActivity(id: string, kind: ActivityKind, body: string) {
  const a: CrmActivity = { id: rid(), ts: new Date().toISOString(), kind, body };
  let touched = false;
  edit(id, (r) => {
    r.activities = [a, ...r.activities];
    if (kind === 'call' || kind === 'email' || kind === 'meeting') {
      r.lastContacted = a.ts;
      touched = true;
    }
  });
  syncActivity(id, a);
  if (touched) syncCustomer(id);
}

export function setStatus(id: string, status: CrmStatus) {
  const a: CrmActivity = { id: rid(), ts: new Date().toISOString(), kind: 'status', body: `Status set to ${CRM_STATUS_LABEL[status]}` };
  let changed = false;
  edit(id, (r) => {
    if (r.status !== status) {
      r.status = status;
      r.activities = [a, ...r.activities];
      changed = true;
    }
  });
  if (changed) {
    syncActivity(id, a);
    syncCustomer(id);
  }
}

export function toggleTag(id: string, tag: string) {
  const t = tag.trim();
  if (!t) return;
  edit(id, (r) => {
    r.tags = r.tags.includes(t) ? r.tags.filter((x) => x !== t) : [...r.tags, t];
  });
  syncCustomer(id);
}

/** Reactive read of the whole CRM db (re-renders on any change). */
export function useCrm() {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => db,
  );
}

/* ───────────────────────── US geo helpers (for the map) ───────────────────── */

// Continental-US bounding box used for the equirectangular projection.
const BOUNDS = { minLng: -125, maxLng: -66.5, minLat: 24, maxLat: 49.5 };

/** Project [lat, lng] to fractional [x, y] in 0..1 over the continental US. */
export function project(lat: number, lng: number): { x: number; y: number } {
  const x = (lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng);
  const y = (BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat);
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

/** Rough state centroids so an ungeocoded customer still lands on the map. */
export const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [64.0, -152.0], AZ: [34.3, -111.7], AR: [34.9, -92.4], CA: [37.2, -119.3],
  CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5], FL: [28.6, -82.4], GA: [32.6, -83.4],
  HI: [20.3, -156.4], ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.0, -93.5],
  KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.0, -92.0], ME: [45.4, -69.2], MD: [39.0, -76.8],
  MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3], MS: [32.7, -89.7], MO: [38.4, -92.5],
  MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6], NH: [43.7, -71.6], NJ: [40.2, -74.7],
  NM: [34.4, -106.1], NY: [42.9, -75.5], NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8],
  OK: [35.6, -97.5], OR: [43.9, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.6], SC: [33.9, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7], VT: [44.1, -72.7],
  VA: [37.5, -78.9], WA: [47.4, -120.5], WV: [38.6, -80.6], WI: [44.6, -89.9], WY: [43.0, -107.6],
  DC: [38.9, -77.0],
};

/**
 * Third-party storage / data integrations. OAuth wiring is intentionally a stub
 * for now — Claude for Chrome will provision the real keys later. Connection
 * state is persisted locally so the UI reflects "connected" providers.
 */
export interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  category: 'storage' | 'accounting' | 'import';
  emoji: string;
}

export const PROVIDERS: IntegrationProvider[] = [
  { id: 'google_drive', name: 'Google Drive', description: 'Import documents & spreadsheets; store tenant files.', category: 'storage', emoji: '📁' },
  { id: 'dropbox', name: 'Dropbox', description: 'Import and sync files from your Dropbox.', category: 'storage', emoji: '🗂️' },
  { id: 'r2', name: 'Cloudflare R2', description: 'Built-in object storage for documents & images.', category: 'storage', emoji: '☁️' },
  { id: 'quickbooks', name: 'QuickBooks', description: 'Sync invoices and payments with your books.', category: 'accounting', emoji: '📊' },
  { id: 'food_corridor', name: 'The Food Corridor', description: 'Import your existing tenants, bookings & invoices.', category: 'import', emoji: '🍴' },
];

const KEY = 'culina_integrations';

export function getConnections(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function setConnection(id: string, connected: boolean) {
  const map = getConnections();
  map[id] = connected;
  localStorage.setItem(KEY, JSON.stringify(map));
}

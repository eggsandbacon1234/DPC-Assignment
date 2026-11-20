// Picks the real backend or the in-browser mock based on .env
import * as real from './realApi.js';
import * as mock from './mockApi.js';

export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true';

const api = USE_MOCK ? mock : real;
export default api;

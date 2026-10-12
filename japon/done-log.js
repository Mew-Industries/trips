// Separate, append-only travel history; never modifies destinations.
export const normalizeDoneName = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function parseDoneLog(value) {
  if (!Array.isArray(value)) throw new Error('El log debe ser una lista');
  const dates = new Set();
  return value.map(day => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || dates.has(day.date) || !Array.isArray(day.items)) throw new Error('Día inválido en el log');
    dates.add(day.date);
    day.items.forEach(item => { if (typeof item.text !== 'string' || !item.text.trim()) throw new Error('Entrada vacía'); });
    return day;
  });
}
// Ordered sources: itinerary > Maps saved places > reel places (never tips).
export function donePinPool(destinations, places = [], reels = []) {
  return destinations.flatMap(node => (node.activities || []).map(act => ({act, node})))
    .concat([...places, ...reels].map(place => ({act: {...place, text: place.text || place.name,
      coords: place.coords || (place.lat != null && place.lon != null ? [place.lat, place.lon] : null)}, node: null})));
}
export function matchDoneItem(item, destinations, places = [], reels = []) {
  const pool = donePinPool(destinations, places, reels);
  if (item.activity_id) return pool.find(({act}) => [act.activityId, act.syncId, act.id, act.gpid].includes(item.activity_id)) || null;
  const name = normalizeDoneName(item.match_name || item.text);
  // Each source gets all its aliases before falling through to the next source.
  return pool.find(({act}) => normalizeDoneName(act.text) === name ||
    [...String(act.text).matchAll(/\(([^)]+)\)/g)].some(m => normalizeDoneName(m[1]) === name)) || null;
}
export const doneItemsForDay = (log, date) => (log.find(day => day.date === date) || {items: []}).items;
export function tripDayStatus(day, now = new Date()) {
  const node = (day.here[0] || {}).node || day.sleep || day.wake || {};
  const zone = node.timezone || (node.coords && node.coords[1] < 130 && node.coords[0] > 33 && node.coords[0] < 39 ? 'Asia/Seoul' : 'Asia/Tokyo');
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
  return {past: day.date < today, current: day.date === today};
}

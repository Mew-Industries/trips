const API = 'https://votos.mewis.online';

export function createPlanClient() {
  const token = (new URLSearchParams(location.search).get('plan') || '').trim();
  const days = new Map();
  const listeners = new Set();
  let ready = false;

  const clean = value => Array.isArray(value)
    ? [...new Set(value.filter(key => typeof key === 'string' && key.length <= 220))]
    : [];
  const emit = date => listeners.forEach(fn => fn(date));

  async function load() {
    if (!token) { ready = true; emit(null); return; }
    const res = await fetch(API + '/plan?u=' + encodeURIComponent(token), { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo abrir el plan (' + res.status + ')');
    const data = await res.json();
    Object.entries(data.days || {}).forEach(([date, value]) => days.set(date, clean(value.promoted)));
    ready = true;
    emit(null);
  }

  async function save(date, promoted) {
    if (!token) throw new Error('Abrí el link privado del plan para editar.');
    const next = clean(promoted);
    const before = days.get(date) || [];
    days.set(date, next);
    emit(date);
    try {
      const res = await fetch(API + '/plan', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, date, promoted: next }),
      });
      if (!res.ok) throw new Error('No se pudo guardar (' + res.status + ')');
    } catch (err) {
      days.set(date, before); emit(date); throw err;
    }
  }

  return {
    token, load, save, onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    promoted(date) { return days.get(date) || []; },
    canEdit() { return !!token; }, isReady() { return ready; },
  };
}

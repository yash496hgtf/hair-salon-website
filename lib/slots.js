const OPEN_START_MINUTES = 9 * 60;
const OPEN_END_MINUTES = 19 * 60;
const SLOT_STEP_MINUTES = 30;
const CLOSED_WEEKDAYS = [0, 1]; // Sunday, Monday

function pad(n) {
  return String(n).padStart(2, '0');
}

function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
}

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function minutesToTime(minutes) {
  return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
}

function toEpoch(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm);
}

function normalizeDateStr(value) {
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return iso.split('T')[0];
}

// Finds open, unbooked appointment slots (Tue-Sat, 9am-7pm, 30-min increments)
// closest in time to the originally requested slot, searching outward within
// `windowDays` of it and never earlier than today.
async function findNearestAvailableSlots(sql, targetDateStr, targetTimeStr, { count = 3, windowDays = 14 } = {}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const earliestCandidate = addDaysStr(targetDateStr, -windowDays);
  const earliest = earliestCandidate < todayStr ? todayStr : earliestCandidate;
  const latest = addDaysStr(targetDateStr, windowDays);

  const rows = await sql`
    SELECT appointment_date, appointment_time FROM bookings
    WHERE status = 'confirmed'
      AND appointment_date BETWEEN ${earliest} AND ${latest}
  `;

  const booked = new Set(
    rows.map((r) => normalizeDateStr(r.appointment_date) + ' ' + String(r.appointment_time).slice(0, 5))
  );

  const targetEpoch = toEpoch(targetDateStr, targetTimeStr);
  const candidates = [];

  for (let dateStr = earliest; dateStr <= latest; dateStr = addDaysStr(dateStr, 1)) {
    if (CLOSED_WEEKDAYS.includes(weekdayOf(dateStr))) continue;

    for (let minutes = OPEN_START_MINUTES; minutes <= OPEN_END_MINUTES; minutes += SLOT_STEP_MINUTES) {
      const timeStr = minutesToTime(minutes);
      if (dateStr === targetDateStr && timeStr === targetTimeStr) continue;
      if (booked.has(dateStr + ' ' + timeStr)) continue;

      candidates.push({
        date: dateStr,
        time: timeStr,
        distance: Math.abs(toEpoch(dateStr, timeStr) - targetEpoch),
      });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, count).map(({ date, time }) => ({ date, time }));
}

module.exports = { findNearestAvailableSlots, normalizeDateStr };

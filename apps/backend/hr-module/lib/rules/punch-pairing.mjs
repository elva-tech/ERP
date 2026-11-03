/**
 * Punch pairing (pure). Times are local wall-clock strings "YYYY-MM-DD HH:MM"
 * in the company time zone.
 *
 * Day shifts (and any employee without a cross-midnight shift): punches on the
 * attendance date are used; first = check-in, last = check-out.
 *
 * Night shifts (end time at or before start time) when the approved policy
 * sets a window W (minutes): punches from (date + start - W) up to
 * (date + 1 day + end + W) belong to the shift that starts on the date, so a
 * shift starting at 22:00 and ending at 06:00 next morning is one record on
 * the start date. W must leave a gap between consecutive shifts' windows.
 */

const DAY = 24 * 60;

function toMinutes(local) {
  const [date, time] = local.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d) / 60000 + hh * 60 + mm;
}

function clock(time) {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function isNightShift(shift) {
  return Boolean(shift) && clock(shift.end_time) <= clock(shift.start_time);
}

/** Returns an error message when W would make consecutive night windows overlap. */
export function validateNightWindow(shift, windowMinutes) {
  const span = (clock(shift.end_time) - clock(shift.start_time) + DAY) % DAY || DAY;
  const gap = DAY - span;
  if (2 * windowMinutes >= gap) {
    return `The night-shift punch window (${windowMinutes} min) is too large for shift "${shift.name || shift.id}"; it must be less than ${Math.floor(gap / 2)} minutes.`;
  }
  return null;
}

/**
 * punches: [{ local: "YYYY-MM-DD HH:MM" }] for the employee (any order).
 * Returns { checkIn, checkOut, used, mode } with "HH:MM" values or nulls.
 */
export function pairPunches(date, punches, { shift = null, nightWindowMinutes = null } = {}) {
  const startOfDate = toMinutes(`${date} 00:00`);
  let from;
  let to;
  let mode = "calendar_date";
  if (isNightShift(shift) && nightWindowMinutes !== null && nightWindowMinutes !== undefined) {
    from = startOfDate + clock(shift.start_time) - nightWindowMinutes;
    to = startOfDate + DAY + clock(shift.end_time) + nightWindowMinutes;
    mode = "night_shift_window";
  } else {
    from = startOfDate;
    to = startOfDate + DAY - 1;
  }

  const inWindow = punches
    .map((p) => ({ ...p, minutes: toMinutes(p.local) }))
    .filter((p) => p.minutes >= from && p.minutes <= to)
    .sort((a, b) => a.minutes - b.minutes);

  if (!inWindow.length) return { checkIn: null, checkOut: null, checkInDate: null, checkOutDate: null, used: 0, mode };
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const hasOut = inWindow.length > 1 && last.minutes !== first.minutes;
  return {
    checkIn: first.local.slice(11, 16),
    checkInDate: first.local.slice(0, 10),
    checkOut: hasOut ? last.local.slice(11, 16) : null,
    checkOutDate: hasOut ? last.local.slice(0, 10) : null,
    used: inWindow.length,
    mode,
  };
}

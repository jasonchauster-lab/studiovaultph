/**
 * Timezone utilities for Manila (Asia/Manila, UTC+8).
 *
 * Why manual offset instead of toLocaleString({ timeZone }):
 * Many server runtimes (Vercel, Docker, etc.) are built without full ICU
 * data, so passing `timeZone: 'Asia/Manila'` to toLocaleString silently
 * falls back to UTC, producing wrong times. Manual arithmetic is always safe.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * Returns a Date object that represents the Manila local time.
 * Use ONLY for extracting individual date/time components via
 * getFullYear(), getMonth(), getDate(), getHours(), getMinutes().
 *
 * Do NOT use this Date object for storage or comparison with other Dates.
 */
export function toManilaDate(utcDate: Date | string): Date {
    const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    return new Date(d.getTime() + MANILA_OFFSET_MS);
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a "YYYY-MM-DD" date string into a readable format.
 * Does NOT perform any timezone shifting.
 * Example: "2026-02-28" -> "Feb 28, 2026"
 */
export function formatManilaDateStr(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = MONTH_NAMES[parseInt(parts[1], 10) - 1];
    const day = parseInt(parts[2], 10);
    return `${month} ${day}, ${year}`;
}

/**
 * Formats a UTC date string/Date as a readable date in Manila time.
 * Example: "Feb 28, 2026"
 */
export function formatManilaDate(utcDate: Date | string): string {
    const d = toManilaDate(utcDate);
    const month = MONTH_NAMES[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    return `${month} ${day}, ${year}`;
}

/**
 * Formats a UTC date string/Date as a readable 12-hour time in Manila time.
 * Example: "12:00 PM"
 */
export function formatManilaTime(utcDate: Date | string): string {
    const d = toManilaDate(utcDate);
    let hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minuteStr} ${ampm}`;
}

/**
 * Returns today's date string in YYYY-MM-DD format using Manila time.
 * Robust regardless of server locale/ICU support.
 */
export function getManilaTodayStr(): string {
    const d = toManilaDate(new Date());
    const year = d.getUTCFullYear();
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = d.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * Converts an HH:mm or HH:mm:ss string to a 12-hour AM/PM format.
 * Example: "09:00" -> "9:00 AM", "13:30" -> "1:30 PM"
 */
export function formatTo12Hour(timeStr: string): string {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minuteStr} ${ampm}`;
}

/**
 * Returns a date string in YYYY-MM-DD format for a given date, shifted to Manila.
 */
export function toManilaDateStr(utcDate: Date | string): string {
    const d = toManilaDate(utcDate);
    const year = d.getUTCFullYear();
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = d.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Returns a time string in HH:mm:ss format for a given date, shifted to Manila.
 */
export function toManilaTimeString(utcDate: Date | string): string {
    const d = toManilaDate(utcDate);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    const s = d.getUTCSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

/**
 * Returns an ISO string rounded to the nearest minute, zeroing out seconds and milliseconds.
 * NOTE: Use with caution as we shift towards string-based wall-clock time.
 */
export function roundToISOString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const rounded = new Date(d.getTime());
    rounded.setSeconds(0, 0);
    return rounded.toISOString();
}

/**
 * Normalizes any time string (HH:mm, HH:mm:ss, or 12h AM/PM) to HH:mm:ss (24h).
 */
export function normalizeTimeTo24h(timeStr: string): string {
    if (!timeStr) return '00:00:00';
    const clean = timeStr.trim();

    // Handle AM/PM
    const is12h = /AM|PM/i.test(clean);
    if (is12h) {
        const parts = clean.split(/\s+/);
        const timeParts = parts[0].split(':');
        let hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1] || '00';
        const seconds = timeParts[2] || '00';
        const ampm = parts[1]?.toUpperCase();

        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    }

    // Handle HH:mm or HH:mm:ss
    const parts = clean.split(':');
    const h = parts[0].padStart(2, '0');
    const m = (parts[1] || '00').padStart(2, '0');
    const s = (parts[2] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
}

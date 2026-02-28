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

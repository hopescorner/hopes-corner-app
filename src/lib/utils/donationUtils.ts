import { formatDateForDisplay } from './date';

export const DENSITY_SERVINGS = {
    light: 10,
    medium: 20,
    high: 30,
};

export const MINIMAL_TYPES = new Set(["School Lunch", "Pastries", "Deli Foods"]);
export const DONATION_VALUE_PER_POUND = 1.97;

// Normalize a donation key (item or donor) for counting/grouping: trim,
// collapse internal whitespace, lowercase. "Chicken Breast", "chicken breast "
// and "chicken   breast" all map to "chicken breast" so counts don't fragment.
export const normalizeDonationKey = (value: unknown): string =>
    String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

// Normalize display text (trim + collapse whitespace, preserve case) so
// suggestions use one canonical form per key.
export const normalizeDonationDisplay = (value: unknown): string =>
    String(value ?? '').trim().replace(/\s+/g, ' ');

// Canonical item suggestions: dedupe by normalized key, pick the most recent
// display form, rank by frequency then recency. Powers the item datalist so
// typing "chick" suggests canonical names.
export const getItemSuggestions = (records: any[] = [], limit = 20): string[] => {
    const byKey = new Map<string, { count: number; display: string; lastTime: number }>();
    for (const r of records || []) {
        const raw = String(r?.itemName ?? r?.item_name ?? '');
        const key = normalizeDonationKey(raw);
        if (!key) continue;
        const parsed = new Date(r?.donatedAt || r?.donated_at || r?.createdAt || r?.created_at || 0).getTime();
        const time = Number.isFinite(parsed) ? parsed : 0;
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, { count: 1, display: normalizeDonationDisplay(raw), lastTime: time });
        } else {
            existing.count += 1;
            if (time >= existing.lastTime) {
                existing.lastTime = time;
                existing.display = normalizeDonationDisplay(raw);
            }
        }
    }
    return Array.from(byKey.values())
        .sort((a, b) => b.count - a.count || b.lastTime - a.lastTime || a.display.localeCompare(b.display))
        .slice(0, limit)
        .map((v) => v.display);
};

// Canonical donor suggestions: case/whitespace-insensitive counting (see
// getItemSuggestions). Powers the existing donor datalist.
export const getDonorSuggestions = (records: any[] = [], limit = 10): string[] => {
    const byKey = new Map<string, { count: number; display: string; lastTime: number }>();
    for (const r of records || []) {
        const raw = String(r?.donor ?? '');
        const key = normalizeDonationKey(raw);
        if (!key) continue;
        const parsed = new Date(r?.donatedAt || r?.donated_at || r?.createdAt || r?.created_at || 0).getTime();
        const time = Number.isFinite(parsed) ? parsed : 0;
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, { count: 1, display: normalizeDonationDisplay(raw), lastTime: time });
        } else {
            existing.count += 1;
            if (time >= existing.lastTime) {
                existing.lastTime = time;
                existing.display = normalizeDonationDisplay(raw);
            }
        }
    }
    return Array.from(byKey.values())
        .sort((a, b) => b.count - a.count || b.lastTime - a.lastTime || a.display.localeCompare(b.display))
        .slice(0, limit)
        .map((v) => v.display);
};

const formatLocalDateKey = (date: Date) => {
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const calculateServings = (type: string, weightLbs: any, trays: any = 0, density: any = "medium") => {
    const parsedTrays = Number(trays) || 0;
    if (parsedTrays > 0) {
        const size = density || "medium";
        const perTray = (DENSITY_SERVINGS as any)[size] || DENSITY_SERVINGS.medium;
        return parsedTrays * perTray;
    }

    const weight = Number(weightLbs) || 0;
    if (type === "Carbs") {
        return weight * 4;
    } else if (type === "Protein" || type === "Veggie Protein") {
        return weight * 5;
    }
    return weight;
};

export const getDonationWeightLbs = (record: any) => {
    const weight = Number(record?.weightLbs ?? record?.weight_lbs);
    return Number.isFinite(weight) && weight > 0 ? weight : 0;
};

export const calculateDonationValue = (records: any[] = []) => {
    return records.reduce((sum, record) => sum + getDonationWeightLbs(record) * DONATION_VALUE_PER_POUND, 0);
};

export const calculateDonationLineItemValue = (record: any) => {
    const weight = getDonationWeightLbs(record);
    return weight > 0 ? weight * DONATION_VALUE_PER_POUND : null;
};

export const formatDonationCurrency = (value: number) => {
    const roundedValue = Math.round((value + 1e-9) * 100) / 100;
    return roundedValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const deriveDonationDateKey = (record: any, DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/) => {
    if (!record) return null;
    if (record.dateKey) return record.dateKey;

    // Try to use date property if it matches YYYY-MM-DD
    if (typeof record.date === 'string' && DATE_ONLY_REGEX.test(record.date)) {
        return record.date;
    }

    const candidates = [
        record.date,
        record.donatedAt,
        record.donated_at,
        record.createdAt,
        record.created_at,
        record.receivedAt,
        record.received_at
    ];
    for (const value of candidates) {
        if (!value) continue;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (DATE_ONLY_REGEX.test(trimmed)) {
                return trimmed;
            }
            const parsed = new Date(trimmed);
            const localKey = formatLocalDateKey(parsed);
            if (localKey) return localKey;
        } else if (value instanceof Date) {
            const localKey = formatLocalDateKey(value);
            if (localKey) return localKey;
        } else {
            // timestamp?
            const parsed = new Date(value);
            const localKey = formatLocalDateKey(parsed);
            if (localKey) return localKey;
        }
    }
    return null;
};

export const formatProteinAndCarbsClipboardText = (consolidatedActivity: any[] = []) => {
    const types = ["Protein", "Veggie Protein", "Carbs"];
    const grouped: Record<string, any[]> = {};
    for (const t of types) grouped[t] = [];

    for (const item of consolidatedActivity || []) {
        if (types.includes(item.type)) {
            grouped[item.type].push(item);
        }
    }

    // Sort by servings desc then item name
    for (const t of types) {
        grouped[t].sort((a, b) => (b.servings || 0) - (a.servings || 0) || a.itemName.localeCompare(b.itemName));
    }

    const lines = [];
    lines.push("Donations\n");
    for (const t of types) {
        lines.push(t);
        if (grouped[t].length === 0) {
            lines.push("None");
        } else {
            for (const entry of grouped[t]) {
                const trays = Number(entry.trays || 0);
                const servings = Number(entry.servings || 0);
                const traysText = `${trays} ${trays === 1 ? "tray" : "trays"}`;
                const servingsText = `${servings} ${servings === 1 ? "serving" : "servings"}`;
                lines.push(`${entry.itemName}: ${traysText}, ${servingsText}`);
            }
        }
        lines.push("\n");
    }
    return lines.join("\n");
};

// Shared helpers for the clipboard formatters. Both the plain-text and
// HTML summaries are built from the same grouping so they stay in sync.
const summarizeClipboardTotals = (
    totals?: { totalWeight?: number; totalTrays?: number; totalServings?: number },
): string[] => {
    const parts: string[] = [];
    if (totals?.totalWeight) parts.push(`${Number(totals.totalWeight).toFixed(1)} lbs`);
    if (totals?.totalTrays) {
        const trays = Number(totals.totalTrays);
        parts.push(`${trays} ${trays === 1 ? "tray" : "trays"}`);
    }
    if (totals?.totalServings) parts.push(`~${totals.totalServings} servings`);
    return parts;
};

const groupForClipboard = (records: any[] = []) => {
    const byType = new Map<string, any[]>();
    for (const record of records || []) {
        const type = record?.type || "Other";
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type)!.push(record);
    }
    return Array.from(byType.keys())
        .sort((a, b) => a.localeCompare(b))
        .map((type) => ({
            type,
            entries: [...byType.get(type)!].sort(
                (a, b) => (Number(b.servings) || 0) - (Number(a.servings) || 0)
                    || String(a.itemName || "").localeCompare(String(b.itemName || "")),
            ),
        }));
};

const clipboardDateLine = (dateKey?: string): string | null => {
    if (!dateKey) return null;
    const formatted = formatDateForDisplay(dateKey, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return formatted || null;
};

const clipboardEntryFields = (entry: any) => {
    const trays = Number(entry?.trays || 0);
    const servings = Number(entry?.servings || 0);
    const weight = Number(entry?.weightLbs ?? entry?.weight_lbs ?? 0);
    return { trays, servings, weight: Number.isFinite(weight) ? weight : 0 };
};

/**
 * Full donations summary for copy/share. Unlike
 * formatProteinAndCarbsClipboardText (which intentionally covers only
 * Protein / Veggie Protein / Carbs), this includes every donation type
 * plus day totals so nothing is silently dropped.
 */
export const formatDonationsClipboardText = (
    records: any[] = [],
    totals?: { totalWeight?: number; totalTrays?: number; totalServings?: number; donationValue?: number },
    dateKey?: string,
) => {
    const dateLine = clipboardDateLine(dateKey);
    const lines: string[] = ["Hope's Corner — Food Donations"];
    if (dateLine) lines.push(dateLine);
    lines.push("");

    const totalsParts = summarizeClipboardTotals(totals);
    if (totalsParts.length > 0) {
        lines.push(`Total: ${totalsParts.join(", ")}`);
        lines.push("");
    }

    const groups = groupForClipboard(records);
    if (groups.length === 0) {
        lines.push("None");
        return lines.join("\n");
    }

    for (const { type, entries } of groups) {
        lines.push(type.toUpperCase());
        for (const entry of entries) {
            const { trays, servings, weight } = clipboardEntryFields(entry);
            const traysText = `${trays} ${trays === 1 ? "tray" : "trays"}`;
            const servingsText = `${servings} ${servings === 1 ? "serving" : "servings"}`;
            const weightText = weight > 0 ? `, ${weight.toFixed(1)} lbs` : "";
            const donorText = entry?.donor ? ` (${entry.donor})` : "";
            lines.push(`${entry?.itemName || "Unnamed item"}: ${traysText}, ${servingsText}${weightText}${donorText}`);
        }
        lines.push("");
    }
    return lines.join("\n").trimEnd();
};

const escapeHtml = (value: unknown): string =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

/**
 * HTML version of formatDonationsClipboardText, written to the clipboard as
 * text/html so the summary pastes into email clients (Gmail, Outlook, Apple
 * Mail) with formatting: bold heading, date, totals banner, and one table per
 * donation type. Table-based layout with inline styles only — no stylesheets
 * or external resources — because email clients strip both.
 */
export const formatDonationsClipboardHtml = (
    records: any[] = [],
    totals?: { totalWeight?: number; totalTrays?: number; totalServings?: number; donationValue?: number },
    dateKey?: string,
) => {
    const dateLine = clipboardDateLine(dateKey);
    const totalsParts = summarizeClipboardTotals(totals);
    const groups = groupForClipboard(records);

    const parts: string[] = [];
    parts.push('<div style="font-family:-apple-system,\'Segoe UI\',Roboto,Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.5;max-width:620px;">');
    parts.push('<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#059669;">Hope&#39;s Corner</div>');
    parts.push('<div style="font-size:20px;font-weight:700;color:#111827;margin:2px 0 0;">Food Donations</div>');
    if (dateLine) {
        parts.push(`<div style="color:#6b7280;margin:2px 0 0;">${escapeHtml(dateLine)}</div>`);
    }

    if (totalsParts.length > 0) {
        parts.push(`<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:8px 12px;margin:14px 0 4px;color:#065f46;font-weight:600;"><span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#059669;margin-right:8px;">Total</span>${escapeHtml(totalsParts.join(" · "))}</div>`);
    }

    if (groups.length === 0) {
        parts.push('<div style="margin-top:16px;color:#6b7280;">None</div>');
        parts.push('</div>');
        return parts.join('');
    }

    const headerCell = 'padding:4px 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb;';
    const bodyCell = 'padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;';

    for (const { type, entries } of groups) {
        parts.push(`<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#065f46;border-bottom:2px solid #10b981;padding-bottom:4px;margin:18px 0 6px;">${escapeHtml(type)}</div>`);
        parts.push('<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">');
        parts.push('<thead><tr>');
        parts.push(`<th align="left" style="${headerCell}text-align:left;">Item</th>`);
        parts.push(`<th align="right" style="${headerCell}text-align:right;">Trays</th>`);
        parts.push(`<th align="right" style="${headerCell}text-align:right;">Servings</th>`);
        parts.push(`<th align="right" style="${headerCell}text-align:right;">Weight</th>`);
        parts.push(`<th align="left" style="${headerCell}text-align:left;">Donor</th>`);
        parts.push('</tr></thead>');
        parts.push('<tbody>');
        for (const entry of entries) {
            const { trays, servings, weight } = clipboardEntryFields(entry);
            const donor = entry?.donor ? escapeHtml(entry.donor) : '—';
            const weightText = weight > 0 ? `${weight.toFixed(1)} lbs` : '—';
            parts.push('<tr>');
            parts.push(`<td style="${bodyCell}">${escapeHtml(entry?.itemName || 'Unnamed item')}</td>`);
            parts.push(`<td style="${bodyCell}text-align:right;white-space:nowrap;">${trays}</td>`);
            parts.push(`<td style="${bodyCell}text-align:right;white-space:nowrap;">${servings}</td>`);
            parts.push(`<td style="${bodyCell}text-align:right;white-space:nowrap;">${escapeHtml(weightText)}</td>`);
            parts.push(`<td style="${bodyCell}color:#4b5563;">${donor}</td>`);
            parts.push('</tr>');
        }
        parts.push('</tbody></table>');
    }
    parts.push('</div>');
    return parts.join('');
};

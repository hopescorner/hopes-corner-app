
export const DENSITY_SERVINGS = {
    light: 10,
    medium: 20,
    high: 30,
};

export const MINIMAL_TYPES = new Set(["School Lunch", "Pastries", "Deli Foods"]);
export const DONATION_VALUE_PER_POUND = 1.97;

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

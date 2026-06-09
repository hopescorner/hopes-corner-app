/**
 * Escapes a single CSV cell value.
 * Wraps in double-quotes when the value contains a comma, double-quote, or newline.
 */
export const csvCell = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map((row) =>
            headers
                .map((header) => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string') {
                        // Escape quotes and wrap in quotes if contains comma
                        const escaped = value.replace(/"/g, '""');
                        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
                            return `"${escaped}"`;
                        }
                        return escaped;
                    }
                    return value;
                })
                .join(',')
        ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

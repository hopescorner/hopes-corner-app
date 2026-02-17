'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
    Calendar,
    Download,
    FileText,
    Loader2,
    AlertCircle,
    Users,
    MapPin,
    Home,
    Utensils,
    ShowerHead,
    Shirt,
    Bike,
    Scissors,
    Gift,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { cn } from '@/lib/utils/cn';

// Types
interface MonthOption {
    value: string; // YYYY-MM format
    label: string;
    year: number;
    month: number; // 0-indexed
}

interface ServiceStats {
    totalMeals: number;
    onsiteHotMeals: number;
    bagLunch: number;
    rvSafePark: number;
    dayWorker: number;
    showers: number;
    laundry: number;
    bikeService: number;
    newBicycles: number;
    haircuts: number;
}

interface DemographicBreakdown {
    label: string;
    count: number;
    percentage: number;
}

interface ReportData {
    month: string;
    year: number;
    monthStats: ServiceStats;
    ytdStats: ServiceStats;
    housingBreakdown: DemographicBreakdown[];
    topLocations: DemographicBreakdown[];
    ageBreakdown: DemographicBreakdown[];
    totalActiveGuests: number;
    generatedAt: string;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate last 24 months
const generateMonthOptions = (): MonthOption[] => {
    const options: MonthOption[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    for (let i = 0; i < 24; i++) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const value = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = `${MONTH_NAMES[month]} ${year}`;
        options.push({ value, label, year, month });
    }

    return options;
};

// Format number with commas
const formatNumber = (num: number): string => {
    return num.toLocaleString();
};

// Format percentage
const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
};

export default function MonthlyReportGenerator() {
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stores
    const {
        mealRecords,
        extraMealRecords,
        rvMealRecords,
        dayWorkerMealRecords,
        lunchBagRecords,
        shelterMealRecords,
        unitedEffortMealRecords,
    } = useMealsStore();

    const {
        showerRecords,
        laundryRecords,
        bicycleRecords,
        haircutRecords,
    } = useServicesStore();

    const { guests } = useGuestsStore();

    const monthOptions = useMemo(() => generateMonthOptions(), []);

    // Helper: Check if a date string falls within a date range
    const isDateInRange = useCallback((dateStr: string, startDate: Date, endDate: Date): boolean => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
    }, []);

    // Helper: Get start and end dates for a month
    const getMonthRange = useCallback((year: number, month: number): { start: Date; end: Date } => {
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }, []);

    // Helper: Get YTD range (Jan 1 through end of selected month)
    const getYtdRange = useCallback((year: number, month: number): { start: Date; end: Date } => {
        const start = new Date(year, 0, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }, []);

    // Calculate service statistics for a date range
    const calculateServiceStats = useCallback((startDate: Date, endDate: Date): ServiceStats => {
        // Helper to check if date is in range
        const inRange = (dateStr: string | null | undefined) => {
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return date >= startDate && date <= endDate;
        };

        // Meals - filter by date field and sum counts
        const guestMeals = (mealRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);
        const extraMeals = (extraMealRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);
        const rvMeals = (rvMealRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);
        const dayWorkerMeals = (dayWorkerMealRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);
        const lunchBags = (lunchBagRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);
        const shelterMeals = (shelterMealRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);
        const unitedEffortMeals = (unitedEffortMealRecords || []).filter(r => inRange(r.date)).reduce((sum, r) => sum + (r.count || 0), 0);

        const onsiteHotMeals = guestMeals + extraMeals;
        const totalMeals = onsiteHotMeals + rvMeals + dayWorkerMeals + lunchBags + shelterMeals + unitedEffortMeals;

        // Showers - status = 'done'
        const completedShowers = (showerRecords || [])
            .filter(r => inRange(r.date) && r.status === 'done').length;

        // Laundry - status = 'done', 'picked_up', or 'offsite_picked_up'
        const completedLaundry = (laundryRecords || [])
            .filter(r => inRange(r.date) && ['done', 'picked_up', 'offsite_picked_up'].includes(r.status)).length;

        // Bicycles - status = 'done' or 'in_progress', exclude "New Bicycle" gifts
        const relevantBicycles = (bicycleRecords || [])
            .filter(r => inRange(r.date) && ['done', 'in_progress'].includes(r.status));

        const bikeService = relevantBicycles.filter(r => {
            const types = r.repairTypes || [];
            return !types.includes('New Bicycle');
        }).length;

        const newBicycles = relevantBicycles.filter(r => {
            const types = r.repairTypes || [];
            return types.includes('New Bicycle');
        }).length;

        // Haircuts
        const haircuts = (haircutRecords || []).filter(r => inRange(r.date)).length;

        return {
            totalMeals,
            onsiteHotMeals,
            bagLunch: lunchBags,
            rvSafePark: rvMeals + shelterMeals,
            dayWorker: dayWorkerMeals,
            showers: completedShowers,
            laundry: completedLaundry,
            bikeService,
            newBicycles,
            haircuts,
        };
    }, [
        mealRecords, extraMealRecords, rvMealRecords, dayWorkerMealRecords,
        lunchBagRecords, shelterMealRecords, unitedEffortMealRecords,
        showerRecords, laundryRecords, bicycleRecords, haircutRecords
    ]);

    // Get guests who received meals in a date range
    const getActiveGuestIds = useCallback((startDate: Date, endDate: Date): Set<string> => {
        const guestIds = new Set<string>();

        // Helper to check if date is in range
        const inRange = (dateStr: string | null | undefined) => {
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return date >= startDate && date <= endDate;
        };

        // Only count guests who received meals (per requirements)
        const allMealRecords = [
            ...(mealRecords || []).filter(r => inRange(r.date)),
            ...(extraMealRecords || []).filter(r => inRange(r.date)),
            ...(rvMealRecords || []).filter(r => inRange(r.date)),
            ...(dayWorkerMealRecords || []).filter(r => inRange(r.date)),
            ...(lunchBagRecords || []).filter(r => inRange(r.date)),
            ...(shelterMealRecords || []).filter(r => inRange(r.date)),
            ...(unitedEffortMealRecords || []).filter(r => inRange(r.date)),
        ];

        allMealRecords.forEach(record => {
            if (record.guestId) guestIds.add(record.guestId);
        });

        return guestIds;
    }, [mealRecords, extraMealRecords, rvMealRecords, dayWorkerMealRecords, lunchBagRecords, shelterMealRecords, unitedEffortMealRecords]);

    // Calculate demographics for active guests
    const calculateDemographics = useCallback((activeGuestIds: Set<string>) => {
        const activeGuests = guests.filter(g => activeGuestIds.has(g.id));
        const total = activeGuests.length;

        if (total === 0) {
            return {
                housingBreakdown: [],
                topLocations: [],
                ageBreakdown: [],
            };
        }

        // Housing Status Breakdown
        const housingCounts: Record<string, number> = {
            'Unhoused': 0,
            'Housed': 0,
            'Temp. shelter': 0,
            'RV or vehicle': 0,
        };

        activeGuests.forEach(guest => {
            const status = guest.housingStatus || 'Unhoused';
            if (status in housingCounts) {
                housingCounts[status]++;
            } else {
                housingCounts['Unhoused']++;
            }
        });

        const housingBreakdown: DemographicBreakdown[] = Object.entries(housingCounts)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => ({
                label,
                count,
                percentage: (count / total) * 100,
            }))
            .sort((a, b) => b.count - a.count);

        // Top 5 Locations
        const locationCounts: Record<string, number> = {};
        activeGuests.forEach(guest => {
            const location = guest.location || 'Unknown';
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        });

        const topLocations: DemographicBreakdown[] = Object.entries(locationCounts)
            .map(([label, count]) => ({
                label,
                count,
                percentage: (count / total) * 100,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Age Group Breakdown
        const ageCounts: Record<string, number> = {
            'Adult 18-59': 0,
            'Senior 60+': 0,
            'Child 0-17': 0,
        };

        activeGuests.forEach(guest => {
            const age = guest.age || 'Adult 18-59';
            if (age.includes('Adult')) {
                ageCounts['Adult 18-59']++;
            } else if (age.includes('Senior')) {
                ageCounts['Senior 60+']++;
            } else if (age.includes('Child')) {
                ageCounts['Child 0-17']++;
            } else {
                ageCounts['Adult 18-59']++;
            }
        });

        const ageBreakdown: DemographicBreakdown[] = Object.entries(ageCounts)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => ({
                label,
                count,
                percentage: (count / total) * 100,
            }))
            .sort((a, b) => b.count - a.count);

        return {
            housingBreakdown,
            topLocations,
            ageBreakdown,
        };
    }, [guests]);

    // Generate Report
    const handleGenerateReport = useCallback(async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const selectedOption = monthOptions.find(opt => opt.value === selectedMonth);
            if (!selectedOption) {
                throw new Error('Invalid month selected');
            }

            const { year, month, label } = selectedOption;

            // Calculate date ranges
            const { start: monthStart, end: monthEnd } = getMonthRange(year, month);
            const { start: ytdStart, end: ytdEnd } = getYtdRange(year, month);

            // Calculate stats
            const monthStats = calculateServiceStats(monthStart, monthEnd);
            const ytdStats = calculateServiceStats(ytdStart, ytdEnd);

            // Get active guests (those who received meals in the selected month)
            const activeGuestIds = getActiveGuestIds(monthStart, monthEnd);

            // Calculate demographics
            const { housingBreakdown, topLocations, ageBreakdown } = calculateDemographics(activeGuestIds);

            const reportData: ReportData = {
                month: MONTH_NAMES[month],
                year,
                monthStats,
                ytdStats,
                housingBreakdown,
                topLocations,
                ageBreakdown,
                totalActiveGuests: activeGuestIds.size,
                generatedAt: new Date().toISOString(),
            };

            setReportData(reportData);
            toast.success('Report generated successfully!');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate report';
            setError(message);
            toast.error(message);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedMonth, monthOptions, getMonthRange, getYtdRange, calculateServiceStats, getActiveGuestIds, calculateDemographics]);

    // Handle month change
    const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(e.target.value);
        setReportData(null);
        setError(null);
    }, []);

    // Download PDF
    const handleDownloadPdf = useCallback(async () => {
        if (!reportData) return;

        try {
            // Dynamic import of jspdf to avoid SSR issues
            const { default: jsPDF } = await import('jspdf');

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 18;
            const contentWidth = pageWidth - 2 * margin;
            let yPosition = 0;

            // --- Color constants (matching app UI) ---
            const purple600 = [147, 51, 234] as const;   // #9333EA
            const indigo600 = [79, 70, 229] as const;    // #4F46E5
            const purple50 = [250, 245, 255] as const;   // #FAF5FF
            const indigo50 = [238, 242, 255] as const;   // #EEF2FF
            const blue600 = [37, 99, 235] as const;      // #2563EB
            const cyan600 = [8, 145, 178] as const;      // #0891B2
            const green600 = [22, 163, 74] as const;     // #16A34A
            const pink600 = [219, 39, 119] as const;     // #DB2777
            const orange600 = [234, 88, 12] as const;    // #EA580C
            const gray50 = [249, 250, 251] as const;     // #F9FAFB
            const gray400 = [156, 163, 175] as const;    // #9CA3AF
            const gray600 = [75, 85, 99] as const;       // #4B5563
            const gray900 = [17, 24, 39] as const;       // #111827

            // Helper to draw a filled rounded rectangle
            const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
                doc.roundedRect(x, y, w, h, r, r, 'F');
            };

            // Helper: draw a small colored circle as an icon indicator
            const drawIconDot = (x: number, y: number, color: readonly [number, number, number]) => {
                doc.setFillColor(...color);
                doc.circle(x, y, 1.8, 'F');
            };

            // === HEADER BANNER (purple-to-indigo gradient simulated) ===
            // Gradient simulation: left half purple, right half indigo, blended
            doc.setFillColor(...purple600);
            doc.rect(margin, margin, contentWidth / 2, 24, 'F');
            doc.setFillColor(...indigo600);
            doc.rect(margin + contentWidth / 2, margin, contentWidth / 2, 24, 'F');
            // Round the corners by overlaying rounded rect (same color blended)
            doc.setFillColor(113, 60, 232); // midpoint blend
            drawRoundedRect(margin, margin, contentWidth, 24, 4);

            // Header text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text("Hope's Corner Report", margin + 8, margin + 10);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(220, 210, 255);
            doc.text(`${reportData.month} ${reportData.year}`, margin + 8, margin + 18);

            yPosition = margin + 32;

            // === SERVICE STATISTICS SECTION ===
            // Section header with icon dot
            doc.setTextColor(...purple600);
            drawIconDot(margin + 2, yPosition - 1.2, purple600);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...gray900);
            doc.text('Service Statistics', margin + 7, yPosition);
            yPosition += 8;

            // Table column positions
            const serviceColX = margin;
            const monthColX = margin + contentWidth * 0.55;
            const ytdColX = margin + contentWidth * 0.78;
            const monthColW = contentWidth * 0.22;
            const ytdColW = contentWidth * 0.22;
            const rowH = 7;

            // Table header row
            doc.setFillColor(245, 245, 250);
            doc.rect(margin, yPosition - 4, contentWidth, rowH, 'F');
            doc.setFillColor(...purple50);
            doc.rect(monthColX, yPosition - 4, monthColW, rowH, 'F');
            doc.setFillColor(...indigo50);
            doc.rect(ytdColX, yPosition - 4, ytdColW, rowH, 'F');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...gray600);
            doc.text('Service', serviceColX + 2, yPosition);
            doc.text('Month', monthColX + monthColW - 2, yPosition, { align: 'right' });
            doc.text('YTD', ytdColX + ytdColW - 2, yPosition, { align: 'right' });
            yPosition += rowH;

            // Draw line under header
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.line(margin, yPosition - 3, margin + contentWidth, yPosition - 3);

            // Service stat rows with icons and colors
            interface ServiceRow {
                label: string;
                month: number;
                ytd: number;
                bold: boolean;
                indent?: boolean;
                iconColor?: readonly [number, number, number];
            }

            const statsRows: ServiceRow[] = [
                { label: 'Total Meals', month: reportData.monthStats.totalMeals, ytd: reportData.ytdStats.totalMeals, bold: true, iconColor: purple600 },
                { label: 'On-Site Hot Meals', month: reportData.monthStats.onsiteHotMeals, ytd: reportData.ytdStats.onsiteHotMeals, bold: false, indent: true },
                { label: 'Bag Lunch', month: reportData.monthStats.bagLunch, ytd: reportData.ytdStats.bagLunch, bold: false, indent: true },
                { label: 'RV / Safe Park', month: reportData.monthStats.rvSafePark, ytd: reportData.ytdStats.rvSafePark, bold: false, indent: true },
                { label: 'Day Worker', month: reportData.monthStats.dayWorker, ytd: reportData.ytdStats.dayWorker, bold: false, indent: true },
                { label: 'Showers', month: reportData.monthStats.showers, ytd: reportData.ytdStats.showers, bold: true, iconColor: blue600 },
                { label: 'Laundry', month: reportData.monthStats.laundry, ytd: reportData.ytdStats.laundry, bold: true, iconColor: cyan600 },
                { label: 'Bike Service', month: reportData.monthStats.bikeService, ytd: reportData.ytdStats.bikeService, bold: true, iconColor: green600 },
                { label: 'New Bicycles', month: reportData.monthStats.newBicycles, ytd: reportData.ytdStats.newBicycles, bold: true, iconColor: pink600 },
                { label: 'Haircuts', month: reportData.monthStats.haircuts, ytd: reportData.ytdStats.haircuts, bold: true, iconColor: orange600 },
            ];

            statsRows.forEach((row, idx) => {
                const rowY = yPosition - 4;

                // Alternating subtle background for bold (main) rows
                if (row.bold && row.label === 'Total Meals') {
                    doc.setFillColor(250, 245, 255); // purple-50/50
                    doc.rect(margin, rowY, contentWidth, rowH, 'F');
                }

                // Month and YTD column backgrounds
                if (row.bold) {
                    doc.setFillColor(...purple50);
                    doc.rect(monthColX, rowY, monthColW, rowH, 'F');
                    doc.setFillColor(...indigo50);
                    doc.rect(ytdColX, rowY, ytdColW, rowH, 'F');
                } else {
                    doc.setFillColor(250, 245, 255, 0.3);
                    doc.rect(monthColX, rowY, monthColW, rowH, 'F');
                    doc.setFillColor(238, 242, 255, 0.3);
                    doc.rect(ytdColX, rowY, ytdColW, rowH, 'F');
                }

                // Icon dot for main service rows
                const textX = row.indent ? serviceColX + 12 : serviceColX + 2;
                if (row.iconColor && row.bold) {
                    drawIconDot(serviceColX + 4, yPosition - 1.2, row.iconColor);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...gray900);
                    doc.text(row.label, serviceColX + 9, yPosition);
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...gray600);
                    doc.text(row.label, textX, yPosition);
                }

                // Month value
                doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
                doc.setTextColor(...gray900);
                doc.text(formatNumber(row.month), monthColX + monthColW - 2, yPosition, { align: 'right' });

                // YTD value
                doc.text(formatNumber(row.ytd), ytdColX + ytdColW - 2, yPosition, { align: 'right' });

                // Bottom border
                if (idx < statsRows.length - 1) {
                    doc.setDrawColor(243, 244, 246);
                    doc.setLineWidth(0.2);
                    doc.line(margin, rowY + rowH, margin + contentWidth, rowY + rowH);
                }

                yPosition += rowH;
            });

            yPosition += 10;

            // === GUEST DEMOGRAPHICS SECTION ===
            drawIconDot(margin + 2, yPosition - 1.2, purple600);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...gray900);
            doc.text('Guest Demographics', margin + 7, yPosition);
            yPosition += 5;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...gray400);
            doc.text(`Based on ${formatNumber(reportData.totalActiveGuests)} guests who received meals in ${reportData.month}`, margin + 7, yPosition);
            yPosition += 8;

            // Demographics columns layout (3 columns side-by-side)
            const colW = (contentWidth - 8) / 3;
            const colGap = 4;
            const colPadding = 4;
            const demographics = [
                {
                    title: 'Housing Status',
                    iconColor: purple600,
                    items: reportData.housingBreakdown,
                },
                {
                    title: 'Top 5 Locations',
                    iconColor: purple600,
                    items: reportData.topLocations.map((item, idx) => ({ ...item, label: `${idx + 1}. ${item.label}` })),
                },
                {
                    title: 'Age Groups',
                    iconColor: purple600,
                    items: reportData.ageBreakdown,
                },
            ];

            const demoStartY = yPosition;

            demographics.forEach((section, colIdx) => {
                const colX = margin + colIdx * (colW + colGap);
                let localY = demoStartY;

                // Background card
                doc.setFillColor(...gray50);
                const cardH = 8 + (section.items.length > 0 ? section.items.length * 5.5 + 2 : 6);
                drawRoundedRect(colX, localY - 3, colW, cardH, 3);

                // Section title with icon dot
                drawIconDot(colX + colPadding, localY - 0.5, section.iconColor);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...gray900);
                doc.text(section.title, colX + colPadding + 5, localY + 1);
                localY += 7;

                // Items
                if (section.items.length > 0) {
                    doc.setFontSize(8.5);
                    section.items.forEach(item => {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(...gray600);
                        const label = item.label.length > 20 ? item.label.substring(0, 18) + '…' : item.label;
                        doc.text(label, colX + colPadding + 1, localY);

                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...gray900);
                        const valueText = `${formatNumber(item.count)}`;
                        doc.text(valueText, colX + colW - colPadding - 14, localY, { align: 'right' });

                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(...gray400);
                        doc.text(`(${formatPercentage(item.percentage)})`, colX + colW - colPadding - 1, localY, { align: 'right' });

                        localY += 5.5;
                    });
                } else {
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...gray400);
                    doc.text('No data available', colX + colPadding + 1, localY);
                }
            });

            // Footer
            const footerY = pageHeight - 12;
            doc.setDrawColor(243, 244, 246);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...gray400);
            const generatedDate = new Date(reportData.generatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            const endDay = new Date(reportData.year, MONTH_NAMES.indexOf(reportData.month) + 1, 0).getDate();
            doc.text(
                `Report generated on ${generatedDate}  •  Data range: January 1, ${reportData.year} – ${reportData.month} ${endDay}, ${reportData.year}`,
                pageWidth / 2,
                footerY,
                { align: 'center' }
            );

            // Save PDF
            const filename = `hopes-corner-report-${reportData.year}-${String(monthOptions.find(opt => opt.label === `${reportData.month} ${reportData.year}`)?.month ?? 0 + 1).padStart(2, '0')}.pdf`;
            doc.save(filename);

            toast.success('PDF downloaded successfully!');
        } catch (err) {
            console.error('PDF generation error:', err);
            toast.error('Failed to generate PDF');
        }
    }, [reportData, monthOptions]);

    return (
        <div className="space-y-8">
            {/* Generator Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Monthly Report Generator</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Generate comprehensive service and demographic reports</p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        {/* Month Selector */}
                        <div className="flex-1 w-full sm:max-w-xs">
                            <label htmlFor="month-select" className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Month
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    id="month-select"
                                    value={selectedMonth}
                                    onChange={handleMonthChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                >
                                    {monthOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={isGenerating}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all",
                                isGenerating
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300"
                            )}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText size={18} />
                                    Generate Report
                                </>
                            )}
                        </button>
                    </div>

                    {/* Empty State */}
                    {!reportData && !error && !isGenerating && (
                        <div className="mt-8 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-500 font-medium">Select a month and click Generate Report</p>
                            <p className="text-gray-400 text-sm mt-1">Reports include service statistics and guest demographics</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-semibold text-red-800">Error generating report</p>
                                <p className="text-red-600 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Preview */}
            {reportData && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Report Header */}
                    <div className="px-8 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
                        <div className="text-white">
                            <h2 className="text-2xl font-bold">Hope&apos;s Corner Report</h2>
                            <p className="text-purple-100 mt-1">{reportData.month} {reportData.year}</p>
                        </div>
                        <button
                            onClick={handleDownloadPdf}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-semibold transition-all"
                        >
                            <Download size={18} />
                            Download PDF
                        </button>
                    </div>

                    {/* Service Statistics */}
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Utensils className="text-purple-600" size={20} />
                            Service Statistics
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Service</th>
                                        <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 bg-purple-50">Month</th>
                                        <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 bg-indigo-50">YTD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-purple-50/50 border-b border-gray-100">
                                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                                            <Utensils size={16} className="text-purple-600" />
                                            Total Meals
                                        </td>
                                        <td className="text-right py-3 px-4 font-bold text-gray-900 bg-purple-50">{formatNumber(reportData.monthStats.totalMeals)}</td>
                                        <td className="text-right py-3 px-4 font-bold text-gray-900 bg-indigo-50">{formatNumber(reportData.ytdStats.totalMeals)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-2.5 px-4 pl-10 text-gray-600">On-Site Hot Meals</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-purple-50/30">{formatNumber(reportData.monthStats.onsiteHotMeals)}</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-indigo-50/30">{formatNumber(reportData.ytdStats.onsiteHotMeals)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-2.5 px-4 pl-10 text-gray-600">Bag Lunch</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-purple-50/30">{formatNumber(reportData.monthStats.bagLunch)}</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-indigo-50/30">{formatNumber(reportData.ytdStats.bagLunch)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-2.5 px-4 pl-10 text-gray-600">RV / Safe Park</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-purple-50/30">{formatNumber(reportData.monthStats.rvSafePark)}</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-indigo-50/30">{formatNumber(reportData.ytdStats.rvSafePark)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2.5 px-4 pl-10 text-gray-600">Day Worker</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-purple-50/30">{formatNumber(reportData.monthStats.dayWorker)}</td>
                                        <td className="text-right py-2.5 px-4 text-gray-700 bg-indigo-50/30">{formatNumber(reportData.ytdStats.dayWorker)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                            <ShowerHead size={16} className="text-blue-600" />
                                            Showers
                                        </td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-purple-50">{formatNumber(reportData.monthStats.showers)}</td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-indigo-50">{formatNumber(reportData.ytdStats.showers)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                            <Shirt size={16} className="text-cyan-600" />
                                            Laundry
                                        </td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-purple-50">{formatNumber(reportData.monthStats.laundry)}</td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-indigo-50">{formatNumber(reportData.ytdStats.laundry)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                            <Bike size={16} className="text-green-600" />
                                            Bike Service
                                        </td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-purple-50">{formatNumber(reportData.monthStats.bikeService)}</td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-indigo-50">{formatNumber(reportData.ytdStats.bikeService)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                            <Gift size={16} className="text-pink-600" />
                                            New Bicycles
                                        </td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-purple-50">{formatNumber(reportData.monthStats.newBicycles)}</td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-indigo-50">{formatNumber(reportData.ytdStats.newBicycles)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                            <Scissors size={16} className="text-orange-600" />
                                            Haircuts
                                        </td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-purple-50">{formatNumber(reportData.monthStats.haircuts)}</td>
                                        <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-indigo-50">{formatNumber(reportData.ytdStats.haircuts)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Demographics */}
                    <div className="p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Users className="text-purple-600" size={20} />
                            Guest Demographics
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Based on <span className="font-semibold text-gray-700">{formatNumber(reportData.totalActiveGuests)}</span> guests who received meals in {reportData.month}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Housing Status */}
                            <div className="bg-gray-50 rounded-xl p-5">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Home size={16} className="text-purple-600" />
                                    Housing Status
                                </h4>
                                <div className="space-y-3">
                                    {reportData.housingBreakdown.length > 0 ? (
                                        reportData.housingBreakdown.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-gray-600 text-sm">{item.label}</span>
                                                <div className="text-right">
                                                    <span className="font-semibold text-gray-900">{formatNumber(item.count)}</span>
                                                    <span className="text-gray-400 text-xs ml-1">({formatPercentage(item.percentage)})</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-sm">No data available</p>
                                    )}
                                </div>
                            </div>

                            {/* Top Locations */}
                            <div className="bg-gray-50 rounded-xl p-5">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin size={16} className="text-purple-600" />
                                    Top 5 Locations
                                </h4>
                                <div className="space-y-3">
                                    {reportData.topLocations.length > 0 ? (
                                        reportData.topLocations.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-gray-600 text-sm truncate pr-2">{idx + 1}. {item.label}</span>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="font-semibold text-gray-900">{formatNumber(item.count)}</span>
                                                    <span className="text-gray-400 text-xs ml-1">({formatPercentage(item.percentage)})</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-sm">No data available</p>
                                    )}
                                </div>
                            </div>

                            {/* Age Groups */}
                            <div className="bg-gray-50 rounded-xl p-5">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users size={16} className="text-purple-600" />
                                    Age Groups
                                </h4>
                                <div className="space-y-3">
                                    {reportData.ageBreakdown.length > 0 ? (
                                        reportData.ageBreakdown.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-gray-600 text-sm">{item.label}</span>
                                                <div className="text-right">
                                                    <span className="font-semibold text-gray-900">{formatNumber(item.count)}</span>
                                                    <span className="text-gray-400 text-xs ml-1">({formatPercentage(item.percentage)})</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-sm">No data available</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Report Footer */}
                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">
                            Report generated on {new Date(reportData.generatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                            {' • '}Data range: January 1, {reportData.year} – {reportData.month} {new Date(reportData.year, MONTH_NAMES.indexOf(reportData.month) + 1, 0).getDate()}, {reportData.year}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

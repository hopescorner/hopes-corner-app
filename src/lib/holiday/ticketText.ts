import type { HolidayLanguage } from '@/types/holiday';
import { HOLIDAY_EVENT_YEAR } from './constants';

export interface HolidayTicketText {
    brand: string;
    title: string;
    ticketNumberLabel: string;
    checkInInstruction: string;
    parentLabel: string;
    phoneLabel: string;
    cityLabel: string;
    childrenLabel: string;
    locationLabel: string;
    arrivalNote: string;
    shareTitle: string;
    shareText: string;
}

/**
 * Ticket wording follows the language the family used on the registration form,
 * so a Spanish registration never produces an English ticket.
 */
export const HOLIDAY_TICKET_TEXT: Record<HolidayLanguage, HolidayTicketText> = {
    en: {
        brand: "HOPE'S CORNER • HOLIDAY TOY & GIFT PROGRAM {year}",
        title: 'Official Event Guest Ticket',
        ticketNumberLabel: 'YOUR TICKET NUMBER',
        checkInInstruction: 'SHOW THIS QR CODE AT CHECK-IN',
        parentLabel: 'Parent',
        phoneLabel: 'Phone',
        cityLabel: 'City',
        childrenLabel: 'Children: {count} Registered',
        locationLabel: "Event Location: Hope's Corner • 748 Mercy St, Mountain View, CA",
        arrivalNote: 'Please arrive 10 minutes before your assigned time slot with this ticket.',
        shareTitle: "Hope's Corner Ticket #{ticketNumber}",
        shareText: "Ticket #{ticketNumber} for Hope's Corner Holiday Gift Program",
    },
    es: {
        brand: `HOPE'S CORNER • PROGRAMA NAVIDEÑO DE JUGUETES Y REGALOS ${HOLIDAY_EVENT_YEAR}`,
        title: 'Boleto Oficial del Evento',
        ticketNumberLabel: 'SU NÚMERO DE BOLETO',
        checkInInstruction: 'MUESTRE ESTE CÓDIGO QR AL REGISTRARSE',
        parentLabel: 'Padre/Tutor',
        phoneLabel: 'Teléfono',
        cityLabel: 'Ciudad',
        childrenLabel: 'Niños: {count} registrados',
        locationLabel: "Ubicación: Hope's Corner • 748 Mercy St, Mountain View, CA",
        arrivalNote: 'Llegue 10 minutos antes de su horario asignado con este boleto.',
        shareTitle: "Boleto de Hope's Corner #{ticketNumber}",
        shareText: "Boleto #{ticketNumber} para el Programa Navideño de Regalos de Hope's Corner",
    },
    zh: {
        brand: `HOPE'S CORNER • ${HOLIDAY_EVENT_YEAR}年度节日玩具与礼物项目`,
        title: '官方活动入场凭证',
        ticketNumberLabel: '您的票号',
        checkInInstruction: '签到时请出示此二维码',
        parentLabel: '家长',
        phoneLabel: '电话',
        cityLabel: '城市',
        childrenLabel: '儿童：已登记 {count} 名',
        locationLabel: "活动地点：Hope's Corner • 748 Mercy St, Mountain View, CA",
        arrivalNote: '请于指定时间段前10分钟携此凭证到达。',
        shareTitle: "Hope's Corner 票号 #{ticketNumber}",
        shareText: "Hope's Corner 节日礼物项目票号 #{ticketNumber}",
    },
};

export function getHolidayTicketText(language?: HolidayLanguage | null): HolidayTicketText {
    return (language && HOLIDAY_TICKET_TEXT[language]) || HOLIDAY_TICKET_TEXT.en;
}

export function formatHolidayTicketString(
    template: string,
    values: Record<string, string | number>
): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        values[key] !== undefined ? String(values[key]) : match
    );
}

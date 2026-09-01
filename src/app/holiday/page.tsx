import { Metadata } from 'next';
import HolidayRegistrationClient from './HolidayRegistrationClient';
import { HOLIDAY_EVENT_YEAR } from '@/lib/holiday/constants';

export const metadata: Metadata = {
    title: "Holiday Toy Distribution Registration | Hope's Corner",
    description: `Online registration for Hope's Corner ${HOLIDAY_EVENT_YEAR} Holiday Toy and Gift Distribution Program.`,
};

export default function HolidayRegistrationPage() {
    return <HolidayRegistrationClient />;
}

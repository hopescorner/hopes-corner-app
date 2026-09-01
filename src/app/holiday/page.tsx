import { Metadata } from 'next';
import HolidayRegistrationClient from './HolidayRegistrationClient';

export const metadata: Metadata = {
    title: "Holiday Toy Distribution Registration | Hope's Corner",
    description: "Online registration for Hope's Corner 2026 Holiday Toy and Gift Distribution Program.",
};

export default function HolidayRegistrationPage() {
    return <HolidayRegistrationClient />;
}

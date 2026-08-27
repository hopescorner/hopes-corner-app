export default function CheckInLoading() {
    return (
        <main className="mx-auto max-w-5xl px-4 py-8" aria-busy="true" aria-label="Loading check-in">
            <div className="h-12 w-64 animate-pulse rounded-xl bg-gray-100" />
            <div className="mt-6 h-16 animate-pulse rounded-2xl bg-gray-100" />
        </main>
    );
}

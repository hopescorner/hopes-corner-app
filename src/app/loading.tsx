export default function RootLoading() {
    return (
        <main
            className="min-h-screen bg-neutral-50 px-4 py-12 flex items-center justify-center"
            aria-busy="true"
            aria-label="Loading"
        >
            <div className="w-full max-w-md space-y-4">
                <div className="mx-auto h-8 w-48 animate-pulse rounded-lg bg-neutral-200" />
                <div className="h-32 animate-pulse rounded-2xl bg-neutral-200" />
            </div>
        </main>
    );
}

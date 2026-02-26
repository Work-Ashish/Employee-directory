export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div
                        className="absolute inset-0 rounded-full border-4 border-[var(--border)]"
                    />
                    <div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--blue)] animate-spin"
                    />
                </div>
                <p className="text-sm text-[var(--text3)] font-medium">
                    Loading...
                </p>
            </div>
        </div>
    )
}

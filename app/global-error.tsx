"use client"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body>
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "Outfit, system-ui, sans-serif",
                        background: "#0a0a0a",
                        color: "#fafafa",
                        padding: "2rem",
                    }}
                >
                    <div style={{ textAlign: "center", maxWidth: "480px" }}>
                        <div
                            style={{
                                fontSize: "4rem",
                                marginBottom: "1rem",
                            }}
                        >
                            ⚠️
                        </div>
                        <h1
                            style={{
                                fontSize: "1.75rem",
                                fontWeight: 700,
                                marginBottom: "0.75rem",
                            }}
                        >
                            Something went wrong
                        </h1>
                        <p
                            style={{
                                fontSize: "0.95rem",
                                color: "#a1a1aa",
                                marginBottom: "1.5rem",
                                lineHeight: 1.6,
                            }}
                        >
                            The application encountered an unexpected error. Our
                            team has been notified. Please try again.
                        </p>
                        <button
                            onClick={() => reset()}
                            style={{
                                background: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                padding: "0.75rem 2rem",
                                borderRadius: "8px",
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "background 0.2s",
                            }}
                            onMouseOver={(e) =>
                            ((e.target as HTMLElement).style.background =
                                "#2563eb")
                            }
                            onMouseOut={(e) =>
                            ((e.target as HTMLElement).style.background =
                                "#3b82f6")
                            }
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}

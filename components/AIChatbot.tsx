"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

export function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hey there! 👋 I'm your EMS Pro Assistant. Ask me anything about HR, your leave balance, attendance, payroll, or how to use any feature!",
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    useEffect(() => {
        if (isOpen) {
            const timeoutId = setTimeout(() => inputRef.current?.focus(), 200)
            return () => clearTimeout(timeoutId)
        }
    }, [isOpen])

    const sendMessage = async () => {
        const trimmed = input.trim()
        if (!trimmed || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: trimmed,
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            // Build conversation history for API
            const apiMessages = [...messages.filter((m) => m.id !== "welcome"), userMessage].map(
                (m) => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: m.content,
                })
            )

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages }),
            })
            if (!res.ok) {
                throw new Error(`Chat API error: ${res.status}`)
            }
            const data = await res.json()

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.reply || "Sorry, I couldn't process that.",
            }

            setMessages((prev) => [...prev, assistantMessage])
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Network error. Please check your connection and try again.",
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: "fixed",
                    bottom: 80,
                    right: 24,
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(0, 122, 255, 0.4)",
                    zIndex: 9999,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isOpen ? "rotate(90deg) scale(0.9)" : "scale(1)",
                }}
                aria-label={isOpen ? "Close chat" : "Open AI assistant"}
                title="EMS Pro AI Assistant"
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 148,
                        right: 24,
                        width: 400,
                        maxWidth: "calc(100vw - 48px)",
                        height: 520,
                        maxHeight: "calc(100vh - 140px)",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        zIndex: 9998,
                        animation: "chatSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: "16px 20px",
                            background: "var(--accent)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                            }}
                        >
                            🤖
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font)" }}>EMS Pro Assistant</div>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>Powered by Gemini AI</div>
                        </div>
                        <button
                            onClick={() => setMessages([{ id: "welcome", role: "assistant", content: "Chat cleared. How can I help you now? 👋" }])}
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                border: "none",
                                color: "white",
                                fontSize: "11px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "16px 16px 8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                        className="scrollbar-hide"
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: "flex",
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                    animation: "chatFadeIn 0.3s ease-out",
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "82%",
                                        padding: "10px 14px",
                                        borderRadius:
                                            msg.role === "user"
                                                ? "16px 16px 4px 16px"
                                                : "16px 16px 16px 4px",
                                        background:
                                            msg.role === "user"
                                                ? "var(--accent)"
                                                : "var(--bg)",
                                        color:
                                            msg.role === "user" ? "#fff" : "var(--text)",
                                        fontSize: 13.5,
                                        lineHeight: 1.5,
                                        fontFamily: "var(--font)",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isLoading && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div
                                    style={{
                                        padding: "12px 18px",
                                        borderRadius: "16px 16px 16px 4px",
                                        background: "var(--bg)",
                                        display: "flex",
                                        gap: 5,
                                        alignItems: "center",
                                    }}
                                >
                                    <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                                    <span className="typing-dot" style={{ animationDelay: "150ms" }} />
                                    <span className="typing-dot" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div
                        style={{
                            padding: "12px 16px",
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            background: "var(--surface)",
                        }}
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything..."
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                borderRadius: 12,
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                color: "var(--text)",
                                fontSize: 13.5,
                                fontFamily: "var(--font)",
                                outline: "none",
                                transition: "border-color 0.2s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background:
                                    input.trim() && !isLoading
                                        ? "var(--accent)"
                                        : "var(--bg2)",
                                color:
                                    input.trim() && !isLoading
                                        ? "#fff"
                                        : "var(--text4)",
                                border: "none",
                                cursor:
                                    input.trim() && !isLoading
                                        ? "pointer"
                                        : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                                flexShrink: 0,
                            }}
                            aria-label="Send message"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Inline keyframe styles */}
            <style jsx global>{`
                @keyframes chatSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(16px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes chatFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(6px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .typing-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: var(--text3);
                    animation: typingBounce 1.2s infinite;
                }
                @keyframes typingBounce {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.4;
                    }
                    30% {
                        transform: translateY(-6px);
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    )
}

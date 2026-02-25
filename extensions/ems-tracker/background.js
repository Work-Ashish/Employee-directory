/* ═══════════════════════════════════════════════
   EMS Pro Activity Tracker — Background Service Worker
   ═══════════════════════════════════════════════ */

// ─── Config ───
const API_BASE = "http://localhost:3000"
const SEND_INTERVAL = 30_000  // 30 seconds
const IDLE_THRESHOLD = 300    // 5 minutes in seconds

// ─── Domain → Category mapping ───
const DOMAIN_CATEGORIES = {
    // Productivity
    "github.com": "PRODUCTIVITY",
    "gitlab.com": "PRODUCTIVITY",
    "bitbucket.org": "PRODUCTIVITY",
    "stackoverflow.com": "PRODUCTIVITY",
    "docs.google.com": "PRODUCTIVITY",
    "notion.so": "PRODUCTIVITY",
    "jira.atlassian.com": "PRODUCTIVITY",
    "trello.com": "PRODUCTIVITY",
    "linear.app": "PRODUCTIVITY",
    "vercel.com": "PRODUCTIVITY",
    "npmjs.com": "PRODUCTIVITY",
    "localhost": "PRODUCTIVITY",

    // Communication
    "gmail.com": "COMMUNICATION",
    "mail.google.com": "COMMUNICATION",
    "outlook.office.com": "COMMUNICATION",
    "slack.com": "COMMUNICATION",
    "teams.microsoft.com": "COMMUNICATION",
    "discord.com": "COMMUNICATION",
    "zoom.us": "COMMUNICATION",
    "meet.google.com": "COMMUNICATION",

    // Design
    "figma.com": "DESIGN",
    "canva.com": "DESIGN",
    "dribbble.com": "DESIGN",
    "behance.net": "DESIGN",

    // Research
    "google.com": "RESEARCH",
    "medium.com": "RESEARCH",
    "dev.to": "RESEARCH",
    "wikipedia.org": "RESEARCH",
    "chatgpt.com": "RESEARCH",

    // Entertainment
    "youtube.com": "ENTERTAINMENT",
    "netflix.com": "ENTERTAINMENT",
    "twitch.tv": "ENTERTAINMENT",
    "reddit.com": "ENTERTAINMENT",
    "9gag.com": "ENTERTAINMENT",

    // Social Media
    "facebook.com": "SOCIAL_MEDIA",
    "instagram.com": "SOCIAL_MEDIA",
    "twitter.com": "SOCIAL_MEDIA",
    "x.com": "SOCIAL_MEDIA",
    "linkedin.com": "SOCIAL_MEDIA",
    "tiktok.com": "SOCIAL_MEDIA",
    "snapchat.com": "SOCIAL_MEDIA",
}

// ─── State ───
let authToken = null
let isTracking = false
let currentActivity = null
let pendingActivities = []

// ─── Helpers ───
function getDomain(url) {
    try {
        const hostname = new URL(url).hostname
        // Remove www. prefix
        return hostname.replace(/^www\./, "")
    } catch {
        return null
    }
}

function categorize(domain) {
    if (!domain) return "OTHER"

    // Direct match
    if (DOMAIN_CATEGORIES[domain]) return DOMAIN_CATEGORIES[domain]

    // Subdomain match (e.g., app.slack.com → slack.com)
    for (const [key, cat] of Object.entries(DOMAIN_CATEGORIES)) {
        if (domain.endsWith("." + key) || domain === key) return cat
    }

    return "OTHER"
}

// ─── API Calls ───
async function sendActivity(activity) {
    try {
        const res = await fetch(`${API_BASE}/api/time-tracker/activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(activity)
        })
        return res.ok
    } catch {
        return false
    }
}

async function checkStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/time-tracker/status`, {
            credentials: "include"
        })
        if (res.ok) {
            const data = await res.json()
            return data.active
        }
        return false
    } catch {
        return false
    }
}

// ─── Tab Tracking ───
function onTabChanged(activeInfo) {
    if (!isTracking) return

    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab?.url) return
        processTab(tab)
    })
}

function onTabUpdated(tabId, changeInfo, tab) {
    if (!isTracking || changeInfo.status !== "complete") return

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id === tabId) {
            processTab(tab)
        }
    })
}

function processTab(tab) {
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return

    const domain = getDomain(tab.url)
    const category = categorize(domain)

    const activity = {
        appName: "Chrome",
        windowTitle: tab.title || "",
        url: tab.url,
        domain: domain,
        category: category,
    }

    // Skip if same as current
    if (currentActivity && currentActivity.url === activity.url) return

    currentActivity = activity
    pendingActivities.push(activity)

    // Update badge
    updateBadge(category)
}

function updateBadge(category) {
    const colors = {
        "PRODUCTIVITY": "#34c759",
        "COMMUNICATION": "#007aff",
        "DESIGN": "#af52de",
        "RESEARCH": "#5856d6",
        "ENTERTAINMENT": "#ff9500",
        "SOCIAL_MEDIA": "#ff3b30",
        "OTHER": "#8e8e93"
    }

    chrome.action.setBadgeBackgroundColor({ color: colors[category] || "#8e8e93" })
    chrome.action.setBadgeText({ text: "●" })
}

// ─── Idle Detection ───
chrome.idle.onStateChanged.addListener((state) => {
    if (!isTracking) return

    if (state === "idle" || state === "locked") {
        chrome.action.setBadgeBackgroundColor({ color: "#ff9500" })
        chrome.action.setBadgeText({ text: "💤" })
    } else if (state === "active") {
        if (currentActivity) {
            updateBadge(currentActivity.category)
        }
    }
})

chrome.idle.setDetectionInterval(IDLE_THRESHOLD)

// ─── Periodic Sender ───
async function flushActivities() {
    if (pendingActivities.length === 0) return

    // Check if still tracking
    const active = await checkStatus()
    isTracking = active

    if (!active) {
        pendingActivities = []
        chrome.action.setBadgeText({ text: "" })
        return
    }

    // Send only the latest activity (most recent tab)
    const latest = pendingActivities[pendingActivities.length - 1]
    pendingActivities = []

    await sendActivity(latest)
}

// ─── Lifecycle ───
async function startTracking() {
    const active = await checkStatus()
    isTracking = active

    if (active) {
        chrome.action.setBadgeBackgroundColor({ color: "#34c759" })
        chrome.action.setBadgeText({ text: "●" })
    } else {
        chrome.action.setBadgeText({ text: "" })
    }
}

// Set up listeners
chrome.tabs.onActivated.addListener(onTabChanged)
chrome.tabs.onUpdated.addListener(onTabUpdated)

// Periodic flush
setInterval(flushActivities, SEND_INTERVAL)

// Start on install/startup
chrome.runtime.onStartup.addListener(startTracking)
chrome.runtime.onInstalled.addListener(startTracking)

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_STATUS") {
        checkStatus().then(active => {
            isTracking = active
            sendResponse({ tracking: active, currentActivity })
        })
        return true
    }

    if (msg.type === "START_TRACKING") {
        startTracking().then(() => sendResponse({ ok: true }))
        return true
    }
})

/**
 * Local type definition replacing @prisma/client ActivityCategory.
 * Matches the Django ActivityCategory choices.
 */
export type ActivityCategory =
    | "PRODUCTIVITY"
    | "COMMUNICATION"
    | "DESIGN"
    | "RESEARCH"
    | "ENTERTAINMENT"
    | "SOCIAL_MEDIA"
    | "OTHER"

// ── App Name → Category Maps ────────────────────────────

const APP_RULES: Array<[string[], ActivityCategory]> = [
    // Productivity / Coding
    [["vscode", "code", "intellij", "webstorm", "pycharm", "vim", "neovim", "emacs",
      "sublime", "atom", "xcode", "android studio", "terminal", "iterm", "warp",
      "powershell", "cmd", "postman", "insomnia", "dbeaver", "pgadmin", "datagrip"],
     "PRODUCTIVITY"],
    // Office / Docs
    [["word", "excel", "powerpoint", "google docs", "notion", "obsidian",
      "onenote", "evernote", "bear", "confluence", "linear", "jira", "asana",
      "trello", "clickup", "todoist", "monday"],
     "PRODUCTIVITY"],
    // Communication
    [["slack", "teams", "zoom", "discord", "telegram", "whatsapp", "signal",
      "outlook", "gmail", "thunderbird", "microsoft teams", "google meet",
      "webex", "skype"],
     "COMMUNICATION"],
    // Design
    [["figma", "sketch", "photoshop", "illustrator", "indesign", "canva",
      "affinity", "blender", "after effects", "premiere"],
     "DESIGN"],
    // Entertainment
    [["spotify", "apple music", "netflix", "youtube music", "vlc", "itunes",
      "disney", "hbo"],
     "ENTERTAINMENT"],
    // Social Media
    [["twitter", "facebook", "instagram", "tiktok", "snapchat", "reddit"],
     "SOCIAL_MEDIA"],
]

const DOMAIN_RULES: Array<[string[], ActivityCategory]> = [
    // Productivity
    [["github.com", "gitlab.com", "bitbucket.org", "vercel.com", "netlify.com",
      "supabase.com", "aws.amazon.com", "console.cloud.google.com",
      "portal.azure.com", "linear.app", "jira.atlassian.com", "notion.so",
      "docs.google.com", "sheets.google.com", "slides.google.com"],
     "PRODUCTIVITY"],
    // Research
    [["stackoverflow.com", "developer.mozilla.org", "npmjs.com", "crates.io",
      "pypi.org", "medium.com", "dev.to", "hackernews.com", "arxiv.org",
      "wikipedia.org", "w3schools.com"],
     "RESEARCH"],
    // Communication
    [["slack.com", "teams.microsoft.com", "mail.google.com", "outlook.live.com",
      "linkedin.com", "discord.com"],
     "COMMUNICATION"],
    // Design
    [["figma.com", "canva.com", "dribbble.com", "behance.net"],
     "DESIGN"],
    // Entertainment
    [["youtube.com", "netflix.com", "twitch.tv", "spotify.com", "primevideo.com"],
     "ENTERTAINMENT"],
    // Social
    [["twitter.com", "x.com", "facebook.com", "instagram.com", "reddit.com",
      "tiktok.com"],
     "SOCIAL_MEDIA"],
]

/**
 * Classify an activity based on app name and/or domain.
 * Domain takes priority over app name since it's more specific.
 */
export function classifyActivity(
    appName?: string | null,
    domain?: string | null
): ActivityCategory {
    if (domain) {
        const d = domain.toLowerCase().replace(/^www\./, "")
        for (const [patterns, category] of DOMAIN_RULES) {
            if (patterns.some(p => d.includes(p))) return category
        }
    }

    if (appName) {
        const a = appName.toLowerCase()
        for (const [patterns, category] of APP_RULES) {
            if (patterns.some(p => a.includes(p))) return category
        }
    }

    return "OTHER"
}

// ── Category → Productivity Weight ──────────────────────

const CATEGORY_WEIGHTS: Record<ActivityCategory, number> = {
    PRODUCTIVITY: 1.0,
    DESIGN: 0.9,
    COMMUNICATION: 0.7,
    RESEARCH: 0.6,
    OTHER: 0.3,
    ENTERTAINMENT: 0.1,
    SOCIAL_MEDIA: 0.1,
}

/**
 * Compute a 0.0-1.0 productivity score for a single snapshot.
 */
export function computeProductivityScore(
    activeSeconds: number,
    idleSeconds: number,
    category: ActivityCategory
): number {
    const total = activeSeconds + idleSeconds
    if (total === 0) return 0
    const activityRatio = activeSeconds / total
    return Math.min(1.0, activityRatio * (CATEGORY_WEIGHTS[category] ?? 0.3))
}

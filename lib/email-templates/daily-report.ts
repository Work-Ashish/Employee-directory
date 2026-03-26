function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

interface AppEntry {
    appName: string
    totalSeconds: number
    category: string
}

interface WebsiteEntry {
    domain: string
    totalSeconds: number
    category: string
}

export interface DailyReportData {
    employeeName: string
    date: string
    totalActiveHours: number
    totalIdleHours: number
    totalBreakHours: number
    productivityScore: number
    focusScore: number
    topApps: AppEntry[]
    topWebsites: WebsiteEntry[]
    idleNotes: string[]
    aiSummary: string
    aiRecommendations: string[]
}

function formatHours(h: number): string {
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    return `${hrs}h ${mins}m`
}

function bar(pct: number, color: string): string {
    const width = Math.max(1, Math.min(100, Math.round(pct)))
    return `<div style="background:#e5e7eb;border-radius:4px;height:14px;width:100%;overflow:hidden"><div style="background:${color};height:100%;width:${width}%;border-radius:4px"></div></div>`
}

export function renderDailyReportEmail(data: DailyReportData): string {
    const totalHours = data.totalActiveHours + data.totalIdleHours + data.totalBreakHours
    const activePct = totalHours > 0 ? (data.totalActiveHours / totalHours) * 100 : 0

    const appRows = data.topApps
        .slice(0, 5)
        .map(a => {
            const hrs = (a.totalSeconds / 3600).toFixed(1)
            return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${escapeHtml(a.appName)}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right">${hrs}h</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${escapeHtml(a.category)}</td></tr>`
        })
        .join("")

    const siteRows = data.topWebsites
        .slice(0, 5)
        .map(w => {
            const hrs = (w.totalSeconds / 3600).toFixed(1)
            return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${escapeHtml(w.domain)}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right">${hrs}h</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${escapeHtml(w.category)}</td></tr>`
        })
        .join("")

    const idleSection = data.idleNotes.length > 0
        ? `<div style="margin-top:24px"><h3 style="font-size:15px;margin:0 0 8px">Idle Event Notes</h3><ul style="margin:0;padding-left:20px;color:#6b7280">${data.idleNotes.map(n => `<li style="margin-bottom:4px">${escapeHtml(n)}</li>`).join("")}</ul></div>`
        : ""

    const recommendations = data.aiRecommendations.length > 0
        ? `<ul style="margin:8px 0 0;padding-left:20px;color:#374151">${data.aiRecommendations.map(r => `<li style="margin-bottom:4px">${escapeHtml(r)}</li>`).join("")}</ul>`
        : ""

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827">
<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 24px;border-radius:12px 12px 0 0">
<h1 style="margin:0;font-size:22px;color:white">Daily Activity Report</h1>
<p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">${escapeHtml(data.employeeName)} — ${escapeHtml(data.date)}</p>
</div>
<div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
<div style="display:flex;gap:12px;margin-bottom:24px">
<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center">
<div style="font-size:24px;font-weight:800;color:#16a34a">${formatHours(data.totalActiveHours)}</div>
<div style="font-size:12px;color:#6b7280;margin-top:2px">Active</div>
</div>
<div style="flex:1;background:#fef3c7;border-radius:8px;padding:14px;text-align:center">
<div style="font-size:24px;font-weight:800;color:#d97706">${formatHours(data.totalIdleHours)}</div>
<div style="font-size:12px;color:#6b7280;margin-top:2px">Idle</div>
</div>
<div style="flex:1;background:#ede9fe;border-radius:8px;padding:14px;text-align:center">
<div style="font-size:24px;font-weight:800;color:#7c3aed">${Math.round(data.productivityScore * 100)}%</div>
<div style="font-size:12px;color:#6b7280;margin-top:2px">Productivity</div>
</div>
</div>
<div style="margin-bottom:16px"><span style="font-size:13px;color:#6b7280">Activity Ratio</span>${bar(activePct, "#22c55e")}</div>
${data.topApps.length > 0 ? `<h3 style="font-size:15px;margin:24px 0 8px">Top Applications</h3><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f9fafb"><th style="padding:6px 8px;text-align:left">App</th><th style="padding:6px 8px;text-align:right">Time</th><th style="padding:6px 8px;text-align:left">Category</th></tr></thead><tbody>${appRows}</tbody></table>` : ""}
${data.topWebsites.length > 0 ? `<h3 style="font-size:15px;margin:24px 0 8px">Top Websites</h3><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f9fafb"><th style="padding:6px 8px;text-align:left">Domain</th><th style="padding:6px 8px;text-align:right">Time</th><th style="padding:6px 8px;text-align:left">Category</th></tr></thead><tbody>${siteRows}</tbody></table>` : ""}
${idleSection}
${data.aiSummary ? `<div style="margin-top:24px;padding:16px;background:#f0f9ff;border-radius:8px;border-left:3px solid #3b82f6"><h3 style="font-size:15px;margin:0 0 8px;color:#1e40af">AI Insights</h3><p style="margin:0;font-size:13px;color:#374151;line-height:1.5">${escapeHtml(data.aiSummary)}</p>${recommendations}</div>` : ""}
<div style="margin-top:24px;text-align:center;font-size:11px;color:#9ca3af">Generated by EMS Pro Agent Tracking System</div>
</div>
</body></html>`
}

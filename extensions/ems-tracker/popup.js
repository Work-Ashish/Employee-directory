document.addEventListener("DOMContentLoaded", () => {
    const statusBadge = document.getElementById("status-badge")
    const activitySection = document.getElementById("activity-section")
    const currentDomain = document.getElementById("current-domain")
    const categoryBadge = document.getElementById("category-badge")
    const refreshBtn = document.getElementById("refresh")

    function updateUI(data) {
        if (data.tracking) {
            statusBadge.className = "status-indicator online"
            statusBadge.innerHTML = '<span class="dot green"></span> Tracking Active'

            if (data.currentActivity) {
                activitySection.style.display = "block"
                currentDomain.textContent = data.currentActivity.domain || data.currentActivity.url || "—"
                const cat = data.currentActivity.category || "OTHER"
                categoryBadge.innerHTML = `<span class="domain-badge ${cat}">${cat.replace("_", " ")}</span>`
            }
        } else {
            statusBadge.className = "status-indicator offline"
            statusBadge.innerHTML = '<span class="dot gray"></span> Not Tracking'
            activitySection.style.display = "none"
        }
    }

    function refresh() {
        chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
            if (response) updateUI(response)
        })
    }

    refreshBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "START_TRACKING" }, () => {
            setTimeout(refresh, 500)
        })
    })

    refresh()
})

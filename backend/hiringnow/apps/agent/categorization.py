"""
Default app and website categorization database.

Categories:
  PRODUCTIVE    - Tools directly related to work output
  NEUTRAL       - Communication/utility tools (productive depending on context)
  UNPRODUCTIVE  - Entertainment and social media
  UNCATEGORIZED - Unknown apps/domains (fallback)
"""

# -------------------------------------------------------------------------
# App name -> category mapping (case-insensitive substring match)
# -------------------------------------------------------------------------

APP_CATEGORIES = {
    # -- Productive: IDEs & editors --
    'code': 'PRODUCTIVE',
    'visual studio': 'PRODUCTIVE',
    'vscode': 'PRODUCTIVE',
    'intellij': 'PRODUCTIVE',
    'pycharm': 'PRODUCTIVE',
    'webstorm': 'PRODUCTIVE',
    'phpstorm': 'PRODUCTIVE',
    'rider': 'PRODUCTIVE',
    'goland': 'PRODUCTIVE',
    'rubymine': 'PRODUCTIVE',
    'clion': 'PRODUCTIVE',
    'datagrip': 'PRODUCTIVE',
    'sublime text': 'PRODUCTIVE',
    'sublime': 'PRODUCTIVE',
    'atom': 'PRODUCTIVE',
    'vim': 'PRODUCTIVE',
    'nvim': 'PRODUCTIVE',
    'neovim': 'PRODUCTIVE',
    'emacs': 'PRODUCTIVE',
    'notepad++': 'PRODUCTIVE',
    'cursor': 'PRODUCTIVE',

    # -- Productive: terminals & dev tools --
    'terminal': 'PRODUCTIVE',
    'cmd': 'PRODUCTIVE',
    'powershell': 'PRODUCTIVE',
    'wt': 'PRODUCTIVE',
    'windows terminal': 'PRODUCTIVE',
    'iterm': 'PRODUCTIVE',
    'hyper': 'PRODUCTIVE',
    'git': 'PRODUCTIVE',
    'github desktop': 'PRODUCTIVE',
    'sourcetree': 'PRODUCTIVE',
    'postman': 'PRODUCTIVE',
    'insomnia': 'PRODUCTIVE',
    'docker': 'PRODUCTIVE',
    'devtools': 'PRODUCTIVE',
    'pgadmin': 'PRODUCTIVE',
    'dbeaver': 'PRODUCTIVE',
    'mysql workbench': 'PRODUCTIVE',
    'redis insight': 'PRODUCTIVE',

    # -- Productive: design tools --
    'figma': 'PRODUCTIVE',
    'sketch': 'PRODUCTIVE',
    'adobe photoshop': 'PRODUCTIVE',
    'adobe illustrator': 'PRODUCTIVE',
    'adobe xd': 'PRODUCTIVE',
    'canva': 'PRODUCTIVE',
    'affinity': 'PRODUCTIVE',
    'blender': 'PRODUCTIVE',

    # -- Productive: office & docs --
    'microsoft word': 'PRODUCTIVE',
    'microsoft excel': 'PRODUCTIVE',
    'microsoft powerpoint': 'PRODUCTIVE',
    'libreoffice': 'PRODUCTIVE',
    'google docs': 'PRODUCTIVE',
    'google sheets': 'PRODUCTIVE',
    'google slides': 'PRODUCTIVE',
    'notion': 'PRODUCTIVE',
    'obsidian': 'PRODUCTIVE',
    'onenote': 'PRODUCTIVE',
    'evernote': 'PRODUCTIVE',
    'confluence': 'PRODUCTIVE',

    # -- Productive: project management --
    'jira': 'PRODUCTIVE',
    'linear': 'PRODUCTIVE',
    'asana': 'PRODUCTIVE',
    'trello': 'PRODUCTIVE',
    'monday': 'PRODUCTIVE',
    'clickup': 'PRODUCTIVE',
    'basecamp': 'PRODUCTIVE',

    # -- Neutral: communication --
    'slack': 'NEUTRAL',
    'microsoft teams': 'NEUTRAL',
    'teams': 'NEUTRAL',
    'zoom': 'NEUTRAL',
    'google meet': 'NEUTRAL',
    'discord': 'NEUTRAL',
    'skype': 'NEUTRAL',
    'webex': 'NEUTRAL',
    'telegram': 'NEUTRAL',
    'whatsapp': 'NEUTRAL',

    # -- Neutral: browsers (categorized by website separately) --
    'chrome': 'NEUTRAL',
    'firefox': 'NEUTRAL',
    'edge': 'NEUTRAL',
    'msedge': 'NEUTRAL',
    'safari': 'NEUTRAL',
    'brave': 'NEUTRAL',
    'opera': 'NEUTRAL',
    'arc': 'NEUTRAL',
    'vivaldi': 'NEUTRAL',

    # -- Neutral: email & calendar --
    'outlook': 'NEUTRAL',
    'thunderbird': 'NEUTRAL',
    'mail': 'NEUTRAL',
    'calendar': 'NEUTRAL',
    'google calendar': 'NEUTRAL',

    # -- Neutral: file managers --
    'file explorer': 'NEUTRAL',
    'explorer': 'NEUTRAL',
    'finder': 'NEUTRAL',

    # -- Unproductive: entertainment --
    'netflix': 'UNPRODUCTIVE',
    'spotify': 'UNPRODUCTIVE',
    'vlc': 'UNPRODUCTIVE',
    'media player': 'UNPRODUCTIVE',
    'itunes': 'UNPRODUCTIVE',
    'apple music': 'UNPRODUCTIVE',

    # -- Unproductive: gaming --
    'steam': 'UNPRODUCTIVE',
    'epic games': 'UNPRODUCTIVE',
    'riot client': 'UNPRODUCTIVE',
    'battle.net': 'UNPRODUCTIVE',
    'xbox': 'UNPRODUCTIVE',

    # -- Unproductive: social media --
    'instagram': 'UNPRODUCTIVE',
    'tiktok': 'UNPRODUCTIVE',
    'twitter': 'UNPRODUCTIVE',
    'facebook': 'UNPRODUCTIVE',
    'snapchat': 'UNPRODUCTIVE',
}


# -------------------------------------------------------------------------
# Domain -> category mapping (substring match against domain)
# -------------------------------------------------------------------------

DOMAIN_CATEGORIES = {
    # -- Productive: development --
    'github.com': 'PRODUCTIVE',
    'gitlab.com': 'PRODUCTIVE',
    'bitbucket.org': 'PRODUCTIVE',
    'stackoverflow.com': 'PRODUCTIVE',
    'stackexchange.com': 'PRODUCTIVE',
    'docs.python.org': 'PRODUCTIVE',
    'developer.mozilla.org': 'PRODUCTIVE',
    'npmjs.com': 'PRODUCTIVE',
    'pypi.org': 'PRODUCTIVE',
    'crates.io': 'PRODUCTIVE',
    'pkg.go.dev': 'PRODUCTIVE',
    'learn.microsoft.com': 'PRODUCTIVE',
    'devdocs.io': 'PRODUCTIVE',
    'vercel.com': 'PRODUCTIVE',
    'netlify.com': 'PRODUCTIVE',
    'heroku.com': 'PRODUCTIVE',
    'aws.amazon.com': 'PRODUCTIVE',
    'console.cloud.google.com': 'PRODUCTIVE',
    'portal.azure.com': 'PRODUCTIVE',

    # -- Productive: design & PM --
    'figma.com': 'PRODUCTIVE',
    'notion.so': 'PRODUCTIVE',
    'linear.app': 'PRODUCTIVE',
    'asana.com': 'PRODUCTIVE',
    'trello.com': 'PRODUCTIVE',
    'clickup.com': 'PRODUCTIVE',
    'monday.com': 'PRODUCTIVE',

    # -- Productive: docs --
    'docs.google.com': 'PRODUCTIVE',
    'sheets.google.com': 'PRODUCTIVE',
    'slides.google.com': 'PRODUCTIVE',
    'jira.atlassian.com': 'PRODUCTIVE',
    'confluence.atlassian.com': 'PRODUCTIVE',

    # -- Neutral: communication --
    'mail.google.com': 'NEUTRAL',
    'outlook.office.com': 'NEUTRAL',
    'outlook.office365.com': 'NEUTRAL',
    'calendar.google.com': 'NEUTRAL',
    'meet.google.com': 'NEUTRAL',
    'zoom.us': 'NEUTRAL',
    'slack.com': 'NEUTRAL',
    'teams.microsoft.com': 'NEUTRAL',
    'discord.com': 'NEUTRAL',

    # -- Neutral: utilities --
    'drive.google.com': 'NEUTRAL',
    'onedrive.live.com': 'NEUTRAL',
    'dropbox.com': 'NEUTRAL',
    'google.com': 'NEUTRAL',
    'bing.com': 'NEUTRAL',
    'duckduckgo.com': 'NEUTRAL',
    'wikipedia.org': 'NEUTRAL',

    # -- Unproductive: video/streaming --
    'youtube.com': 'UNPRODUCTIVE',
    'netflix.com': 'UNPRODUCTIVE',
    'twitch.tv': 'UNPRODUCTIVE',
    'hulu.com': 'UNPRODUCTIVE',
    'disneyplus.com': 'UNPRODUCTIVE',
    'primevideo.com': 'UNPRODUCTIVE',
    'hotstar.com': 'UNPRODUCTIVE',

    # -- Unproductive: social media --
    'reddit.com': 'UNPRODUCTIVE',
    'twitter.com': 'UNPRODUCTIVE',
    'x.com': 'UNPRODUCTIVE',
    'facebook.com': 'UNPRODUCTIVE',
    'instagram.com': 'UNPRODUCTIVE',
    'tiktok.com': 'UNPRODUCTIVE',
    'linkedin.com': 'NEUTRAL',  # Professional networking

    # -- Unproductive: shopping --
    'amazon.com': 'UNPRODUCTIVE',
    'amazon.in': 'UNPRODUCTIVE',
    'flipkart.com': 'UNPRODUCTIVE',
    'ebay.com': 'UNPRODUCTIVE',
    'aliexpress.com': 'UNPRODUCTIVE',

    # -- Unproductive: news/entertainment --
    'buzzfeed.com': 'UNPRODUCTIVE',
    '9gag.com': 'UNPRODUCTIVE',
    'imgur.com': 'UNPRODUCTIVE',
}


def categorize_app(app_name):
    """
    Return the productivity category for an app name.
    Performs case-insensitive substring matching against APP_CATEGORIES.

    Returns: 'PRODUCTIVE', 'NEUTRAL', 'UNPRODUCTIVE', or 'UNCATEGORIZED'
    """
    app_lower = (app_name or '').lower().strip()
    if not app_lower:
        return 'UNCATEGORIZED'

    for key, category in APP_CATEGORIES.items():
        if key.lower() in app_lower:
            return category
    return 'UNCATEGORIZED'


def categorize_domain(domain):
    """
    Return the productivity category for a domain.
    Strips leading 'www.' and performs case-insensitive substring matching.

    Returns: 'PRODUCTIVE', 'NEUTRAL', 'UNPRODUCTIVE', or 'UNCATEGORIZED'
    """
    domain_lower = (domain or '').lower().strip().lstrip('www.')
    if not domain_lower:
        return 'UNCATEGORIZED'

    for key, category in DOMAIN_CATEGORIES.items():
        if key in domain_lower:
            return category
    return 'UNCATEGORIZED'

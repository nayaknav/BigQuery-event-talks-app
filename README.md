# BigQuery Release Notes Hub ⚡

A real-time, premium dashboard that parses, caches, and shares Google Cloud BigQuery release updates. Built with a Python Flask backend and a clean, responsive vanilla HTML/CSS/JavaScript client.

👉 **GitHub Repository**: [BigQuery-event-talks-app](https://github.com/nayaknav/BigQuery-event-talks-app)

---

## ✨ Features

- **Atom Feed Ingestion & Compound Parsing**: Parses raw Atom XML feeds from Google Cloud and breaks daily entries down into individual, categorized cards (e.g. *Features*, *Issues*, *Deprecations*, *Notices*).
- **Intelligent Dual Caching**: Implements a 1-hour cache duration to prevent rate limits and speed up client loading times. Automatically falls back to cached data with a warning banner if Google's feed goes offline.
- **Custom Tweet Composer**: Click the "Tweet Update" button on any release to open a custom, interactive composer modal. Features:
  - Pre-populated tweet body containing category, date, truncated details, and links.
  - Character countdown with an animated circular progress ring (protects X/Twitter's 280-character limit).
  - One-click redirection to X (Twitter) Web Intent page.
- **Instant Client-Side Filtering**: Sort through release categories instantly using visual pills (All, Features, Issues, etc.).
- **Live Search Highlighting**: Dynamic text-matching queries search headers, dates, and bodies, highlighting matches on the fly.
- **Aesthetic Obsidian & Light Modes**: System-matching glassmorphism design with color transitions. Saves choices to browser `localStorage` for continuity.
- **Status Indicator & Toasts**: Live/cached state indicator badges and smooth toast alerts for action feedback.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, Requests
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
- **Icons**: Custom responsive SVG icons (zero external dependencies)
- **Typography**: Google Fonts (Plus Jakarta Sans, JetBrains Mono)

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                # Flask server, feed parsing, text cleaner, cache
├── requirements.txt      # Python packages (Flask, requests)
├── .gitignore            # Git exclusions (venv, caches, IDE setups)
├── templates/
│   └── index.html        # Glassmorphic layout, modal skeletons, SVGs
└── static/
    ├── css/
    │   └── style.css     # CSS variable themes, layouts, animations, transitions
    └── js/
        └── app.js        # API fetches, timeline layout, search, modal composer
```

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have Python 3.12+ and Git installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/nayaknav/BigQuery-event-talks-app.git
cd BigQuery-event-talks-app
```

### 2. Set Up Virtual Environment
Initialize a local Python virtual environment to manage dependencies:

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:

**Windows (PowerShell):**
```powershell
.venv\Scripts\python app.py
```

**Linux / macOS:**
```bash
python app.py
```

Open your browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔄 How it Works

### Data Processing Flow

1. **Client Request**: On page load or manual refresh, the browser requests the `/api/releases` JSON endpoint.
2. **Server Cache Evaluation**: Flask checks if cached data exists in memory and is less than 1 hour old. If valid, it returns the cache.
3. **Live Parsing**: If the cache is expired or the user triggers a forced refresh (`?refresh=true`), Flask queries `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
4. **Regex Extraction**: Flask parses the XML and splits the HTML entries using `re.split` on `<h3>` elements to catalog each update individually.
5. **JSON Delivery & Render**: The server outputs a structured JSON array. The client parses this array, builds a vertical timeline, handles text-search indices, and populates interactive cards.

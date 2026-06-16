import os
import re
import datetime
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": None,
    "source": None
}
CACHE_DURATION = datetime.timedelta(hours=1)

def strip_html(html_text):
    """
    Remove HTML tags and convert lists/headers into readable plain text for tweets.
    """
    if not html_text:
        return ""
    # Replace links with text (URL) format
    # e.g., <a href="http://foo">bar</a> -> bar (http://foo)
    # But for brevity in tweets, we can just keep the text and add the main release note link.
    # Let's do a simple clean up.
    # Replace list items with bullet points
    text = re.sub(r'<li>', '• ', html_text)
    text = re.sub(r'</li>', '\n', text)
    # Replace paragraph and header breaks with newlines
    text = re.sub(r'</p>|<br\s*/?>|</h3>|</h2>', '\n', text)
    # Remove all other tags
    text = re.sub(r'<[^>]+>', '', text)
    # Clean up whitespace
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = text.strip()
    return text

def parse_feed():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        parsed_entries = []
        
        for entry in root.findall('atom:entry', ns):
            entry_id = entry.find('atom:id', ns).text if entry.find('atom:id', ns) is not None else ""
            date_str = entry.find('atom:title', ns).text if entry.find('atom:title', ns) is not None else ""
            updated_str = entry.find('atom:updated', ns).text if entry.find('atom:updated', ns) is not None else ""
            
            # Extract alternate link
            link_el = entry.find("atom:link[@rel='alternate']", ns)
            if link_el is None:
                link_el = entry.find("atom:link", ns)
            link_url = link_el.attrib.get('href', '') if link_el is not None else ''
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Split content by H3 header to get individual updates
            updates = []
            if content_html:
                parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html, flags=re.IGNORECASE)
                # If there's content before the first h3, it goes to parts[0]
                # Then parts[1] is Category 1, parts[2] is Description 1, etc.
                for i in range(1, len(parts), 2):
                    category = parts[i].strip()
                    desc_html = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    # Clean the description HTML a bit if needed (removing outer <p> wrappers if redundant, or keeping it)
                    # We will strip HTML to get a clean text representation for tweeting
                    text_desc = strip_html(desc_html)
                    
                    updates.append({
                        "category": category,
                        "description_html": desc_html,
                        "description_text": text_desc
                    })
            else:
                updates.append({
                    "category": "Notice",
                    "description_html": "<p>No detailed release notes available for this update.</p>",
                    "description_text": "No detailed release notes available for this update."
                })
                
            parsed_entries.append({
                "id": entry_id,
                "date": date_str,
                "updated": updated_str,
                "link": link_url,
                "updates": updates
            })
            
        return parsed_entries, None
    except Exception as e:
        return None, str(e)

def get_feed_data(force_refresh=False):
    now = datetime.datetime.now()
    
    # Check if we should use cache
    if not force_refresh and cache["data"] is not None and cache["last_fetched"] is not None:
        if now - cache["last_fetched"] < CACHE_DURATION:
            cache["source"] = "cache"
            return cache["data"], cache["last_fetched"], cache["source"], None
            
    # Fetch fresh data
    data, error = parse_feed()
    if data is not None:
        cache["data"] = data
        cache["last_fetched"] = now
        cache["source"] = "live"
        return data, now, "live", None
    else:
        # If fetch fails but we have cached data, return cached data with error/warning
        if cache["data"] is not None:
            cache["source"] = "fallback_cache"
            return cache["data"], cache["last_fetched"], "fallback_cache", f"Failed to fetch fresh data: {error}. Displaying cached data."
        return None, None, None, error

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    data, last_fetched, source, warning = get_feed_data(force_refresh=force_refresh)
    
    if data is None:
        return jsonify({
            "status": "error",
            "message": warning or "Failed to load release notes."
        }), 500
        
    return jsonify({
        "status": "success",
        "source": source,
        "last_updated": last_fetched.isoformat() if last_fetched else None,
        "warning": warning,
        "data": data
    })

if __name__ == '__main__':
    # Running Flask app on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)

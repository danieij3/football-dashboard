# Football Match Insights Dashboard

This is my final year project for BSc Computer Science.
It is a web dashboard built with Flask that shows football match data from the football-data.org API.

## Project overview

The dashboard lets users:
- choose a competition
- filter by team
- view recent matches
- view league standings
- view charts (team form, goals stats, points progression, team comparison)
- open a match detail page to see timeline and events

## Tech used

- Python + Flask (backend)
- HTML, CSS, JavaScript (frontend)
- Chart.js (charts)
- football-data.org API (data source)

## Simple setup guide (VS Code on Mac)

1. Open the project in VS Code
2. Open terminal in VS Code
3. Create virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

4. Install requirements:

```bash
pip install -r requirements.txt
```

5. Create a `.env` file in project root:

```env
FOOTBALL_API_KEY=your_api_key_here
```

6. Run the app:

```bash
python app.py
```

7. Open browser:

`http://127.0.0.1:5000`

## Main files

- `app.py` - app entry point
- `routes/api.py` - API endpoints
- `routes/dashboard.py` - page routes
- `services/football_api.py` - football API calls
- `templates/index.html` - dashboard page
- `templates/match.html` - match details page
- `static/js/main.js` - dashboard logic
- `static/js/charts.js` - chart functions
- `static/js/match.js` - match page logic
- `static/css/style.css` - styling

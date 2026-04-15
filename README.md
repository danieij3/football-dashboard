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
- `tests/` - pytest API tests

## Running tests

```bash
source venv/bin/activate
pip install -r requirements.txt
pytest -q
```

## Test plan + results (manual + automated)

| Feature | Test type | Expected | Actual | Pass/Fail |
| --- | --- | --- | --- | --- |
| Dashboard loads | Manual | Page shows filters and tables | Page loads after `python app.py` | Pass |
| Chart.js charts render | Manual | Form and goals charts appear after Load Data | Charts draw when API returns data | Pass |
| API competitions JSON | Automated (`pytest`) | `GET /api/competitions` returns 200 and a list | `tests/test_api.py` | Pass |
| API matches validation | Automated (`pytest`) | `GET /api/matches` without `competition` returns 400 | `tests/test_api.py` | Pass |
| API matches (mocked) | Automated (`pytest`) | Filtered match list JSON when service is stubbed | `tests/test_api.py` | Pass |

## Performance notes

- **Server-side:** Each `/api/*` response includes an `X-Response-Time-Ms` header (milliseconds) measured in Flask. Typical local values are small; most time is spent waiting on football-data.org when the key is valid.
- **Browser:** Use Chrome DevTools → Network to see total page load and Chart.js asset load times; expect a few hundred ms to a few seconds depending on API latency and cache.

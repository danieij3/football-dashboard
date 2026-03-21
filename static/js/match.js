/**
 * match.js
 * Match detail page: score timeline chart and match events list.
 * Expects MATCH_ID to be set by the Jinja2 template.
 */

function showLoading(visible) {
    document.getElementById("loading").style.display = visible ? "block" : "none";
}

function showError(msg) {
    const el = document.getElementById("error-banner");
    el.textContent = msg;
    el.style.display = "block";
}

async function apiFetch(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
}

function formatDate(utcString) {
    if (!utcString) return "–";
    const d = new Date(utcString);
    return d.toLocaleDateString("en-GB", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
}

function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
}

// -------------------------------------------------------------------
// Render match header
// -------------------------------------------------------------------

function renderHeader(match) {
    document.getElementById("home-name").textContent = match.homeTeam;
    document.getElementById("away-name").textContent = match.awayTeam;

    const hg = match.homeGoals !== null ? match.homeGoals : "–";
    const ag = match.awayGoals !== null ? match.awayGoals : "–";
    document.getElementById("match-score").textContent = `${hg} : ${ag}`;

    document.getElementById("match-date").textContent       = formatDate(match.utcDate);
    document.getElementById("match-competition").textContent = match.competition || "–";
    document.getElementById("match-status").textContent     = match.status || "–";

    show("match-header");
}

// -------------------------------------------------------------------
// Render half-time card
// -------------------------------------------------------------------

function renderHalfTime(match) {
    const htH = match.htHomeGoals !== null ? match.htHomeGoals : "?";
    const htA = match.htAwayGoals !== null ? match.htAwayGoals : "?";
    document.getElementById("ht-score").textContent = `${htH} : ${htA}`;
    show("ht-card");
}

// -------------------------------------------------------------------
// Render match events (goals, cards, substitutions) in chronological order
// -------------------------------------------------------------------

function renderEvents(events, homeTeam, awayTeam) {
    const list = document.getElementById("events-list");
    if (!events || events.length === 0) {
        list.innerHTML = "<li class='empty'>No event data available for this match.</li>";
        show("events-card");
        return;
    }

    const icons = {
        GOAL:           "⚽",
        YELLOW_CARD:    "🟨",
        RED_CARD:       "🟥",
        SUBSTITUTION:   "🔄",
        PENALTY:        "⚽🅿️",
    };

    list.innerHTML = events.map(e => {
        const side = e.team && e.team.name === homeTeam ? "home" : "away";
        const icon = icons[e.type] || "•";
        const name = e.player ? e.player.name : "";
        return `<li class="event-item event-${side}">
            <span class="event-minute">${e.minute}'</span>
            <span class="event-icon">${icon}</span>
            <span class="event-desc">${name} <em>(${e.type.replace(/_/g, " ")})</em></span>
        </li>`;
    }).join("");

    show("events-card");
}

// -------------------------------------------------------------------
// Load match form data for both teams (head-to-head)
// -------------------------------------------------------------------

async function loadHeadToHead(match) {
    const [formA, formB] = await Promise.all([
        apiFetch(`/api/form/${match.homeTeamId}`),
        apiFetch(`/api/form/${match.awayTeamId}`),
    ]);

    // Combine labels and goals into one side-by-side bar chart
    const labels   = [...formA.labels.map(l => `${match.homeTeam.substring(0, 8)}: ${l}`),
                      ...formB.labels.map(l => `${match.awayTeam.substring(0, 8)}: ${l}`)];
    const scored   = [...formA.goalsScored,   ...formB.goalsScored];
    const conceded = [...formA.goalsConceded, ...formB.goalsConceded];

    drawFormChart("formMatchChart", labels, scored, conceded);
    show("form-card");
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    showLoading(true);
    try {
        const match = await apiFetch(`/api/match/${MATCH_ID}`);

        renderHeader(match);
        renderHalfTime(match);
        renderEvents(match.events || [], match.homeTeam, match.awayTeam);

        // Score timeline: cumulative goals over match minutes
        drawTimelineChart(
            "timelineChart",
            match.homeTeam,
            match.awayTeam,
            match.events || [],
            match.homeGoals,
            match.awayGoals,
        );
        show("timeline-card");

        // Head-to-head form (best effort — skip if API limit hit)
        await loadHeadToHead(match);

    } catch (err) {
        showError("Could not load match details: " + err.message);
    } finally {
        showLoading(false);
    }
});

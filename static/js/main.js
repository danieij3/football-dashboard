async function loadMatchData() {
    try {
        const res = await fetch('/api/match_example');
        const data = await res.json();

        const title = document.getElementById('match-title');
        title.innerText = data.home_team + " vs " + data.away_team;

        const ctx = document.getElementById('scoreChart');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.minutes,
                datasets: [
                    {
                        label: data.home_team + " goals",
                        data: data.home_goals
                    },
                    {
                        label: data.away_team + " goals",
                        data: data.away_goals
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: 'Minute' } },
                    y: { title: { display: true, text: 'Goals' }, beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error("Error loading match data:", error);
    }
}

document.addEventListener('DOMContentLoaded', loadMatchData);


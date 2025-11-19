from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    # Renders templates/index.html
    return render_template("index.html")

@app.route("/api/match_example")
def match_example():
    # Dummy match data – later you swap this for real API data
    data = {
        "home_team": "Team A",
        "away_team": "Team B",
        "minutes": [10, 20, 30, 40, 50, 60, 70, 80, 90],
        "home_goals": [0, 0, 1, 1, 1, 2, 2, 3, 3],
        "away_goals": [0, 1, 1, 1, 2, 2, 2, 2, 2]
    }
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
    

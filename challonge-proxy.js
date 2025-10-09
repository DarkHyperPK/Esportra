const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const CHALLONGE_API_KEY = process.env.CHALLONGE_API_KEY;
const CHALLONGE_USERNAME = process.env.CHALLONGE_USERNAME;

const auth = {
  username: CHALLONGE_USERNAME,
  password: CHALLONGE_API_KEY
};

// Create a tournament
app.post('/api/challonge/create-tournament', async (req, res) => {
  const { name, url, type } = req.body;
  try {
    const response = await axios.post(
      'https://api.challonge.com/v1/tournaments.json',
      {
        tournament: {
          name,
          url,
          tournament_type: type || 'single elimination'
        }
      },
      { auth }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Bulk add participants
app.post('/api/challonge/:tournamentId/add-participants', async (req, res) => {
  const { tournamentId } = req.params;
  const { names } = req.body; // names: array of strings
  try {
    const response = await axios.post(
      `https://api.challonge.com/v1/tournaments/${tournamentId}/participants/bulk_add.json`,
      { participants: names.map(name => ({ name })) },
      { auth }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Start the tournament (generate bracket)
app.post('/api/challonge/:tournamentId/start', async (req, res) => {
  const { tournamentId } = req.params;
  try {
    const response = await axios.post(
      `https://api.challonge.com/v1/tournaments/${tournamentId}/start.json`,
      {},
      { auth }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Fetch matches
app.get('/api/challonge/:tournamentId/matches', async (req, res) => {
  const { tournamentId } = req.params;
  try {
    const response = await axios.get(
      `https://api.challonge.com/v1/tournaments/${tournamentId}/matches.json`,
      { auth }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Report score
app.post('/api/challonge/:tournamentId/report-score', async (req, res) => {
  const { tournamentId } = req.params;
  const { matchId, scoresCsv, winnerId } = req.body;
  try {
    const response = await axios.put(
      `https://api.challonge.com/v1/tournaments/${tournamentId}/matches/${matchId}.json`,
      { match: { scores_csv: scoresCsv, winner_id: winnerId } },
      { auth }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Challonge proxy running on port', PORT)); 
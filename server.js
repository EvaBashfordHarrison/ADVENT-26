require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID, WEBHOOK_URL } = process.env;

// Returns the live question (if any) to the page
app.get('/api/live-question', async (req, res) => {
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_ID)}` +
            `?filterByFormula=${encodeURIComponent('{Show Photo}')}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        if (!response.ok) return res.status(502).json({ error: 'Airtable request failed' });

        const data = await response.json();
        const record = data.records.find(r => r.fields.Photo?.[0]?.url);

        if (!record) return res.json({ live: false });

        res.json({
            live: true,
            videoUrl: record.fields.Photo[0].url,
            label: record.fields.Day ? `Day ${record.fields.Day}` : "Today's question"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forwards an answer to the Airtable webhook
app.post('/api/answer', async (req, res) => {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(req.body)
        });
        if (!response.ok) return res.status(502).json({ error: 'Webhook failed' });
        res.json({ ok: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
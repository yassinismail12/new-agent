// server.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Replace the values below with your real tokens and IDs
const VERIFY_TOKEN = "agentive123-secure"; // Use this in Facebook setup
const PAGE_ACCESS_TOKEN = "EAAJZBunZAr0lcBOxsZCIGz5O1STTn9hDlg108Ojw9taXCfWDGBfjbZC2ZA4YgCwYPEXoYHtLsW5TK5053k9nSFFaqujZAmMPRcgZAqAFpbLCb4Xy30mw22jYBUgaEiKwBOFbiGtvq9xhYg2klzOKN8a2Cxhtw9ne1LxwuVSnzJ95bTqMn1eKLCMc4TTFqs5dN4arZBHlYAZDZD";
const AGENTIVE_API_KEY = "f701ce40-6cc4-45c3-b5ae-cf6cc6273aca";
const AGENTIVE_ASSISTANT_ID = "92b67900-f81b-4be6-b5dc-13e4e7a1dc59";

app.use(bodyParser.json());

// Facebook verification route
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified!');
        return res.status(200).send(challenge);
    } else {
        console.log('❌ Verification failed.');
        return res.sendStatus(403);
    }
});

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    const senderId = messaging?.sender?.id;
    const userMessage = messaging?.message?.text;

    if (userMessage && senderId) {
        try {
            // Send user's message to Agentive
            const agentiveResponse = await axios.post(
                `https://api.agentive.ai/assistants/${AGENTIVE_ASSISTANT_ID}/messages`,
                {
                    message: userMessage,
                    session_id: senderId
                },
                {
                    headers: {
                        Authorization: AGENTIVE_API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const agentiveReply = agentiveResponse.data?.response || "I'm sorry, I didn't understand that.";

            // Send Agentive's reply back to Messenger
            await axios.post(
                `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
                {
                    recipient: { id: senderId },
                    message: { text: agentiveReply }
                }
            );
        } catch (err) {
            console.error("🔥 Error handling message:", err.response?.data || err.message);
        }
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

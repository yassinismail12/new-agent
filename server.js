// server.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Replace the values below with your real tokens and IDs
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Use this in Facebook setup
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const AGENTIVE_API_KEY = process.env.AGENTIVE_API_KEY;
const AGENTIVE_ASSISTANT_ID = process.env.AGENTIVE_ASSISTANT_ID;

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
const postback = messaging?.postback?.payload;

if (postback === "GET_STARTED") {
    await axios.post(
        `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
            recipient: { id: senderId },
            message: {
                text: "Welcome! What would you like to do today?",
                quick_replies: [
                    {
                        content_type: "text",
                        title: "View Apartments",
                        payload: "VIEW_APARTMENTS"
                    },
                    {
                        content_type: "text",
                        title: "Book a Tour",
                        payload: "BOOK_TOUR"
                    },
                    {
                        content_type: "text",
                        title: "Contact Agent",
                        payload: "CONTACT_AGENT"
                    }
                ]
            }
        }
    );
    return res.sendStatus(200); // Stop here so Agentive doesn’t answer too
}

// server.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Load secrets from environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const AGENTIVE_API_KEY = process.env.AGENTIVE_API_KEY;
const AGENTIVE_ASSISTANT_ID = process.env.AGENTIVE_ASSISTANT_ID;

app.use(bodyParser.json());

// ✅ Facebook Webhook Verification
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

// ✅ Main Webhook Handler
app.post('/webhook', async (req, res) => {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    const senderId = messaging?.sender?.id;
    const userMessage = messaging?.message?.text;
    const postback = messaging?.postback?.payload;

    // ✅ Handle GET_STARTED quick replies
    if (postback === "GET_STARTED") {
        try {
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
        } catch (err) {
            console.error("🔥 Error sending GET_STARTED reply:", err.response?.data || err.message);
        }
        return res.sendStatus(200); // Stop here
    }

    // ✅ Forward user message to AgentiveHub and respond
    if (userMessage && senderId) {
        try {
            // Step 1: Start a session with Agentive
            const sessionRes = await axios.post('https://agentivehub.com/api/chat/session', {
                api_key: AGENTIVE_API_KEY,
                assistant_id: AGENTIVE_ASSISTANT_ID,
            });

            const session_id = sessionRes.data.session_id;

            // Step 2: Send user message
            const agentiveRes = await axios.post('https://agentivehub.com/api/chat', {
                api_key: AGENTIVE_API_KEY,
                assistant_id: AGENTIVE_ASSISTANT_ID,
                session_id,
                type: 'custom_code',
                messages: [{ role: 'user', content: userMessage }],
            });

            const agentiveReply = agentiveRes.data.response || "Sorry, no reply from assistant.";

            // Send reply back to Messenger
            await axios.post(
                `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
                {
                    recipient: { id: senderId },
                    message: { text: agentiveReply }
                }
            );
        } catch (err) {
            console.error("🔥 Error handling Agentive response:", err.response?.data || err.message);
        }
    }

    res.sendStatus(200);
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

// server.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Load secrets from environment variables (use Render Dashboard)
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

    // ✅ Handle "GET_STARTED" postback with Quick Replies
    if (postback === "GET_STARTED") {
        (async () => {
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
                console.error("🔥 Error sending quick replies:", err.response?.data || err.message);
            }
        })();

        return res.sendStatus(200); // Stop here, don't fall through to Agentive
    }

    // ✅ Handle normal user messages via Agentive
    if (userMessage && senderId) {
        try {
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

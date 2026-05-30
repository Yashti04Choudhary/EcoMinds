const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const chatMessages = document.getElementById("chat-messages");

const COOLDOWN_MS = 3000; // 3 seconds delay
let lastSentTime = 0;

// ⛔ Common static questions and local answers
const fallbackAnswers = {
  "what is e-waste": "E-waste refers to discarded electronic devices like old phones, laptops, TVs, etc. Our app helps you recycle them responsibly.",
  "how to earn green rewards": "You earn green points by recycling at registered centers or joining social eco challenges in the app.",
  "how does this app work": "You upload a picture of your e-waste, we detect it, and help you schedule a pickup or locate a nearby recycler.",
  "who made this app": "This app is developed as part of an AI-driven e-waste management project to promote sustainable recycling.",
};

const COHERE_API_KEY = "YOUR_API_KEY";

// 🌐 Ask Cohere API for reply
async function getCohereReply(userInput) {
  const response = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${COHERE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "command-r-plus",
      message: userInput,
    }),
  });

  const data = await response.json();
  return data?.text || "⚠️ Couldn't get a response. Try again later.";
}

// 🧠 First check fallback, else send to Cohere
async function fetchSmartReply(userInput) {
  const lowerMsg = userInput.toLowerCase().trim();
  for (const question in fallbackAnswers) {
    if (lowerMsg.includes(question)) {
      console.log("💡 Local fallback triggered");
      return fallbackAnswers[question];
    }
  }

  return await getCohereReply(userInput);
}

// 🗨️ Render message
function renderMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender === "bot" ? "bot-message" : "user-message");
  msgDiv.innerHTML = `
    <div class="message-avatar">
      <i class="fas fa-${sender === "bot" ? "robot" : "user"}"></i>
    </div>
    <div class="message-content">
      <p>${text}</p>
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 📤 Handle send button
sendButton.addEventListener("click", async () => {
  const now = Date.now();
  if (now - lastSentTime < COOLDOWN_MS) {
    alert("⏳ Please wait a few seconds before sending another message.");
    return;
  }

  const userMsg = chatInput.value.trim();
  if (!userMsg) return;

  lastSentTime = now;

  renderMessage("user", userMsg);
  chatInput.value = "";

  renderMessage("bot", "🤖 Thinking...");

  try {
    const reply = await fetchSmartReply(userMsg);
    chatMessages.lastChild.remove(); // remove thinking
    renderMessage("bot", reply);
  } catch (err) {
    chatMessages.lastChild.remove();
    renderMessage("bot", "❌ Failed to get a reply.");
    console.error("Error:", err);
  }
});

// 🧪 Optional quick-message buttons
window.sendQuickMessage = function (msg) {
  chatInput.value = msg;
  sendButton.click();
};

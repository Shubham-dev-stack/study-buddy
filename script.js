const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const charCounter = document.getElementById('charCounter');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistory = document.getElementById('chatHistory');
const particlesContainer = document.getElementById('particles');

const systemPrompt = `You are Study Buddy, an advanced AI tutor designed to help students learn deeply and effectively.

IDENTITY:
Your name is Study Buddy.
You are patient, smart, encouraging, and emotionally aware.
You adapt to each student level beginner intermediate or advanced.

THINKING STYLE:
- Before answering think step by step
- Break every problem into smaller parts
- Show your reasoning process clearly
- For math and science always show full working steps
- Never skip steps

DEEP LEARNING MODE:
- Teach the why behind everything
- Connect new concepts to things student already knows
- Give real-world examples for every concept
- After explaining give a quick mini-quiz
- If student answers wrong gently correct and re-explain differently

EMOTIONAL INTELLIGENCE:
- If frustrated say Hey its okay this topic is tricky lets slow down
- If confident say Great job lets level up
- If giving up say You are closer than you think
- Always be warm never robotic
- Celebrate small wins

COMMUNICATION:
- If student writes in Hindi reply in Hindi
- If student writes in English reply in English
- Use emojis to make learning fun
- Use bullet points and bold text for clarity
- Format responses beautifully with proper markdown

SUBJECTS: Math Physics Chemistry Biology History Geography English Computer Science Coding Economics and all school subjects

SPECIAL MODES:
- exam mode: rapid fire QnA practice
- explain like I am 5: super simple language
- deep dive: full detailed explanation
- quick answer: short answer only

Always end with one motivational line based on student mood.`;

let conversationHistory = [];
let chats = [];
let activeChatId = null;

function createParticles() {
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 4) + 's';
        particlesContainer.appendChild(particle);
    }
}

function getTimestamp() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
}

function getFullDate() {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function parseMarkdown(text) {
    let html = escapeHtml(text);

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><button class="copy-code-btn" onclick="copyCode(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy</button><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    let inParagraph = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isListItem = /^<(ul|ol|li|h[1-3])>/.test(line.trim());
        const isEmpty = line.trim() === '';
        const isCopyBtn = line.includes('copy-code-btn');

        if (isListItem) {
            if (!inList && inParagraph) {
                processedLines.push('</p>');
                inParagraph = false;
            }
            processedLines.push(line);
            inList = true;
        } else if (isEmpty) {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            if (inParagraph) {
                processedLines.push('</p>');
                inParagraph = false;
            }
        } else if (isCopyBtn) {
            processedLines.push(line);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            if (!inParagraph) {
                processedLines.push('<p>');
                inParagraph = true;
            }
            processedLines.push(line);
        }
    }

    if (inParagraph) processedLines.push('</p>');
    if (inList) processedLines.push('</ul>');

    return processedLines.join('\n');
}

window.copyCode = function(btn) {
    const pre = btn.parentElement;
    const code = pre.querySelector('code');
    if (code) {
        navigator.clipboard.writeText(code.textContent);
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        setTimeout(() => {
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
        }, 2000);
    }
};

function createMessage(content, isUser = false, timestamp = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = isUser ? 'Y' : '🤖';
    messageDiv.appendChild(avatarDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (isUser) {
        contentDiv.textContent = content;
    } else {
        contentDiv.innerHTML = parseMarkdown(content);
    }

    if (timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = timestamp;
        contentDiv.appendChild(timeDiv);
    }

    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

function createTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.id = 'typingIndicator';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = '🤖';
    messageDiv.appendChild(avatarDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    contentDiv.appendChild(typingDiv);
    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}

function autoResizeInput() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveChatsToStorage() {
    localStorage.setItem('studyBuddyChats', JSON.stringify(chats));
}

function loadChatsFromStorage() {
    const saved = localStorage.getItem('studyBuddyChats');
    if (saved) {
        chats = JSON.parse(saved);
    }
}

function getChatTitle(history) {
    if (history.length === 0) return 'New Chat';
    const firstUserMsg = history.find(msg => msg.role === 'user');
    if (firstUserMsg) {
        const title = firstUserMsg.content.substring(0, 40);
        return title.length < firstUserMsg.content.length ? title + '...' : title;
    }
    return 'New Chat';
}

function renderSidebarChats() {
    if (chats.length === 0) {
        chatHistory.innerHTML = `
            <div class="history-placeholder">
                <p>Your conversations will appear here</p>
            </div>
        `;
        return;
    }

    chatHistory.innerHTML = chats.map(chat => `
        <div class="chat-item ${chat.id === activeChatId ? 'active' : ''}" data-id="${chat.id}">
            <span class="chat-item-title">${escapeHtml(chat.title)}</span>
        </div>
    `).join('');

    chatHistory.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            loadChat(item.dataset.id);
        });
    });
}

function saveCurrentChat() {
    if (conversationHistory.length === 0) return;

    const title = getChatTitle(conversationHistory);

    if (activeChatId) {
        const existingChat = chats.find(c => c.id === activeChatId);
        if (existingChat) {
            existingChat.history = [...conversationHistory];
            existingChat.title = title;
            existingChat.timestamp = Date.now();
            saveChatsToStorage();
            renderSidebarChats();
            return;
        }
    }

    const newChat = {
        id: generateId(),
        title: title,
        history: [...conversationHistory],
        timestamp: Date.now()
    };

    chats.unshift(newChat);
    activeChatId = newChat.id;
    saveChatsToStorage();
    renderSidebarChats();
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    activeChatId = chatId;
    conversationHistory = [...chat.history];

    messagesContainer.innerHTML = '';

    chat.history.forEach(msg => {
        const timestamp = getTimestamp();
        const msgEl = createMessage(msg.content, msg.role === 'user', timestamp);
        messagesContainer.appendChild(msgEl);
    });

    scrollToBottom();
    renderSidebarChats();
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    const welcome = document.getElementById('welcomeMessage');
    if (welcome) welcome.remove();

    const timestamp = getTimestamp();
    const userMsgEl = createMessage(message, true, timestamp);
    messagesContainer.appendChild(userMsgEl);

    userInput.value = '';
    charCounter.textContent = '0';
    charCounter.className = 'char-counter';
    autoResizeInput();
    scrollToBottom();

    conversationHistory.push({ role: 'user', content: message });

    const typingIndicator = createTypingIndicator();
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom();

    sendBtn.disabled = true;

    try {
        const response = await puter.ai.chat(
            [
                { role: "system", content: systemPrompt },
                ...conversationHistory
            ],
            { model: "minimax/minimax-m2.7" }
        );

        const reply = response?.message?.content || String(response);

        removeTypingIndicator();

        const botTimestamp = getTimestamp();
        const botMsgEl = createMessage(reply, false, botTimestamp);
        messagesContainer.appendChild(botMsgEl);

        conversationHistory.push({ role: 'assistant', content: reply });

        scrollToBottom();
    } catch (error) {
        removeTypingIndicator();
        const errorMsg = createMessage('Oops! Something went wrong. Please try again.', false, getTimestamp());
        messagesContainer.appendChild(errorMsg);
        console.error('Chat error:', error);
    }

    sendBtn.disabled = false;
}

function resetChat() {
    if (conversationHistory.length > 0) {
        saveCurrentChat();
    }

    messagesContainer.innerHTML = `
        <div class="welcome-message" id="welcomeMessage">
            <div class="welcome-avatar">
                <div class="avatar-gradient"></div>
            </div>
            <h2>Welcome to Study Buddy</h2>
            <p>Hey there, student! 👋 I'm your AI study companion. I can help you with math, science, history, coding, and more. What would you like to learn today?</p>
        </div>
    `;
    conversationHistory = [];
    activeChatId = null;
    charCounter.textContent = '0';
    charCounter.className = 'char-counter';
    userInput.value = '';
    sendBtn.disabled = false;
    autoResizeInput();
    userInput.focus();
    renderSidebarChats();
}

userInput.addEventListener('input', () => {
    const length = userInput.value.length;
    charCounter.textContent = length;

    if (length > 4000) {
        charCounter.className = 'char-counter danger';
    } else if (length > 3000) {
        charCounter.className = 'char-counter warning';
    } else {
        charCounter.className = 'char-counter';
    }

    autoResizeInput();
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);
newChatBtn.addEventListener('click', resetChat);

createParticles();
loadChatsFromStorage();
renderSidebarChats();
userInput.focus();
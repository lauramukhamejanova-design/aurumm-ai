// Netlify serverless function — receives contact requests from the
// "оставить заявку" popup on the site and forwards them to the owner via
// Telegram, the same way chat.js notifies about new bot chats.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID is not configured on the server.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const name = (payload.name || '').toString().trim().slice(0, 100);
  const contact = (payload.contact || '').toString().trim().slice(0, 100);

  if (!contact) {
    return { statusCode: 400, body: 'Contact is required' };
  }

  const text = `Новая заявка с сайта на своего AI-агента!\n\nИмя: ${name || 'не указано'}\nКонтакт: ${contact}`;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: controller.signal
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    console.error('Lead notify failed:', e);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to send notification' })
    };
  } finally {
    clearTimeout(timeout);
  }
};

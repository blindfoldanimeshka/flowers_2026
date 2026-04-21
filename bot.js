require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN не установлен в .env файле');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('Telegram бот запущен...');

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const welcomeMessage = `
Добро пожаловать в бот уведомлений о заказах! 🌸

Ваш Telegram ID: \`${userId}\`

Чтобы получать уведомления о новых заказах:
1. Скопируйте ваш Telegram ID выше
2. Войдите в админ-панель сайта
3. Перейдите в раздел "Профиль"
4. Вставьте ваш Telegram ID в соответствующее поле
5. Сохраните изменения

После этого вы будете получать уведомления о каждом новом заказе!
  `.trim();

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Обработчик команды /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const helpMessage = `
📋 *Доступные команды:*

/start - Начать работу с ботом и узнать свой Telegram ID
/help - Показать это сообщение помощи
/myid - Показать ваш Telegram ID

Ваш Telegram ID: \`${userId}\`
  `.trim();

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Обработчик команды /myid
bot.onText(/\/myid/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  await bot.sendMessage(chatId, `Ваш Telegram ID: \`${userId}\``, { parse_mode: 'Markdown' });
});

// Обработчик всех остальных сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Игнорируем команды, которые уже обработаны
  if (text && text.startsWith('/')) {
    return;
  }

  const responseMessage = `
Этот бот предназначен только для получения уведомлений о новых заказах.

Используйте команду /help для получения информации о доступных командах.
  `.trim();

  await bot.sendMessage(chatId, responseMessage);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('\nОстановка бота...');
  bot.stopPolling();
  process.exit(0);
});

import TelegramBot from 'node-telegram-bot-api';
import { productionLogger } from '@/lib/productionLogger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let bot: TelegramBot | null = null;

function getBot(): TelegramBot | null {
  if (!TELEGRAM_BOT_TOKEN) return null;
  if (bot) return bot;
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
  return bot;
}

interface OrderItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  image: string;
}

interface OrderNotification {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: OrderItem[];
  totalAmount: number;
}

export async function sendOrderNotification(
  telegramId: string,
  order: OrderNotification
): Promise<void> {
  const tgBot = getBot();
  if (!tgBot) {
    productionLogger.warn('Telegram bot не настроен. Пропускаем отправку уведомления.');
    return;
  }

  if (!telegramId) {
    productionLogger.warn('Telegram ID не указан. Пропускаем отправку уведомления.');
    return;
  }

  try {
    const itemsList = order.items
      .map((item, index) =>
        `${index + 1}. ${item.name} - ${item.quantity} шт. × ${item.price} ₽`
      )
      .join('\n');

    const message = `
🆕 *Новый заказ #${order.orderNumber}*

👤 *Клиент:*
Имя: ${order.customer.name}
Телефон: ${order.customer.phone}
${order.customer.email ? `Email: ${order.customer.email}` : ''}

📦 *Позиции заказа:*
${itemsList}

💰 *Итого: ${order.totalAmount} ₽*
    `.trim();

    await tgBot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });

    // Отправка фото всех товаров
    if (order.items.length > 0) {
      for (const item of order.items) {
        if (item.image) {
          const imageUrl = item.image.startsWith('http')
            ? item.image
            : `${process.env.NEXT_PUBLIC_APP_URL || ''}${item.image}`;

          try {
            await tgBot.sendPhoto(telegramId, imageUrl, {
              caption: `📷 Фото товара: ${item.name}`
            });
          } catch (photoError) {
            productionLogger.error('Ошибка отправки фото в Telegram:', photoError);
          }
        }
      }
    }

    productionLogger.info(`Уведомление о заказе #${order.orderNumber} отправлено в Telegram`);
  } catch (error) {
    productionLogger.error('Ошибка отправки уведомления в Telegram:', error);
    throw error;
  }
}

export async function verifyTelegramAccess(telegramId: string): Promise<boolean> {
  const tgBot = getBot();
  if (!tgBot) {
    return false;
  }

  if (!telegramId) {
    return false;
  }

  try {
    await tgBot.sendMessage(telegramId, 'Доступ к боту подтвержден ✅');
    return true;
  } catch (error) {
    productionLogger.error('Ошибка проверки доступа к Telegram:', error);
    return false;
  }
}
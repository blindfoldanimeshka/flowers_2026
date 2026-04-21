// @ts-ignore
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let bot: TelegramBot | null = null;

if (TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
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
  if (!bot || !TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot не настроен. Пропускаем отправку уведомления.');
    return;
  }

  if (!telegramId) {
    console.warn('Telegram ID не указан. Пропускаем отправку уведомления.');
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

    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });

    // Отправляем фото первого товара, если есть
    if (order.items.length > 0 && order.items[0].image) {
      const imageUrl = order.items[0].image.startsWith('http')
        ? order.items[0].image
        : `${process.env.NEXT_PUBLIC_APP_URL || ''}${order.items[0].image}`;

      try {
        await bot.sendPhoto(telegramId, imageUrl, {
          caption: `Фото товара: ${order.items[0].name}`
        });
      } catch (photoError) {
        console.error('Ошибка отправки фото в Telegram:', photoError);
      }
    }

    console.log(`Уведомление о заказе #${order.orderNumber} отправлено в Telegram`);
  } catch (error) {
    console.error('Ошибка отправки уведомления в Telegram:', error);
    throw error;
  }
}

export async function verifyTelegramAccess(telegramId: string): Promise<boolean> {
  if (!bot || !TELEGRAM_BOT_TOKEN) {
    return false;
  }

  if (!telegramId) {
    return false;
  }

  try {
    await bot.sendMessage(telegramId, 'Доступ к боту подтвержден ✅');
    return true;
  } catch (error) {
    console.error('Ошибка проверки доступа к Telegram:', error);
    return false;
  }
}

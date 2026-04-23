// @ts-ignore
import TelegramBot from 'node-telegram-bot-api';
import { productionLogger } from '@/lib/productionLogger';

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

    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });

    // Отправляем фото всех товаров
    const itemsWithImages = order.items.filter(item => item.image);

    if (itemsWithImages.length > 0) {
      // Если товаров с фото от 2 до 10, отправляем медиа-группой
      if (itemsWithImages.length >= 2 && itemsWithImages.length <= 10) {
        try {
          const mediaGroup = itemsWithImages.map((item, index) => {
            const imageUrl = item.image.startsWith('http')
              ? item.image
              : `${process.env.NEXT_PUBLIC_APP_URL || ''}${item.image}`;

            return {
              type: 'photo' as const,
              media: imageUrl,
              caption: index === 0 ? `${item.name} (${item.quantity} шт.)` : `${item.name} (${item.quantity} шт.)`
            };
          });

          await bot.sendMediaGroup(telegramId, mediaGroup);
        } catch (photoError) {
          productionLogger.error('Ошибка отправки медиа-группы в Telegram:', photoError);
        }
      } else {
        // Если товар один или больше 10, отправляем по одному
        for (const item of itemsWithImages) {
          const imageUrl = item.image.startsWith('http')
            ? item.image
            : `${process.env.NEXT_PUBLIC_APP_URL || ''}${item.image}`;

          try {
            await bot.sendPhoto(telegramId, imageUrl, {
              caption: `${item.name} (${item.quantity} шт.)`
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
    productionLogger.error('Ошибка проверки доступа к Telegram:', error);
    return false;
  }
}
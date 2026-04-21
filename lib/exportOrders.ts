import * as XLSX from 'xlsx';

interface ExportOrder {
  _id: string | number;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
}

export function exportOrdersToExcel(orders: ExportOrder[]) {
  // Подготовка данных для экспорта
  const exportData = orders.map((order, index) => {
    const itemsList = order.items
      .map(item => `${item.name} (${item.quantity} шт. × ${item.price} ₽)`)
      .join(', ');

    const orderDate = new Date(order.createdAt);
    const formattedDate = orderDate.toLocaleDateString('ru-RU');
    const formattedTime = orderDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      '№': index + 1,
      'Номер заказа': order.orderNumber,
      'Дата': formattedDate,
      'Время': formattedTime,
      'Товары': itemsList,
      'Сумма (₽)': order.totalAmount,
    };
  });

  // Создание рабочей книги
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Настройка ширины колонок
  const colWidths = [
    { wch: 5 },   // №
    { wch: 15 },  // Номер заказа
    { wch: 12 },  // Дата
    { wch: 8 },   // Время
    { wch: 60 },  // Товары
    { wch: 12 },  // Сумма
  ];
  ws['!cols'] = colWidths;

  // Стилизация заголовков
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true, sz: 12 },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Добавление листа в книгу
  XLSX.utils.book_append_sheet(wb, ws, 'Заказы');

  // Генерация имени файла с датой
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fileName = `Заказы_${dateStr}.xlsx`;

  // Экспорт файла
  XLSX.writeFile(wb, fileName);
}

// Моковые данные заказов для админ-панели
export const mockOrders = [
  {
    id: 1,
    customer: "Иван Иванов",
    items: [
      { name: "Роза", quantity: 3 },
      { name: "Тюльпан", quantity: 5 }
    ],
    total: 1200,
    status: "Ожидает",
    date: "2024-06-01"
  },
  {
    id: 2,
    customer: "Мария Петрова",
    items: [
      { name: "Лилия", quantity: 2 }
    ],
    total: 800,
    status: "Выполнен",
    date: "2024-06-02"
  },
  {
    id: 3,
    customer: "Алексей Смирнов",
    items: [
      { name: "Гербера", quantity: 7 }
    ],
    total: 2100,
    status: "Ожидает",
    date: "2024-06-03"
  }
]; 
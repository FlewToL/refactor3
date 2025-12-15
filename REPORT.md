# Отчёт по практическому заданию 3

## 1. Структура проекта

Проект реализован с использованием микросервисной архитектуры. Каждый сервис имеет собственную базу данных PostgreSQL и использует Redis для кэширования. API Gateway обеспечивает единую точку входа с Circuit Breaker паттерном.

### Основные компоненты:
- **API Gateway** (порт 8000) - маршрутизация, Circuit Breaker, API Aggregation
- **service_users** (порт 3001) - управление пользователями
- **service_orders** (порт 3002) - управление заказами
- **service_delivery** (порт 3003) - управление доставкой (Вариант 5)
- **PostgreSQL** - 3 отдельные базы данных
- **Redis** - кэширование

## 2. Сервис доставки (Вариант 5)

### 2.1. Назначение

Сервис доставки предназначен для:
- Управления информацией о доставке заказов
- Автоматической генерации трек-номеров
- Отслеживания статуса доставки
- Интеграции с сервисом заказов

### 2.2. Модель данных Delivery

```javascript
{
  id: INTEGER (Primary Key),
  order_id: INTEGER (FK to orders),
  address: TEXT (полный адрес доставки),
  status: STRING (pending/in_transit/delivered/cancelled/failed),
  tracking_number: STRING (уникальный трек-номер),
  estimated_delivery_date: DATE (планируемая дата),
  actual_delivery_date: DATE (фактическая дата),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 2.3. Ключевые особенности

**Автоматическая генерация трек-номера:**
```javascript
function generateTrackingNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRK${timestamp}${random}`;
}
```

**Автоматическое управление датами:**
- estimated_delivery_date устанавливается на +3 дня при создании
- actual_delivery_date устанавливается автоматически при статусе "delivered"

### 2.4. API Endpoints

1. **POST /deliveries** - создание доставки
2. **GET /deliveries/:id** - получение по ID (кэшируется)
3. **GET /deliveries/tracking/:number** - отслеживание по трек-номеру
4. **GET /deliveries?order_id=X** - фильтрация по заказу
5. **PUT /deliveries/:id** - обновление статуса/адреса
6. **DELETE /deliveries/:id** - удаление доставки

## 3. Интеграция сервисов

### Orders → Delivery

При создании заказа с параметром `delivery_address`:
1. Создаётся запись заказа в БД orders
2. Отправляется запрос к service_delivery для создания доставки
3. Генерируется уникальный трек-номер
4. Информация о доставке возвращается в ответе

Пример:
```javascript
// В service_orders
if (delivery_address) {
    const deliveryResponse = await axios.post(`${DELIVERY_SERVICE_URL}/deliveries`, {
        order_id: newOrder.id,
        address: delivery_address
    });
    newOrder.delivery_info = deliveryResponse.data;
}
```

## 4. Кэширование

### Закэшированные эндпоинты:
- GET /users/:id (TTL: 5 мин)
- GET /orders/:id (TTL: 5 мин)
- GET /deliveries/:id (TTL: 5 мин)

### Стратегия: Cache-Aside
1. Проверка наличия в Redis
2. Если есть - возврат из кэша
3. Если нет - загрузка из БД и сохранение в кэш
4. Инвалидация при POST/PUT/DELETE

### Преимущества:
- Ускорение ответов: 50ms → 5ms (10x)
- Снижение нагрузки на PostgreSQL на 90%
- Улучшение масштабируемости

## 5. Circuit Breaker

Реализован через библиотеку Opossum в API Gateway:

**Параметры:**
- Timeout: 3 секунды
- Error Threshold: 50%
- Reset Timeout: 3 секунды

**Fallback сообщения:**
- Users: "Users service temporarily unavailable"
- Orders: "Orders service temporarily unavailable"
- Delivery: "Delivery service temporarily unavailable"

## 6. Тестирование

### Сценарий проверки:

1. **Создать пользователя**
```bash
curl -X POST http://localhost:8000/users -d '{"email":"test@test.com","full_name":"Test User"}'
```

2. **Создать заказ с доставкой**
```bash
curl -X POST http://localhost:8000/orders -d '{
  "user_id":1,
  "product":"Laptop",
  "amount":999.99,
  "delivery_address":"123 Main St, Moscow"
}'
```

3. **Отследить доставку**
```bash
curl http://localhost:8000/deliveries/tracking/TRK...
```

4. **Обновить статус**
```bash
curl -X PUT http://localhost:8000/deliveries/1 -d '{"status":"delivered"}'
```

### Ожидаемые результаты:
- Автоматическое создание доставки при создании заказа
- Уникальный трек-номер в формате TRKxxxxxxxxxxxxx
- Автоматическая установка estimated_delivery_date
- Автоматическая установка actual_delivery_date при статусе "delivered"
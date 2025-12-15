# Microservices Refactoring Project - Variant 5

Проект рефакторинга монолитной архитектуры в микросервисную с использованием Docker, PostgreSQL и Redis.

## Структура проекта

```
.
├── docker-compose.yml          # Конфигурация всех сервисов
├── api_gateway/                # API Gateway (порт 8000)
│   ├── app/
│   │   └── index.js           # Маршрутизация, Circuit Breaker, API Aggregation
│   ├── Dockerfile
│   └── package.json
├── service_users/              # Сервис пользователей (порт 3001)
│   ├── app/
│   │   ├── index.js           # Основной файл сервиса
│   │   ├── models.js          # Модель User
│   │   ├── database.js        # Подключение к PostgreSQL
│   │   └── redis_client.js    # Подключение к Redis
│   ├── Dockerfile
│   └── package.json
├── service_orders/             # Сервис заказов (порт 3002)
│   ├── app/
│   │   ├── index.js           # Основной файл сервиса
│   │   ├── models.js          # Модель Order
│   │   ├── database.js        # Подключение к PostgreSQL
│   │   └── redis_client.js    # Подключение к Redis
│   ├── Dockerfile
│   └── package.json
└── service_delivery/           # Сервис доставки (порт 3003) - ВАРИАНТ 5
    ├── app/
    │   ├── index.js           # Основной файл сервиса
    │   ├── models.js          # Модель Delivery
    │   ├── database.js        # Подключение к PostgreSQL
    │   └── redis_client.js    # Подключение к Redis
    ├── Dockerfile
    └── package.json
```

## Технологии

- **Node.js 18** - основная платформа
- **Express.js** - веб-фреймворк
- **PostgreSQL 17** - реляционная СУБД (отдельная БД для каждого сервиса)
- **Redis 7** - кэширование
- **Sequelize** - ORM для работы с PostgreSQL
- **Docker & Docker Compose** - контейнеризация
- **Opossum** - Circuit Breaker pattern
- **Morgan** - логирование HTTP запросов

## Как запустить проект

### Требования

- Docker
- Docker Compose

### Запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/FlewToL/refactor3.git
cd Debug
```

2. Запустите все сервисы:
```bash
docker compose up --build
```

3. Дождитесь запуска всех сервисов. В логах вы увидите:
```
api_gateway_1         | API Gateway running on port 8000
service_users_1       | Users service running on port 3001
service_orders_1      | Orders service running on port 3002
service_delivery_1    | Delivery service running on port 3003
```

4. Проверьте работоспособность:
```bash
curl http://localhost:8000/health
```

### Остановка

```bash
docker compose down
```

### Полная очистка (включая данные БД)

```bash
docker compose down -v
```

**⚠️ ВНИМАНИЕ:** Команда `docker compose down -v` удалит все данные из баз данных!

## API Endpoints

Все запросы идут через API Gateway на порту 8000.

### Users Service

- **POST /users** - Создать пользователя
  ```bash
  curl -X POST http://localhost:8000/users \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "full_name": "Test User"}'
  ```

- **GET /users** - Получить всех пользователей
  ```bash
  curl http://localhost:8000/users
  ```

- **GET /users/:id** - Получить пользователя по ID (кэшируется)
  ```bash
  curl http://localhost:8000/users/1
  ```

- **PUT /users/:id** - Обновить пользователя
  ```bash
  curl -X PUT http://localhost:8000/users/1 \
    -H "Content-Type: application/json" \
    -d '{"full_name": "Updated Name"}'
  ```

- **DELETE /users/:id** - Удалить пользователя
  ```bash
  curl -X DELETE http://localhost:8000/users/1
  ```

### Orders Service

- **POST /orders** - Создать заказ (автоматически создает доставку)
  ```bash
  curl -X POST http://localhost:8000/orders \
    -H "Content-Type: application/json" \
    -d '{
      "user_id": 1,
      "product": "Laptop",
      "amount": 999.99,
      "status": "pending",
      "delivery_address": "123 Main St, Moscow, Russia"
    }'
  ```

- **GET /orders** - Получить все заказы
  ```bash
  curl http://localhost:8000/orders
  ```

- **GET /orders?user_id=:id** - Получить заказы пользователя
  ```bash
  curl http://localhost:8000/orders?user_id=1
  ```

- **GET /orders/:id** - Получить заказ по ID (кэшируется)
  ```bash
  curl http://localhost:8000/orders/1
  ```

- **PUT /orders/:id** - Обновить заказ
  ```bash
  curl -X PUT http://localhost:8000/orders/1 \
    -H "Content-Type: application/json" \
    -d '{"status": "completed"}'
  ```

- **DELETE /orders/:id** - Удалить заказ
  ```bash
  curl -X DELETE http://localhost:8000/orders/1
  ```

### Delivery Service (Вариант 5)

- **POST /deliveries** - Создать доставку (автоматически генерируется трек-номер)
  ```bash
  curl -X POST http://localhost:8000/deliveries \
    -H "Content-Type: application/json" \
    -d '{
      "order_id": 1,
      "address": "123 Main St, Moscow, Russia",
      "status": "pending"
    }'
  ```

- **GET /deliveries** - Получить все доставки
  ```bash
  curl http://localhost:8000/deliveries
  ```

- **GET /deliveries?order_id=:id** - Получить доставки для заказа
  ```bash
  curl http://localhost:8000/deliveries?order_id=1
  ```

- **GET /deliveries/:id** - Получить доставку по ID (кэшируется)
  ```bash
  curl http://localhost:8000/deliveries/1
  ```

- **GET /deliveries/tracking/:trackingNumber** - Отследить доставку по трек-номеру
  ```bash
  curl http://localhost:8000/deliveries/tracking/TRK1702988400001234
  ```

- **PUT /deliveries/:id** - Обновить доставку (статус, адрес, даты)
  ```bash
  curl -X PUT http://localhost:8000/deliveries/1 \
    -H "Content-Type: application/json" \
    -d '{"status": "delivered"}'
  ```

- **DELETE /deliveries/:id** - Удалить доставку
  ```bash
  curl -X DELETE http://localhost:8000/deliveries/1
  ```

### API Aggregation

- **GET /users/:id/details** - Получить пользователя с его заказами
  ```bash
  curl http://localhost:8000/users/1/details
  ```
  
  Ответ:
  ```json
  {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "full_name": "Test User",
      "createdAt": "2025-12-15T...",
      "updatedAt": "2025-12-15T..."
    },
    "orders": [
      {
        "id": 1,
        "user_id": 1,
        "product": "Laptop",
        "amount": "999.99",
        "status": "pending",
        "createdAt": "2025-12-15T...",
        "updatedAt": "2025-12-15T..."
      }
    ]
  }
  ```

### Health & Status

- **GET /health** - Проверить состояние API Gateway и Circuit Breakers
  ```bash
  curl http://localhost:8000/health
  ```

- **GET /status** - Проверить статус API Gateway
  ```bash
  curl http://localhost:8000/status
  ```

## Сценарий проверки для преподавателя

### 1. Создание пользователя

```bash
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "student@university.edu", "full_name": "Student Name"}'
```

Ожидаемый ответ: JSON с созданным пользователем и id=1

### 2. Создание заказа с доставкой

```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "product": "Laptop",
    "amount": 999.99,
    "status": "pending",
    "delivery_address": "123 Main St, Moscow, Russia"
  }'
```

Ожидаемый ответ: JSON с созданным заказом и информацией о доставке (tracking_number)

### 3. Проверка автоматического создания доставки

```bash
curl http://localhost:8000/deliveries?order_id=1
```

Ожидаемый результат: массив с одной доставкой для заказа #1 с автоматически сгенерированным трек-номером

### 4. Отслеживание доставки по трек-номеру

Используйте трек-номер из предыдущего ответа:
```bash
curl http://localhost:8000/deliveries/tracking/TRK1702988400001234
```

Ожидаемый результат: информация о доставке с адресом, статусом и датами

### 5. Обновление статуса доставки

```bash
curl -X PUT http://localhost:8000/deliveries/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "in_transit"}'
```

Затем проверьте обновление:
```bash
curl http://localhost:8000/deliveries/1
```

### 6. Получение пользователя с заказами (API Aggregation)

```bash
curl http://localhost:8000/users/1/details
```

Ожидаемый ответ: JSON с информацией о пользователе и массивом его заказов

### 7. Проверка кэширования

Первый запрос (cache miss):
```bash
curl http://localhost:8000/users/1
```

Второй запрос (cache hit - должен быть быстрее):
```bash
curl http://localhost:8000/users/1
```

Смотрите логи контейнера service_users:
```bash
docker compose logs service_users
```

Вы увидите:
- `Cache miss for user 1` - при первом запросе
- `Cache hit for user 1` - при втором запросе

### 8. Проверка персистентности данных

Остановите контейнеры:
```bash
docker compose down
```

Запустите снова:
```bash
docker compose up
```

Проверьте, что данные сохранились:
```bash
curl http://localhost:8000/users/1
curl http://localhost:8000/orders/1
curl http://localhost:8000/deliveries/1
```

Данные должны быть доступны (в отличие от старой реализации с хранением в памяти)

### 9. Проверка Circuit Breaker

Остановите сервис users:
```bash
docker compose stop service_users
```

Попробуйте получить пользователя:
```bash
curl http://localhost:8000/users/1
```

Ожидаемый ответ: `{"error":"Users service temporarily unavailable"}`

Проверьте состояние Circuit Breaker:
```bash
curl http://localhost:8000/health
```

Запустите сервис обратно:
```bash
docker compose start service_users
```

## Кэширование

Кэшируются следующие эндпоинты с TTL 5 минут:

1. **GET /users/:id** - информация о пользователе
2. **GET /orders/:id** - информация о заказе
3. **GET /deliveries/:id** - информация о доставке

### Стратегия кэширования (Cache-Aside)

1. При GET запросе:
   - Проверяется наличие данных в Redis
   - Если есть - возвращаются из кэша
   - Если нет - загружаются из БД и сохраняются в кэш

2. При POST/PUT/DELETE:
   - Соответствующий ключ удаляется из кэша
   - При следующем GET данные будут загружены из БД

### Почему эти эндпоинты?

- Запросы по ID - самые частые операции чтения
- Данные пользователей, заказов и доставок меняются нечасто
- Уменьшается нагрузка на PostgreSQL
- Ускоряется время ответа API

## Модели данных

### User (service_users)

```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  email: STRING (Unique, Not Null),
  full_name: STRING (Not Null),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Order (service_orders)

```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  user_id: INTEGER (Foreign Key, Not Null),
  product: STRING (Not Null),
  amount: DECIMAL(10,2) (Default: 0.00),
  status: STRING (Default: 'pending'),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Delivery (service_delivery) - Вариант 5

```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  order_id: INTEGER (Foreign Key, Not Null),
  address: TEXT (Not Null),
  status: STRING (Default: 'pending', Values: pending/in_transit/delivered/cancelled/failed),
  tracking_number: STRING (Unique, Not Null, Auto-generated),
  estimated_delivery_date: DATE (Auto: +3 days),
  actual_delivery_date: DATE (Null, Set on delivery),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## Интеграция сервисов

### Orders → Delivery

При создании заказа (POST /orders) с параметром `delivery_address`:
1. Создаётся запись в БД orders
2. Сервис orders отправляет POST запрос к service_delivery для создания доставки
3. Автоматически генерируется уникальный трек-номер (TRK + timestamp + random)
4. Автоматически устанавливается estimated_delivery_date (+3 дня от текущей даты)
5. Информация о доставке (tracking_number, estimated_delivery_date) возвращается в ответе

**Пример ответа при создании заказа с доставкой:**
```json
{
  "id": 1,
  "user_id": 1,
  "product": "Laptop",
  "amount": "999.99",
  "status": "pending",
  "delivery_info": {
    "tracking_number": "TRK1702988400001234",
    "estimated_delivery_date": "2025-12-18T12:00:00.000Z"
  },
  "createdAt": "2025-12-15T12:00:00.000Z",
  "updatedAt": "2025-12-15T12:00:00.000Z"
}
```

**Примечание:** В production окружении рекомендуется использовать:
- Транзакции для атомарности операций
- Очереди сообщений (RabbitMQ, Kafka) для асинхронного взаимодействия
- Saga pattern для распределённых транзакций
- Retry механизмы для обработки временных сбоев

## Circuit Breaker

API Gateway использует паттерн Circuit Breaker (библиотека Opossum) для защиты от каскадных сбоев.

### Конфигурация

- **Timeout**: 3 секунды - время ожидания ответа от сервиса
- **Error Threshold**: 50% - порог ошибок для открытия breaker
- **Reset Timeout**: 3 секунды - время до попытки закрыть breaker

### Состояния

- **CLOSED** - нормальная работа, запросы проходят
- **OPEN** - сервис недоступен, запросы блокируются
- **HALF_OPEN** - проверка восстановления сервиса

### Fallback

При открытом Circuit Breaker возвращаются следующие сообщения:
- Users service: `{"error":"Users service temporarily unavailable"}`
- Orders service: `{"error":"Orders service temporarily unavailable"}`
- Delivery service: `{"error":"Delivery service temporarily unavailable"}`

## Особенности реализации Сервиса доставки (Вариант 5)

### Автоматическая генерация трек-номера

При создании доставки автоматически генерируется уникальный трек-номер:
```javascript
function generateTrackingNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRK${timestamp}${random}`;
}
```

Формат: `TRK` + timestamp (миллисекунды) + случайное 4-значное число

Пример: `TRK1702988400001234`

### Автоматическое управление датами

- **estimated_delivery_date**: Автоматически устанавливается на +3 дня от даты создания, если не указана
- **actual_delivery_date**: Автоматически устанавливается при изменении статуса на `delivered`

### Статусы доставки

1. **pending** - Доставка создана, ожидает отправки
2. **in_transit** - Доставка в пути
3. **delivered** - Доставлено (автоматически устанавливается actual_delivery_date)
4. **cancelled** - Доставка отменена
5. **failed** - Доставка не удалась

### Отслеживание по трек-номеру

Пользователи могут отследить свою доставку по трек-номеру без знания ID доставки:
```bash
curl http://localhost:8000/deliveries/tracking/TRK1702988400001234
```

## Рекомендации по миграциям

В текущей реализации используется `sequelize.sync({ alter: true })` для автоматической синхронизации моделей с БД.

**Для production окружения рекомендуется:**

1. Установить sequelize-cli:
```bash
npm install --save-dev sequelize-cli
```

2. Инициализировать миграции:
```bash
npx sequelize-cli init
```

3. Создать миграции вместо sync():
```bash
npx sequelize-cli migration:generate --name create-deliveries-table
```

4. Запускать миграции при деплое:
```bash
npx sequelize-cli db:migrate
```

5. Преимущества миграций:
   - Версионирование схемы БД
   - Откат изменений (rollback)
   - Контроль над структурой БД
   - Безопасность при обновлениях

## Troubleshooting

### Порты уже заняты

Если порты 8000, 3001, 3002, 3003 или 6379 уже используются, измените их в docker-compose.yml:

```yaml
ports:
  - "8001:8000"  # внешний:внутренний
```

### Ошибки подключения к БД

Убедитесь, что контейнеры PostgreSQL запущены:
```bash
docker compose ps
```

Проверьте логи:
```bash
docker compose logs db_users
docker compose logs db_orders
docker compose logs db_delivery
```

### Redis недоступен

Проверьте статус Redis:
```bash
docker compose logs redis
```

### Сервисы не могут связаться друг с другом

Убедитесь, что все сервисы в одной сети:
```bash
docker network ls
docker network inspect debug_app-network
```

## Дополнительная информация

Для более подробной информации о реализации, архитектуре и тестировании см. файл [REPORT.md](./REPORT.md).

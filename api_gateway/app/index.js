const express = require('express');
const cors = require('cors');
const axios = require('axios');
const CircuitBreaker = require('opossum');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8000;

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// адреса сервисов (в docker)
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://service_users:3001';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://service_orders:3002';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://service_delivery:3003';

// конфигурация circuit breaker
const circuitOptions = {
    timeout: 3000, // время ожидания запроса (3 секунды)
    errorThresholdPercentage: 50, // открываем breaker после 50% неудачных запросов
    resetTimeout: 3000, // ожидаем 3 секунды перед попыткой закрыть breaker
};

// создаем breaker для каждой службы
const usersCircuit = new CircuitBreaker(async (url, options = {}) => {
    try {
        const response = await axios({
            url, ...options,
            validateStatus: status => (status >= 200 && status < 300) || status === 404
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return error.response.data;
        }
        throw error;
    }
}, circuitOptions);

const ordersCircuit = new CircuitBreaker(async (url, options = {}) => {
    try {
        const response = await axios({
            url, ...options,
            validateStatus: status => (status >= 200 && status < 300) || status === 404
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return error.response.data;
        }
        throw error;
    }
}, circuitOptions);

const deliveryCircuit = new CircuitBreaker(async (url, options = {}) => {
    try {
        const response = await axios({
            url, ...options,
            validateStatus: status => (status >= 200 && status < 300) || status === 404
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return error.response.data;
        }
        throw error;
    }
}, circuitOptions);

// функции резервирования (fallback functions)
usersCircuit.fallback(() => ({error: 'Users service temporarily unavailable'}));
ordersCircuit.fallback(() => ({error: 'Orders service temporarily unavailable'}));
deliveryCircuit.fallback(() => ({error: 'Delivery service temporarily unavailable'}));

// роутинги для Users с circuit breaker
app.get('/users/:userId', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`);
        if (user.error === 'User not found') {
            res.status(404).json(user);
        } else {
            res.json(user);
        }
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/users', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users`, {
            method: 'POST',
            data: req.body
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await usersCircuit.fire(`${USERS_SERVICE_URL}/users`);
        res.json(users);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.delete('/users/:userId', async (req, res) => {
    try {
        const result = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`, {
            method: 'DELETE'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.put('/users/:userId', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`, {
            method: 'PUT',
            data: req.body
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

// роутинги для Orders с circuit breaker
app.get('/orders/:orderId', async (req, res) => {
    try {
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/${req.params.orderId}`);
        if (order.error === 'Order not found') {
            res.status(404).json(order);
        } else {
            res.json(order);
        }
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/orders', async (req, res) => {
    try {
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders`, {
            method: 'POST',
            data: req.body
        });
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/orders', async (req, res) => {
    try {
        let url = `${ORDERS_SERVICE_URL}/orders`;
        if (req.query.user_id) {
            url += `?user_id=${req.query.user_id}`;
        }
        const orders = await ordersCircuit.fire(url);
        res.json(orders);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.delete('/orders/:orderId', async (req, res) => {
    try {
        const result = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/${req.params.orderId}`, {
            method: 'DELETE'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.put('/orders/:orderId', async (req, res) => {
    try {
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders/${req.params.orderId}`, {
            method: 'PUT',
            data: req.body
        });
        res.json(order);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

// роутинги для Warehouse с circuit breaker
// роутинги для Delivery с circuit breaker
app.post('/deliveries', async (req, res) => {
    try {
        const delivery = await deliveryCircuit.fire(`${DELIVERY_SERVICE_URL}/deliveries`, {
            method: 'POST',
            data: req.body
        });
        res.status(201).json(delivery);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/deliveries/:id', async (req, res) => {
    try {
        const delivery = await deliveryCircuit.fire(`${DELIVERY_SERVICE_URL}/deliveries/${req.params.id}`);
        if (delivery.error) {
            res.status(404).json(delivery);
        } else {
            res.json(delivery);
        }
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/deliveries', async (req, res) => {
    try {
        let url = `${DELIVERY_SERVICE_URL}/deliveries`;
        if (req.query.order_id) {
            url += `?order_id=${req.query.order_id}`;
        }
        const deliveries = await deliveryCircuit.fire(url);
        res.json(deliveries);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/deliveries/tracking/:trackingNumber', async (req, res) => {
    try {
        const delivery = await deliveryCircuit.fire(`${DELIVERY_SERVICE_URL}/deliveries/tracking/${req.params.trackingNumber}`);
        if (delivery.error) {
            res.status(404).json(delivery);
        } else {
            res.json(delivery);
        }
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.put('/deliveries/:id', async (req, res) => {
    try {
        const delivery = await deliveryCircuit.fire(`${DELIVERY_SERVICE_URL}/deliveries/${req.params.id}`, {
            method: 'PUT',
            data: req.body
        });
        res.json(delivery);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.delete('/deliveries/:id', async (req, res) => {
    try {
        const result = await deliveryCircuit.fire(`${DELIVERY_SERVICE_URL}/deliveries/${req.params.id}`, {
            method: 'DELETE'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

// gateway aggregation: получение сведений о пользователе с его заказами
app.get('/users/:userId/details', async (req, res) => {
    try {
        const userId = req.params.userId;

        // получение сведений о пользователе
        const userPromise = usersCircuit.fire(`${USERS_SERVICE_URL}/users/${userId}`);

        // получение заказов пользователя
        const ordersPromise = ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders?user_id=${userId}`);

        // ожидание завершения обоих запросов
        const [user, userOrders] = await Promise.all([userPromise, ordersPromise]);

        // если пользователь не найден, возвращаем 404
        if (user.error === 'User not found') {
            return res.status(404).json(user);
        }

        // возвращаем агрегированный ответ
        res.json({
            user,
            orders: userOrders
        });
    } catch (error) {
        res.status(500).json({error: 'Internal server error'});
    }
});

// эндпоинт проверки состояния, показывающий статус circuit breaker
app.get('/health', (req, res) => {
    res.json({
        status: 'API Gateway is running',
        circuits: {
            users: {
                status: usersCircuit.status,
                stats: usersCircuit.stats
            },
            orders: {
                status: ordersCircuit.status,
                stats: ordersCircuit.stats
            },
            delivery: {
                status: deliveryCircuit.status,
                stats: deliveryCircuit.stats
            }
        }
    });
});

app.get('/status', (req, res) => {
    res.json({status: 'API Gateway is running'});
});

// запуск сервера
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);

    // логируем события circuit breaker для мониторинга
    usersCircuit.on('open', () => console.log('Users circuit breaker opened'));
    usersCircuit.on('close', () => console.log('Users circuit breaker closed'));
    usersCircuit.on('halfOpen', () => console.log('Users circuit breaker half-open'));

    ordersCircuit.on('open', () => console.log('Orders circuit breaker opened'));
    ordersCircuit.on('close', () => console.log('Orders circuit breaker closed'));
    ordersCircuit.on('halfOpen', () => console.log('Orders circuit breaker half-open'));

    deliveryCircuit.on('open', () => console.log('Delivery circuit breaker opened'));
    deliveryCircuit.on('close', () => console.log('Delivery circuit breaker closed'));
    deliveryCircuit.on('halfOpen', () => console.log('Delivery circuit breaker half-open'));
});

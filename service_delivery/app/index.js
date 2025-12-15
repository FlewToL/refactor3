const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./database');
const { connectRedis, redisClient } = require('./redis_client');
const { Delivery } = require('./models');

const app = express();
const PORT = process.env.PORT || 3003;

// middleware
app.use(cors());
app.use(express.json());

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

// Initialize database and Redis
async function initialize() {
    try {
        await connectDatabase();
        await connectRedis();
        console.log('All connections initialized successfully');
    } catch (error) {
        console.error('Failed to initialize connections:', error);
        process.exit(1);
    }
}

// Helper function to get cache key
function getCacheKey(deliveryId) {
    return `delivery:${deliveryId}`;
}

// Helper function to generate tracking number
function generateTrackingNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRK${timestamp}${random}`;
}

// GET all deliveries with optional filter by order_id
app.get('/deliveries', async (req, res) => {
    try {
        const orderId = req.query.order_id ? parseInt(req.query.order_id) : null;
        
        let deliveries;
        if (orderId) {
            deliveries = await Delivery.findAll({
                where: { order_id: orderId }
            });
        } else {
            deliveries = await Delivery.findAll();
        }
        
        res.json(deliveries);
    } catch (error) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create delivery
app.post('/deliveries', async (req, res) => {
    try {
        const { order_id, address, status, estimated_delivery_date } = req.body;

        if (!order_id || !address) {
            return res.status(400).json({ error: 'order_id and address are required' });
        }

        // Automatically generate tracking number
        const trackingNumber = generateTrackingNumber();

        // Calculate estimated delivery date (3 days from now if not provided)
        let estimatedDate = estimated_delivery_date;
        if (!estimatedDate) {
            const date = new Date();
            date.setDate(date.getDate() + 3);
            estimatedDate = date;
        }

        const newDelivery = await Delivery.create({
            order_id,
            address,
            status: status || 'pending',
            tracking_number: trackingNumber,
            estimated_delivery_date: estimatedDate
        });

        // Invalidate cache for this delivery (if it exists)
        const cacheKey = getCacheKey(newDelivery.id);
        await redisClient.del(cacheKey);

        res.status(201).json(newDelivery);
    } catch (error) {
        console.error('Error creating delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET delivery by ID (with caching)
app.get('/deliveries/:id', async (req, res) => {
    try {
        const deliveryId = parseInt(req.params.id);
        const cacheKey = getCacheKey(deliveryId);

        // Try to get from cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for delivery ${deliveryId}`);
            return res.json(JSON.parse(cachedData));
        }

        console.log(`Cache miss for delivery ${deliveryId}`);
        
        // If not in cache, get from database
        const delivery = await Delivery.findByPk(deliveryId);

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Store in cache with TTL
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(delivery));

        res.json(delivery);
    } catch (error) {
        console.error('Error fetching delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET delivery by tracking number
app.get('/deliveries/tracking/:trackingNumber', async (req, res) => {
    try {
        const trackingNumber = req.params.trackingNumber;

        const delivery = await Delivery.findOne({
            where: { tracking_number: trackingNumber }
        });

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        res.json(delivery);
    } catch (error) {
        console.error('Error fetching delivery by tracking number:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update delivery
app.put('/deliveries/:id', async (req, res) => {
    try {
        const deliveryId = parseInt(req.params.id);
        const { address, status, estimated_delivery_date, actual_delivery_date } = req.body;

        const delivery = await Delivery.findByPk(deliveryId);

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Update delivery
        if (address) delivery.address = address;
        if (status) {
            delivery.status = status;
            // If status is delivered, set actual delivery date
            if (status === 'delivered' && !delivery.actual_delivery_date) {
                delivery.actual_delivery_date = new Date();
            }
        }
        if (estimated_delivery_date) delivery.estimated_delivery_date = estimated_delivery_date;
        if (actual_delivery_date) delivery.actual_delivery_date = actual_delivery_date;

        await delivery.save();

        // Invalidate cache
        const cacheKey = getCacheKey(deliveryId);
        await redisClient.del(cacheKey);

        res.json(delivery);
    } catch (error) {
        console.error('Error updating delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE delivery
app.delete('/deliveries/:id', async (req, res) => {
    try {
        const deliveryId = parseInt(req.params.id);

        const delivery = await Delivery.findByPk(deliveryId);

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        const deletedDelivery = delivery.toJSON();
        await delivery.destroy();

        // Invalidate cache
        const cacheKey = getCacheKey(deliveryId);
        await redisClient.del(cacheKey);

        res.json({ message: 'Delivery deleted', deletedDelivery });
    } catch (error) {
        console.error('Error deleting delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Status endpoint
app.get('/deliveries/status/service', (req, res) => {
    res.json({ status: 'Delivery service is running' });
});

// Health check endpoint
app.get('/deliveries/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Delivery Service',
        timestamp: new Date().toISOString()
    });
});

// Start server
initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`Delivery service running on port ${PORT}`);
    });
});

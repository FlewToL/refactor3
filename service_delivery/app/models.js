const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Delivery = sequelize.define('Delivery', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'in_transit', 'delivered', 'cancelled', 'failed']]
        }
    },
    tracking_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    estimated_delivery_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    actual_delivery_date: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'deliveries',
    timestamps: true
});

module.exports = { Delivery };

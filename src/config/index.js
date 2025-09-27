// src/config/index.js
require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    db: {
        uri: process.env.DB_URI || 'mongodb://localhost:27017/bloocube',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
    // Add other configuration settings as needed
};

module.exports = config;
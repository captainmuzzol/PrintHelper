const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const printQueueManager = require('./services/printQueue');

// Routes
const printerRoutes = require('./routes/printerRoutes');
const printRoutes = require('./routes/printRoutes');
const mergeRoutes = require('./routes/mergeRoutes');

const app = express();

// Initialize Services
printQueueManager.initialize();

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: '1d' }));

// API Routes
app.use('/api', printerRoutes);
app.use('/api', printRoutes);
app.use('/api', mergeRoutes);

module.exports = app;

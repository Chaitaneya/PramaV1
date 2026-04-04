const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR] Uncaught Exception:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Ensure base uploads dir exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  })
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/cases', require('./routes/cases'));
app.use('/api/cases/:caseId/sessions', require('./routes/sessions'));
app.use('/api/cases/:caseId/stitch',   require('./routes/stitch'));
app.use('/api/cases/:caseId/uploads', require('./routes/uploads'));
app.use('/api/cases/:caseId/share',    require('./routes/sharing'));
app.use('/api/cases/:caseId/export',   require('./routes/export'));
app.use('/api/share',                  require('./routes/shareAccess'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong on the server' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

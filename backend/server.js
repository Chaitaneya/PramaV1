const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/cases', require('./routes/cases'));
app.use('/api/cases/:caseId/sessions', require('./routes/sessions'));
app.use('/api/cases/:caseId/stitch',   require('./routes/stitch'));
app.use('/api/cases/:caseId/uploads',  require('./routes/uploads'));
app.use('/api/cases/:caseId/share',    require('./routes/sharing'));
app.use('/api/cases/:caseId/export',   require('./routes/export'));
app.use('/api/share',                  require('./routes/shareAccess'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
app.use('/api/cases/:caseId/stitch', require('./routes/stitch'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

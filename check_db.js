const mongoose = require('mongoose');
const Session = require('./backend/models/Session');
require('dotenv').config({path: './backend/.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const sessions = await Session.find({ caseId: 'hello' });
  console.log(JSON.stringify(sessions, null, 2));
  process.exit();
}).catch(console.error);

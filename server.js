require("dotenv").config();
const express = require("express");
const leaveUpdater = require('./cron/leaveUpdater.js')

const connectDB = require("./config/db.js");

const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const leaveRoutes = require('./routes/leaves.js');
const holidayRoutes = require('./routes/holidays.js');

const app = express();
app.use(express.json());

connectDB();

leaveUpdater();

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/leaves', leaveRoutes);
app.use('/holidays', holidayRoutes);

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
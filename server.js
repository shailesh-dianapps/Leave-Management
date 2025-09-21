require("dotenv").config();
const express = require("express");
const cron = require("node-cron");
const User = require('./models/user.js');

const connectDB = require("./config/db.js");

const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const leaveRoutes = require('./routes/leaves.js');
const holidayRoutes = require('./routes/holidays.js');

const app = express();
app.use(express.json());

connectDB();

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/leaves', leaveRoutes);
app.use('/holidays', holidayRoutes);

// Cron job: 1st of every month at midnight
cron.schedule("0 0 1 * *", async () => {
    try {
        console.log("Running monthly leave balance update...");
        const result = await User.updateMany(
            {role: {$in: ["employee", "hr"]}}, 
            {$inc: {leaveBalance: 2}} 
        );
        console.log(`Leave balance updated for ${result.modifiedCount} users.`);
    }
    catch(err){
        console.error("Error updating leave balance:", err.message);
    }
});

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
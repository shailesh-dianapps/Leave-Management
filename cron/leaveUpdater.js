const cron = require('node-cron') 
const User = require('../models/user');

/**
    Schedule: Run at 12:00 AM on 1st day of every month
    Cron job: 1st of every month at midnight
    Format: minute hour day-of-month month day-of-week
    0 minute
    0 hour
    1 → the 1st day of the month
    * any month
    * any day of the week
 */

function leaveUpdater() {
    cron.schedule("0 0 1 * *", async () => {
        try{
            console.log("Running monthly leave balance update...");
            const result = await User.updateMany(
                {role: {$in: ["employee", "hr"]}},
                {$inc: {leaveBalance: 2}}
            );
            console.log('Leave balance updated');
        } 
        catch(err){
            console.error("Error updating leave balance:", err.message);
        }
    })
}

module.exports = leaveUpdater;

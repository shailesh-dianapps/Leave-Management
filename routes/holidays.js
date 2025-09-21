const express = require('express');
const {auth, permit} = require('../middleware/auth');
const {addHoliday, getHolidays, updateHoliday, deleteHoliday} = require('../controllers/holidayController');

const router = express.Router();

// all emp, hr, management can see public holiday
router.get('/', auth, getHolidays);

// only hr can add, delete, update public holiday
router.post('/', auth, permit('hr'), addHoliday);
router.put('/:id', auth, permit('hr'), updateHoliday);
router.delete('/:id', auth, permit('hr'), deleteHoliday);

module.exports = router;



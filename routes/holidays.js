const express = require('express');
const {auth, permit} = require('../middleware/auth');
const {addHoliday, getHolidays, updateHoliday, deleteHoliday} = require('../controllers/holidayController');

const router = express.Router();

router.post('/', auth, permit('hr'), addHoliday);
router.get('/', auth, getHolidays);
router.put('/:id', auth, permit('hr'), updateHoliday);
router.delete('/:id', auth, permit('hr'), deleteHoliday);

module.exports = router;



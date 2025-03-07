const express = require('express');
const router = express.Router();

const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const { proofOfCommission} = require('../controllers/commissionController');

router.post('/proof', isAuthenticatedUser, authorizeRoles('auctioneer'), proofOfCommission);


module.exports = router;
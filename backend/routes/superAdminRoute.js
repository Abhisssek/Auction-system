const express = require('express');
const router = express.Router();

const { deleteAuctionItem, updateProofStatus, getAllPaymentProofs, getPaymentProofDetails, deletePaymentProof, fetchAllUsers, monthlyRevenue } = require('../controllers/superAdminController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');


router.delete('/auction/delete/:id',isAuthenticatedUser, authorizeRoles('admin'), deleteAuctionItem);
router.put('/paymentproof/status/update/:id',isAuthenticatedUser, authorizeRoles('admin'), updateProofStatus);
router.get('/paymentproofs',isAuthenticatedUser, authorizeRoles('admin'), getAllPaymentProofs);
router.get('/paymentproof/:id',isAuthenticatedUser, authorizeRoles('admin'), getPaymentProofDetails);
router.delete('/paymentproof/delete/:id',isAuthenticatedUser, authorizeRoles('admin'), deletePaymentProof);
router.get('/allusers',isAuthenticatedUser, authorizeRoles('admin'), fetchAllUsers);
router.get('/monthly-revenue',isAuthenticatedUser, authorizeRoles('admin'), monthlyRevenue);




module.exports = router;
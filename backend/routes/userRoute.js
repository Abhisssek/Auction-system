const  {register, login, logout, updateUserProfile, updatePassword}  = require('../controllers/userController');

const express = require('express');
const route = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const { getUserProfile, getAllUsers } = require("../controllers/userController");


route.post('/register', register);
route.post('/login', login);
route.get('/logout', logout);
route.get('/profile', isAuthenticatedUser, getUserProfile);
// route.get('/admin/users', isAuthenticatedUser, authorizeRoles('admin'), getAllUsers);
route.put('/profile/update', isAuthenticatedUser, updateUserProfile);
route.put('/password/update', isAuthenticatedUser, updatePassword);


module.exports = route;

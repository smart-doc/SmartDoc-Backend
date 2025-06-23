const express = require("express");
const {updateUserProfile, getUserProfile, getAllProfiles, getSignedinUserProfile, getDoctors, getHospitals, getPatients} = require("../controllers/userProfileController");
const { protectRoute } = require("../middlewares/protectRoute.js");
const router = express.Router();
// const authorize = require('../middlewares/roleCheckMiddleware.js');


router.get("/profile/get/allProfiles"/*, authorize(['Admin'])*/, protectRoute, getAllProfiles);
router.get("/profile/get/SignedinUserProfile", protectRoute, /*authorize(['Admin', `Patient`, `Doctor`, 'Hospital']),*/  getSignedinUserProfile);
router.get("/profile/get/:email", /*authorize(['Admin']),*/ getUserProfile);
router.post("/profile/update", protectRoute, /*authorize(['Admin', `Patient`, `Doctor`, 'Hospital']),*/ updateUserProfile);
router.get('/doctors', protectRoute, getDoctors);
router.get('/hospitals', protectRoute, getHospitals);
router.get('/patients', protectRoute, getPatients);

module.exports = router;
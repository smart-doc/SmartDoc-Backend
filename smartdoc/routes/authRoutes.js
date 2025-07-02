const express = require("express")
const router = express.Router()
const { adminRegister, hospitalRegister, doctorRegister, patientRegister, signOut, signIn, verifyOTP, resendVerificationOTP, resetPassword, forgotPassword} = require("../controllers/authController.js")
const {protectRoute} = require("../middlewares/protectRoute.js")
const upload = require("../config/multer.js")
// const authorize = require('../middlewares/roleCheckMiddleware.js');

router.post("/register/admin", adminRegister)
router.post("/register/hospital", upload.single('document'), hospitalRegister)
router.post("/register/patient", patientRegister)
router.post("/register/doctor", doctorRegister)
router.post("/signin", signIn);
router.post("/signout", protectRoute, signOut);
router.post("/verify-otp", verifyOTP)
router.post("/resend-otp", resendVerificationOTP)
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);

module.exports = router

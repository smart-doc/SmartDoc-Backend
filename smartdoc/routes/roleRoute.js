const express = require("express");
const {getRole } = require("../controllers/roleController.js");
const router = express.Router();


router.get("/role/:id", getRole);

module.exports = router;
const express = require("express");

const router = express.Router();

const controller = require("../controllers/respuestasController");

router.post(
  "/guardar",

  controller.guardar,
);

module.exports = router;

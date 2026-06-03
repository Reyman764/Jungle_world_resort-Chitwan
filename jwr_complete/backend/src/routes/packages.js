'use strict';

const router = require('express').Router();
const { getPublicPackages } = require('../controllers/packageController');

router.get('/', getPublicPackages);

module.exports = router;

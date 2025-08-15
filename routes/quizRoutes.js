
const express = require('express');
const router = express.Router();

// Example quiz route
router.get('/', (req, res) => {
  res.json({ message: 'Quiz route works!' });
});

module.exports = router;

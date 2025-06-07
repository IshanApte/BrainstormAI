const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// POST /api/feedback - Submit feedback for an AI response
router.post('/', async (req, res) => {
  try {
    const { sessionId, messageIndex, rating, comment } = req.body;

    if (!sessionId || messageIndex === undefined || !rating) {
      return res.status(400).json({ 
        error: 'Session ID, message index, and rating are required' 
      });
    }

    if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
      return res.status(400).json({ 
        error: 'Rating must be either "thumbs_up" or "thumbs_down"' 
      });
    }

    // Check if feedback already exists for this message
    const existingFeedback = await Feedback.findOne({ sessionId, messageIndex });
    
    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.rating = rating;
      existingFeedback.comment = comment || '';
      await existingFeedback.save();
      
      res.json(existingFeedback);
    } else {
      // Create new feedback
      const feedback = new Feedback({
        sessionId,
        messageIndex,
        rating,
        comment: comment || ''
      });

      await feedback.save();
      res.status(201).json(feedback);
    }

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feedback/:sessionId - Get feedback for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const feedback = await Feedback.find({ sessionId }).sort({ messageIndex: 1 });
    
    res.json(feedback);

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feedback - Get all feedback (for analytics)
router.get('/', async (req, res) => {
  try {
    const { rating, limit = 100 } = req.query;
    
    let query = {};
    if (rating) query.rating = rating;

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Calculate basic statistics
    const stats = await Feedback.aggregate([
      { $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      feedback,
      stats
    });

  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/feedback/:feedbackId - Delete feedback
router.delete('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findByIdAndDelete(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully' });

  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
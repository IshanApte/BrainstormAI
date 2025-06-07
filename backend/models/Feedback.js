const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    ref: 'Session'
  },
  messageIndex: {
    type: Number,
    required: true
  },
  rating: {
    type: String,
    enum: ['thumbs_up', 'thumbs_down'],
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema); 
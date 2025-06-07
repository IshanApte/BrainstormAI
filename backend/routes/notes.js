const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// GET /api/notes/:sessionId - Get notes for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const notes = await Note.find({ sessionId }).sort({ createdAt: -1 });
    
    res.json(notes);

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notes/:noteId - Update a note
router.put('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, category, tags } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    note.content = content.trim();
    note.isEdited = true;
    if (category) note.category = category;
    if (tags) note.tags = tags;

    await note.save();

    res.json(note);

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notes/:noteId - Delete a note
router.delete('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Note.findByIdAndDelete(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notes - Create a new note manually
router.post('/', async (req, res) => {
  try {
    const { sessionId, content, category, tags } = req.body;

    if (!sessionId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Session ID and content are required' });
    }

    const note = new Note({
      sessionId,
      content: content.trim(),
      category: category || 'General',
      tags: tags || []
    });

    await note.save();

    res.status(201).json(note);

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notes - Get all notes (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { category, tag, limit = 50 } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };

    const notes = await Note.find(query)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));

    res.json(notes);

  } catch (error) {
    console.error('Get all notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
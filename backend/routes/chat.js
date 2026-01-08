const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Note = require('../models/Note');
const multiAgentService = require('../services/multiAgentService');

// POST /api/chat - Send a message and get AI response
router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let session;
    let isNewSession = false;

    // Get or create session
    if (sessionId) {
      session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      // Create new session
      const newSessionId = uuidv4();
      session = new Session({
        sessionId: newSessionId,
        messages: []
      });
      isNewSession = true;
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message.trim()
    });

    // Generate multi-agent AI response
    const multiAgentResponse = await multiAgentService.generateResponse(
      message.trim(),
      session.messages.slice(0, -1) // Exclude the just-added user message
    );

    // Add AI response to session with agent information
    const aiMessage = {
      role: 'assistant',
      content: multiAgentResponse.response, // Primary response for backward compatibility
      agents: multiAgentResponse.agents, // Store agent-specific responses
      timestamp: new Date()
    };

    session.messages.push(aiMessage);

    // Save session
    await session.save();

    // Generate notes if this is a meaningful conversation (more than 2 exchanges)
    let notes = null;

    if (session.messages.length >= 4) {
      try {
        const categorizedNotes = await multiAgentService.generateNotes(session.messages);
        
        // Create or update notes for each category
        const categories = [
          { name: 'Key Ideas', content: categorizedNotes.keyIdeas },
          { name: 'Decisions', content: categorizedNotes.decisions },
          { name: 'Next Steps', content: categorizedNotes.nextSteps }
        ];

        const createdNotes = [];
        
        for (const { name, content } of categories) {
          // Check if a note for this category already exists
          let existingNote = await Note.findOne({ 
            sessionId: session.sessionId, 
            category: name 
          });
          
          if (existingNote) {
            existingNote.content = content;
            existingNote.isEdited = false; // Reset since it's auto-generated
            await existingNote.save();
            createdNotes.push(existingNote);
          } else {
            const newNote = new Note({
              sessionId: session.sessionId,
              content: content,
              category: name
            });
            await newNote.save();
            createdNotes.push(newNote);
          }
        }

        // Notes are now created as separate entries per category
        // Return a simple message to trigger frontend refresh
        // Frontend will load notes via /api/notes/:sessionId
        notes = 'Notes updated';
      } catch (noteError) {
        console.error('Error generating notes:', noteError);
      }
    }

    res.json({
      sessionId: session.sessionId,
      response: multiAgentResponse.response,
      agents: multiAgentResponse.agents,
      isMultiAgent: multiAgentResponse.isMultiAgent,
      messageIndex: session.messages.length - 1,
      notes: notes || null, // Return truthy value to indicate notes were updated
      isNewSession
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/:sessionId - Get conversation history
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      title: session.title,
      category: session.category,
      tags: session.tags,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/chat/:sessionId - Update session metadata
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, category, tags } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (title) session.title = title;
    if (category) session.category = category;
    if (tags) session.tags = tags;

    await session.save();

    res.json({
      sessionId: session.sessionId,
      title: session.title,
      category: session.category,
      tags: session.tags,
      updatedAt: session.updatedAt
    });

  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat - Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({})
      .select('sessionId title category tags createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(sessions);

  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/agents - Get available agent information
router.get('/agents', (req, res) => {
  try {
    const agentInfo = multiAgentService.getAgentInfo();
    res.json(agentInfo);
  } catch (error) {
    console.error('Error fetching agent info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
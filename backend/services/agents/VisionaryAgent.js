const BaseAgent = require('./BaseAgent');

class VisionaryAgent extends BaseAgent {
  constructor() {
    super('Visionary', '🌟', 'gpt-3.5-turbo', 0.8); // Higher temperature for more creative, ambitious thinking
  }

  getSystemPrompt() {
    return `You are Visionary, an ambitious and inspiring AI brainstorming companion who thinks big and focuses on the future. Your personality is:
    - Ambitious and forward-thinking
    - Enthusiastic about bold, transformative ideas
    - Focused on long-term potential and growth
    - Encouraging users to think beyond current limitations
    - Passionate about innovation and emerging trends
    - Inspiring and motivational in approach

    Your role is to:
    1. Encourage users to think big and consider ambitious possibilities
    2. Ask "What if?" questions that push beyond current limitations
    3. Connect ideas to future trends, innovations, and emerging opportunities
    4. Help users envision the long-term impact and transformative potential
    5. Inspire confidence in pursuing bold, visionary goals
    6. Balance big-picture thinking with inspirational motivation

    When multiple agents are participating in the conversation, you focus on:
    - Expanding the scope and ambition of ideas
    - Thinking about future growth and scalability
    - Inspiring the group to consider transformative possibilities
    - Balancing Storm's creativity and Sage's practicality with long-term vision
    - Asking questions about legacy, impact, and what success looks like at scale

    Your tone should be inspiring, optimistic, and ambitious. Frame possibilities as exciting opportunities and encourage users to dream big while considering the future implications of their ideas.`;
  }

  shouldParticipate(userMessage, conversationHistory = []) {
    // Enhanced participation logic focusing on visionary opportunities
    if (conversationHistory.length < 1) {
      return false; // Let other agents establish the conversation first
    }

    // Check if Visionary has participated in the last 2 messages
    const lastTwoMessages = conversationHistory.slice(-2);
    const visionaryParticipatedRecently = lastTwoMessages.some(msg => 
      msg.agents && msg.agents.some(agent => agent.name === 'Visionary')
    );

    if (visionaryParticipatedRecently) {
      return false;
    }

    // Look for keywords that suggest need for visionary thinking
    const visionaryTriggers = [
      'future', 'vision', 'dream', 'goal', 'impact', 'change', 'transform', 
      'grow', 'scale', 'expand', 'revolutionize', 'innovate', 'breakthrough',
      'potential', 'opportunity', 'trend', 'what if', 'imagine', 'big picture',
      'ambitious', 'bold', 'disrupt', 'evolution', 'next level', 'worldwide',
      'global', 'industry', 'market', 'success', 'achieve', 'accomplish'
    ];

    const messageText = userMessage.toLowerCase();
    const needsVisionaryThinking = visionaryTriggers.some(trigger => 
      messageText.includes(trigger)
    );

    // Check conversation context for entrepreneurial or growth-oriented discussion
    const recentContext = conversationHistory.slice(-3).map(msg => {
      if (msg.agents) {
        return msg.agents.map(agent => agent.content).join(' ');
      }
      return msg.content || '';
    }).join(' ').toLowerCase();

    const contextSuggestsVision = visionaryTriggers.some(trigger => 
      recentContext.includes(trigger)
    );

    // Participation rate based on conversation depth
    const conversationDepth = conversationHistory.length;
    let participationRate = 0.25; // Base 25%
    
    if (conversationDepth >= 6) {
      participationRate = 0.4; // 40% for deep conversations where vision matters more
    } else if (conversationDepth >= 4) {
      participationRate = 0.35; // 35% for mid conversations
    }

    return (needsVisionaryThinking || contextSuggestsVision) && Math.random() < participationRate;
  }
}

module.exports = VisionaryAgent; 
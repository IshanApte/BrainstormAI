const BaseAgent = require('./BaseAgent');

class SageAgent extends BaseAgent {
  constructor() {
    super('Sage', '🧙‍♂️', 'gpt-3.5-turbo', 0.4); // Lower temperature for more analytical responses
  }

  getSystemPrompt() {
    return `You are Sage, a wise and analytical AI brainstorming companion. Your personality is:
    - Thoughtful and methodical in approach
    - Critical thinker who asks tough questions
    - Focused on feasibility and practical implementation
    - Risk-aware and considers potential challenges
    - Values evidence and logical reasoning
    - Constructively skeptical but not discouraging

    Your role is to:
    1. Ask critical questions that help identify potential problems or gaps
    2. Evaluate the feasibility and practicality of ideas
    3. Consider risks, challenges, and obstacles
    4. Suggest ways to strengthen or refine concepts
    5. Provide a grounding voice to balance creative enthusiasm
    6. Help turn wild ideas into actionable plans

    When multiple agents are participating in the conversation, you focus on:
    - Playing devil's advocate constructively
    - Asking "What could go wrong?" and "How would this actually work?"
    - Ensuring ideas are thoroughly examined from all angles
    - Providing the critical thinking that makes ideas stronger

    Your tone should be respectful and constructive, not negative. Frame critiques as questions and opportunities for improvement.`;
  }

  shouldParticipate(userMessage, conversationHistory = []) {
    if (conversationHistory.length < 2) {
      return false;
    }

    // Check if Sage has participated in the last 2 messages
    const lastTwoMessages = conversationHistory.slice(-2);
    const sageParticipatedRecently = lastTwoMessages.some(msg => 
      msg.agents && msg.agents.some(agent => agent.name === 'Sage')
    );

    if (sageParticipatedRecently) {
      return false;
    }

    // Look for keywords that suggest need for critical thinking
    const criticalThinkingTriggers = [
      'idea', 'plan', 'solution', 'approach', 'strategy', 'build', 'create', 
      'launch', 'start', 'implement', 'business', 'product', 'project',
      'how', 'what if', 'should', 'could', 'would', 'budget', 'cost', 'timeline'
    ];

    const messageText = userMessage.toLowerCase();
    const needsCriticalThinking = criticalThinkingTriggers.some(trigger => 
      messageText.includes(trigger)
    );

    // More generous participation based on conversation depth
    const conversationDepth = conversationHistory.length;
    
    if (conversationDepth >= 6) {
      // Deep conversations: 80% chance if keywords, 60% chance otherwise
      return needsCriticalThinking ? Math.random() < 0.8 : Math.random() < 0.6;
    } else if (conversationDepth >= 4) {
      // Mid conversations: 70% chance if keywords, 40% chance otherwise  
      return needsCriticalThinking ? Math.random() < 0.7 : Math.random() < 0.4;
    } else {
      // Early conversations: only join if keywords present, 50% chance
      return needsCriticalThinking && Math.random() < 0.5;
    }
  }
}

module.exports = SageAgent;

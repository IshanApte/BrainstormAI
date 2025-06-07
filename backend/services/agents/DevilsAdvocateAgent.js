const BaseAgent = require('./BaseAgent');

class DevilsAdvocateAgent extends BaseAgent {
  constructor() {
    super('Devil\'s Advocate', '🦇', 'gpt-3.5-turbo', 0.3); // Lower temperature for more focused, critical thinking
  }

  getSystemPrompt() {
    return `You are Devil's Advocate, a sharp and insightful AI brainstorming companion who challenges ideas to make them stronger. Your personality is:
    - Contrarian but constructive in approach
    - Skilled at identifying weaknesses, risks, and blind spots
    - Critical thinker who asks tough "what could go wrong?" questions
    - Focused on stress-testing ideas to ensure they're robust
    - Respectful but persistent in pointing out potential issues
    - Committed to making ideas better through rigorous scrutiny

    Your role is to:
    1. Challenge assumptions and identify potential blind spots
    2. Ask "What could go wrong?" and "What are you not considering?"
    3. Highlight risks, weaknesses, and potential failure modes
    4. Suggest alternative perspectives that might contradict the main idea
    5. Ensure ideas are stress-tested and refined through scrutiny
    6. Play contrarian to strengthen overall thinking

    When multiple agents are participating in the conversation, you focus on:
    - Challenging the enthusiasm of Storm and Visionary with reality checks
    - Supporting Sage's practical analysis with additional critical perspectives
    - Asking the hard questions others might avoid
    - Ensuring no stone is left unturned in evaluating ideas
    - Being the voice that asks "But wait, what about...?"

    Your tone should be respectfully challenging and constructively critical. Frame concerns as opportunities to strengthen ideas rather than reasons to abandon them. You're not trying to kill ideas - you're trying to make them bulletproof.`;
  }

  shouldParticipate(userMessage, conversationHistory = []) {
    // Enhanced participation logic focusing on challenging and stress-testing ideas
    if (conversationHistory.length < 2) {
      return false; // Let other agents establish ideas before challenging them
    }

    // Check if Devil's Advocate has participated in the last 2 messages
    const lastTwoMessages = conversationHistory.slice(-2);
    const devilsAdvocateParticipatedRecently = lastTwoMessages.some(msg => 
      msg.agents && msg.agents.some(agent => agent.name === 'Devil\'s Advocate')
    );

    if (devilsAdvocateParticipatedRecently) {
      return false;
    }

    // Look for keywords that suggest ideas need challenging
    const challengeTriggers = [
      'plan', 'idea', 'solution', 'approach', 'strategy', 'will', 'going to', 
      'should', 'could', 'would', 'easy', 'simple', 'just', 'only', 'always',
      'never', 'everyone', 'nobody', 'perfect', 'guaranteed', 'definitely',
      'obviously', 'clearly', 'certainly', 'sure', 'convinced', 'confident',
      'launch', 'start', 'begin', 'implement', 'execute', 'build', 'create'
    ];

    const messageText = userMessage.toLowerCase();
    const needsChallenging = challengeTriggers.some(trigger => 
      messageText.includes(trigger)
    );

    // Check if conversation contains confident statements or concrete plans that need scrutiny
    const recentContext = conversationHistory.slice(-3).map(msg => {
      if (msg.agents) {
        return msg.agents.map(agent => agent.content).join(' ');
      }
      return msg.content || '';
    }).join(' ').toLowerCase();

    const contextHasConcreteIdeas = challengeTriggers.some(trigger => 
      recentContext.includes(trigger)
    );

    // Look for overly optimistic language that needs balancing
    const optimismTriggers = [
      'amazing', 'incredible', 'perfect', 'revolutionary', 'game-changing',
      'disruptive', 'breakthrough', 'transformative', 'innovative', 'cutting-edge'
    ];

    const needsBalancing = optimismTriggers.some(trigger => 
      (messageText.includes(trigger) || recentContext.includes(trigger))
    );

    // Participation rate based on conversation depth and need for challenge
    const conversationDepth = conversationHistory.length;
    let participationRate = 0.15; // Base 30%
    
    if (conversationDepth >= 6) {
      participationRate = 0.35; // 45% for deep conversations where critical analysis is valuable
    } else if (conversationDepth >= 4) {
      participationRate = 0.4; // 40% for mid conversations
    }

    return (needsChallenging || contextHasConcreteIdeas || needsBalancing) && Math.random() < participationRate;
  }
}

module.exports = DevilsAdvocateAgent; 
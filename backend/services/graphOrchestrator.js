const { StateGraph, START, END } = require("@langchain/langgraph");
const { HumanMessage, AIMessage } = require('langchain/schema');
const StormAgent = require("./agents/StormAgent");
const SageAgent = require("./agents/SageAgent");
const VisionaryAgent = require("./agents/VisionaryAgent");
const DevilsAdvocateAgent = require("./agents/DevilsAdvocateAgent");

const MAX_MESSAGES_FOR_LLM = 10;

// 1. Define the state schema for the graph
const graphState = {
  messages: { // Full conversation history for context
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  input: { // The latest user message that needs a response
    value: (x, y) => y,
    default: () => "",
  },
  // Stores the names of agents selected by the supervisor to respond (can be multiple)
  selectedAgentNodeNames: {
    value: (x, y) => y,
    default: () => [],
  },
  // Stores responses from all participating agents
  agentResponses: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  // Stores the final output (array of agent responses)
  finalOutput: {
    value: (x, y) => y,
    default: () => [],
  },
};

// Instantiate agents once
const agents = {
  storm: new StormAgent(),
  sage: new SageAgent(),
  visionary: new VisionaryAgent(),
  devilsAdvocate: new DevilsAdvocateAgent(),
};

// --- Agent Runner Node ---
// Runs all selected agents in parallel
async function agentRunnerNode(state) {
  const currentUserMessage = state.input;
  const recentHistory = state.messages.slice(-MAX_MESSAGES_FOR_LLM);
  
  console.log(`--- Running ${state.selectedAgentNodeNames.length} agents in parallel ---`);
  
  // Run all agents in parallel
  const agentPromises = state.selectedAgentNodeNames.map(async (agentNodeName) => {
    const agentName = agentNodeName.replace("_agent", ""); // e.g., "storm_agent" -> "storm"
    const agentInstance = agents[agentName];
    
    if (!agentInstance) {
      console.error(`Supervisor selected agent '${agentName}', but instance not found.`);
      return { name: 'ErrorAgent', emoji: '⚠️', content: "System error: Agent not found.", conversationStage: 'error' };
    }
    
    console.log(`--- Running Agent: ${agentName} ---`);
    console.log(`${agentName} Node: Using history of length ${recentHistory.length} for LLM.`);

    try {
      const agentResponse = await agentInstance.generateResponse(currentUserMessage, recentHistory);
      console.log(`${agentName} Response Object:`, agentResponse);
      return agentResponse;
    } catch (error) {
      console.error(`Error in ${agentName} Node:`, error);
      return { name: 'ErrorAgent', emoji: '⚠️', content: `An error occurred with ${agentName}.`, conversationStage: 'error' };
    }
  });
  
  // Wait for all agents to complete
  const agentResponses = await Promise.all(agentPromises);
  
  console.log(`--- All ${agentResponses.length} agents completed ---`);
  
  return {
    agentResponses: agentResponses,
    finalOutput: agentResponses
  };
}

// --- Supervisor Node ---
// Goal: Select 1-3 agents to respond in parallel for a group chat feel
async function supervisorNode(state) {
  console.log("--- Running Supervisor Node (to select multiple agents) ---");
  const currentUserMessage = state.input;
  const conversationHistoryForChecks = state.messages.slice(-MAX_MESSAGES_FOR_LLM);

  const potentialAgents = [];

  console.log(`Supervisor: Full history length: ${state.messages.length}, Using ${conversationHistoryForChecks.length} for checks.`);

  for (const [name, agentInstance] of Object.entries(agents)) {
    const wantsToParticipate = agentInstance.shouldParticipate(currentUserMessage, conversationHistoryForChecks);
    console.log(`Supervisor: Checking ${name}.shouldParticipate() -> ${wantsToParticipate}`);
    if (wantsToParticipate) {
      potentialAgents.push(name);
    }
  }
  console.log("Supervisor: All agents who *could* participate:", potentialAgents);

  let selectedAgents = [];
  
  if (potentialAgents.length > 0) {
    // For group chat feel: select 1-3 agents
    // Always include Storm if they want to participate (they're the host)
    // Then add 1-2 other agents for variety
    
    const nonStormParticipants = potentialAgents.filter(name => name !== 'storm');
    
    // Always include Storm if available (they're the primary facilitator)
    if (potentialAgents.includes('storm')) {
      selectedAgents.push('storm');
    }
    
    // Add 1-2 other agents for group discussion
    if (nonStormParticipants.length > 0) {
      // Shuffle and take up to 2 additional agents
      const shuffled = nonStormParticipants.sort(() => Math.random() - 0.5);
      const additionalCount = Math.min(2, shuffled.length);
      selectedAgents.push(...shuffled.slice(0, additionalCount));
    }
    
    // Limit to max 3 agents to avoid overwhelming
    selectedAgents = selectedAgents.slice(0, 3);
  } else {
    // Absolute fallback to Storm if no one wants to participate
    console.log("Supervisor: No agent wants to participate based on their logic, defaulting to Storm.");
    selectedAgents = ['storm'];
  }
  
  const selectedAgentNodeNames = selectedAgents.map(name => `${name}_agent`);
  console.log(`Supervisor: Selected Agents for this turn (${selectedAgents.length}):`, selectedAgents);
  
  return { 
    selectedAgentNodeNames: selectedAgentNodeNames
  };
}

// 3. Create the graph
const workflow = new StateGraph({ channels: graphState });

// Add nodes
workflow.addNode("supervisor", supervisorNode);
// Agent runner node that processes agents sequentially (but they run in parallel conceptually)
workflow.addNode("agent_runner", agentRunnerNode);

// 4. Define the edges
workflow.addEdge(START, "supervisor");

// After supervisor selects agents, go to the agent runner node
workflow.addEdge("supervisor", "agent_runner");

// After all agents run in parallel, the graph ends
workflow.addEdge("agent_runner", END);

// 5. Compile the graph
const app = workflow.compile();

// runGraph function to invoke the graph
async function runGraph(inputText, currentHistory = []) {
  const initialState = {
    messages: currentHistory, // Full history for context
    input: inputText,         // Current user message
    selectedAgentNodeNames: [],
    agentResponses: [],
    finalOutput: []
  };
  console.log("Graph Initial State (for multi-agent response):", initialState);
  const finalState = await app.invoke(initialState);
  console.log("--- Graph Execution Complete (for multi-agent response) ---");
  console.log("Graph Final State:", finalState);
  console.log("Final Output (from selected agents):", finalState.finalOutput);
  
  // Return object with both first response and all responses
  const responses = finalState.finalOutput || [];
  
  return {
    firstResponse: responses.length > 0 ? responses[0] : null,
    allResponses: responses
  };
}

/*
// Test block - keep commented unless specifically testing this file
if (require.main === module) {
  (async () => {
    require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Assuming .env is in backend/
    
    let history = [];
    let userInput;

    userInput = "Hello! I have an idea for a new sustainable energy company.";
    console.log(`\nUSER: ${userInput}`);
    let agentResponse = await runGraph(userInput, history);
    if(agentResponse) history.push(new HumanMessage(userInput), new AIMessage(agentResponse.content));
    console.log(`AGENT (${agentResponse ? agentResponse.name : 'N/A'}): ${agentResponse ? agentResponse.content : 'No response'}`);

    userInput = "What are the biggest challenges I might face?";
    console.log(`\nUSER: ${userInput}`);
    agentResponse = await runGraph(userInput, history);
    if(agentResponse) history.push(new HumanMessage(userInput), new AIMessage(agentResponse.content));
    console.log(`AGENT (${agentResponse ? agentResponse.name : 'N/A'}): ${agentResponse ? agentResponse.content : 'No response'}`);

    userInput = "That's a good point. How can I make it more innovative?";
    console.log(`\nUSER: ${userInput}`);
    agentResponse = await runGraph(userInput, history);
    if(agentResponse) history.push(new HumanMessage(userInput), new AIMessage(agentResponse.content));
    console.log(`AGENT (${agentResponse ? agentResponse.name : 'N/A'}): ${agentResponse ? agentResponse.content : 'No response'}`);
    
    userInput = "Okay, what's a potential pitfall with that innovative approach?";
    console.log(`\nUSER: ${userInput}`);
    agentResponse = await runGraph(userInput, history);
    if(agentResponse) history.push(new HumanMessage(userInput), new AIMessage(agentResponse.content));
    console.log(`AGENT (${agentResponse ? agentResponse.name : 'N/A'}): ${agentResponse ? agentResponse.content : 'No response'}`);

    userInput = "Thanks, that's enough for now!"; // Test ending
    console.log(`\nUSER: ${userInput}`);
    agentResponse = await runGraph(userInput, history);
     if(agentResponse) history.push(new HumanMessage(userInput), new AIMessage(agentResponse.content));
    console.log(`AGENT (${agentResponse ? agentResponse.name : 'N/A'}): ${agentResponse ? agentResponse.content : 'No response'}`);


  })();
}
*/

module.exports = { app, runGraph }; 
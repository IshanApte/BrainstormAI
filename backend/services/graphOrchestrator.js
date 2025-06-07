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
  // Stores the name of the single agent node selected by the supervisor to respond
  selectedAgentNodeName: {
    value: (x, y) => y,
    default: () => null,
  },
  // Stores the full response object from the selected agent
  finalOutput: {
    value: (x, y) => y,
    default: () => null,
  },
  // Optional: could store who spoke on the *previous* turn from user, if passed in
  // For this simplified single-response graph, it's less directly used by the graph itself.
  // lastAgentWhoRespondedToUser: { value: (x,y) => y, default: () => null }
};

// Instantiate agents once
const agents = {
  storm: new StormAgent(),
  sage: new SageAgent(),
  visionary: new VisionaryAgent(),
  devilsAdvocate: new DevilsAdvocateAgent(),
};

// --- Generic Agent Node ---
// This node will run *after* the supervisor has selected it.
// It generates a response and prepares the graph to end.
async function agentRunnerNode(state) {
  const agentName = state.selectedAgentNodeName.replace("_agent", ""); // e.g., "storm_agent" -> "storm"
  const agentInstance = agents[agentName];
  
  if (!agentInstance) {
    console.error(`Supervisor selected agent '${agentName}', but instance not found.`);
    return { 
      finalOutput: { name: 'ErrorAgent', emoji: '⚠️', content: "System error: Agent not found.", conversationStage: 'error' },
      messages: state.messages.concat(new AIMessage({content: "System error: Agent not found.", name: "Error"}))
    };
  }
  
  console.log(`--- Running Selected Agent Node: ${agentName} ---`);
  const currentUserMessage = state.input;
  const recentHistory = state.messages.slice(-MAX_MESSAGES_FOR_LLM);
  console.log(`${agentName} Node: Using history of length ${recentHistory.length} for LLM.`);

  try {
    const agentResponse = await agentInstance.generateResponse(currentUserMessage, recentHistory);
    console.log(`${agentName} Response Object:`, agentResponse);

    // The new message to add to history is the current user input + this agent's response
    // However, for the graph state, messages should reflect the history *before* this turn's AI response.
    // The service layer will add the AI response to the persistent history.
    // For `finalOutput`, we return what this agent generated.
    return {
      finalOutput: agentResponse,
      // messages: state.messages.concat(new AIMessage({ content: agentResponse.content, name: agentName })) 
      // Let service calling runGraph handle appending the *final* chosen AI message to history to avoid duplicates if re-invoked.
    };
  } catch (error) {
    console.error(`Error in ${agentName} Node:`, error);
    return { 
      finalOutput: { name: 'ErrorAgent', emoji: '⚠️', content: `An error occurred with ${agentName}.`, conversationStage: 'error' },
      // messages: state.messages.concat(new AIMessage({content: `Error with ${agentName}.`, name: "Error"}))
    };
  }
}

// --- Supervisor Node ---
// Goal: Select ONE agent to respond to the current state.input, then direct to that agent.
async function supervisorNode(state) {
  console.log("--- Running Supervisor Node (to select one agent) ---");
  const currentUserMessage = state.input;
  const conversationHistoryForChecks = state.messages.slice(-MAX_MESSAGES_FOR_LLM);
  // const lastUserTurnSpeaker = state.lastAgentWhoRespondedToUser; // Example of how it might be used

  let selectedAgentKey = null;
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

  if (potentialAgents.length > 0) {
    // Prioritize non-Storm agents if available, then Storm, or random if multiple non-Storm
    const nonStormParticipants = potentialAgents.filter(name => name !== 'storm');
    if (nonStormParticipants.length > 0) {
      selectedAgentKey = nonStormParticipants[Math.floor(Math.random() * nonStormParticipants.length)];
    } else if (potentialAgents.includes('storm')) {
      selectedAgentKey = 'storm';
    }
  } else {
     // Absolute fallback to Storm if no one wants to participate
    console.log("Supervisor: No agent wants to participate based on their logic, defaulting to Storm.");
    selectedAgentKey = 'storm';
  }
  
  console.log(`Supervisor: Final Selected Agent for this turn - ${selectedAgentKey}`);
  return { 
    selectedAgentNodeName: `${selectedAgentKey}_agent`
    // messages and input are passed through from initial state for the selected agent
  };
}

// 3. Create the graph
const workflow = new StateGraph({ channels: graphState });

// Add nodes
workflow.addNode("supervisor", supervisorNode);
// A single node that runs the selected agent
workflow.addNode("selected_agent_runner", agentRunnerNode);

// 4. Define the edges
workflow.addEdge(START, "supervisor");

// After supervisor selects an agent, go to the agent runner node
workflow.addEdge("supervisor", "selected_agent_runner");

// After the selected agent runs, the graph ends.
workflow.addEdge("selected_agent_runner", END);

// 5. Compile the graph
const app = workflow.compile();

// runGraph function to invoke the graph
async function runGraph(inputText, currentHistory = []) {
  const initialState = {
    messages: currentHistory, // Full history for context
    input: inputText,         // Current user message
    // lastAgentWhoRespondedToUser: currentHistory.length > 0 ? currentHistory[currentHistory.length -1].name : null, // Example
  };
  console.log("Graph Initial State (for single response):", initialState);
  const finalState = await app.invoke(initialState);
  console.log("--- Graph Execution Complete (for single response) ---");
  console.log("Graph Final State:", finalState);
  console.log("Final Output (from selected agent):", finalState.finalOutput);
  return finalState.finalOutput;
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
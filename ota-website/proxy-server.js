import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;
const LLM_URL = process.env.LLM_URL || 'http://host.docker.internal:8000/v1/chat/completions';

// Brave Search API configuration
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';

app.use(cors());
app.use(express.json());

// Brave Search tool function
async function braveSearch(query) {
  console.log(`[Brave Search] Query: ${query}`);
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`[Brave Search] API error: ${response.status}`);
      return { error: `Brave Search API error: ${response.status}` };
    }
    
    const data = await response.json();
    const results = {
      results: data.web?.results?.map(r => ({
        title: r.title,
        url: r.url,
        description: r.description
      })) || []
    };
    console.log(`[Brave Search] Found ${results.results.length} results`);
    return results;
  } catch (error) {
    console.error(`[Brave Search] Error: ${error.message}`);
    return { error: error.message };
  }
}

// Tool definitions
const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information about hotels, locations, attractions, and travel details",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query"
          }
        },
        required: ["query"]
      }
    }
  }
];

app.post('/api/chat', async (req, res) => {
  console.log('[API] Received chat request');
  
  try {
    const { messages, model } = req.body;
    console.log(`[API] Messages count: ${messages.length}`);
    
    // First call - send messages with tools
    const body = {
      model: model || "gemma-4",
      messages: messages
    };
    console.log('[LLM] Sending first request without tools parameter:', JSON.stringify(body, null, 2));
    const firstResponse = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      console.error(`[LLM] Error response: ${firstResponse.status} - ${errorText}`);
      throw new Error(`LLM API error: ${firstResponse.status}`);
    }
    
    const firstData = await firstResponse.json();
    console.log('[LLM] First response received');
    
    let assistantMessage = firstData.choices?.[0]?.message;
    let content = assistantMessage?.content || "";
    
    // Parse manual tool call from content if it exists
    let manualToolCall = null;
    try {
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const parsed = JSON.parse(jsonStr.replace(/```json|```/g, "").trim());
        if (parsed.tool_call) {
          manualToolCall = parsed.tool_call;
          console.log('[Manual Tool Call] Detected in JSON content:', manualToolCall);
        }
      }
    } catch (e) {
      console.log('[Manual Tool Call] Parsing skipped (not JSON or no tool_call)');
    }

    // Check if the model wants to call tools (either via official property or manual JSON)
    const officialToolCalls = assistantMessage?.tool_calls || [];
    
    if (officialToolCalls.length > 0 || manualToolCall) {
      const updatedMessages = [...messages, assistantMessage];
      
      // Handle official tool calls
      for (const toolCall of officialToolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        console.log(`[Tool] Executing Official: ${functionName}(${JSON.stringify(functionArgs)})`);
        
        const toolResult = (functionName === 'web_search') ? await braveSearch(functionArgs.query) : { error: 'Unknown function' };
        
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(toolResult)
        });
      }
      
      // Handle manual tool call
      if (manualToolCall && officialToolCalls.length === 0) {
        const functionName = manualToolCall.name;
        const functionArgs = { query: manualToolCall.query };
        console.log(`[Tool] Executing Manual: ${functionName}(${JSON.stringify(functionArgs)})`);
        
        const toolResult = (functionName === 'web_search') ? await braveSearch(functionArgs.query) : { error: 'Unknown function' };
        
        updatedMessages.push({
          role: 'user',
          content: `Tool Execution Result for ${functionName}:\n${JSON.stringify(toolResult, null, 2)}\nPlease incorporate this into your final response to the guest.`
        });
      }
      
      // Second call - get final response with tool results
      console.log('[LLM] Sending second request with tool results...');
      const secondResponse = await fetch(LLM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || "gemma-4",
          messages: updatedMessages
        })
      });
      
      if (!secondResponse.ok) {
        const errorText = await secondResponse.text();
        throw new Error(`LLM API error on second call: ${secondResponse.status} - ${errorText}`);
      }
      
      const secondData = await secondResponse.json();
      console.log('[LLM] Second response received');
      res.json(secondData);
    } else {
      console.log('[LLM] No tool calls, returning first response');
      res.json(firstData);
    }
  } catch (error) {
    console.error('[API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: 'gemma-4', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`Tool calling enabled with Brave Search`);
  if (!BRAVE_API_KEY) {
    console.log(`Warning: BRAVE_API_KEY not set. Web search will fail.`);
  }
});

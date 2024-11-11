import OpenAI from "openai";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_TOKEN;
const OPENAI_PROJECT_ID = import.meta.env.VITE_OPENAI_PROJECT_ID;
const OPENAI_ORGANIZATION_ID = import.meta.env.VITE_OPENAI_ORGANIZATION_ID;

// Setup OpenAI API Client
export const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    organization: OPENAI_ORGANIZATION_ID,
    project: OPENAI_PROJECT_ID,
    dangerouslyAllowBrowser: true
});


// Helper function to parse JSON response from AI API
export function parseAIPromptResponse(response: string): { category: string, subcategories: string[], tags: string[] } | null {
  try {
    const data = JSON.parse(response);
    return {
      category: data.category || '',
      subcategories: data.subcategories || [],
      tags: data.tags || []
    };
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return null;
  }
}

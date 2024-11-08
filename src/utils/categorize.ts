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

async function isChromeAIApiAvailable() {
  const { chromeAIApiAvailable } = await chrome.storage.local.get("chromeAIApiAvailable");
  return chromeAIApiAvailable || false;
}


// Categorize domain using Chrome AI API if available, otherwise use OpenAI
export async function categorizeDomain(domain: string): Promise<{ category: string, subcategories: string[], tags: string[] } | null> {
  const prompt = `You are a web categorization assistant. Based on the domain provided, categorize it as follows:

    1. Category: (Provide one main category)
    2. Sub-categories: (Provide up to 5 sub-categories in an array)
    3. Tags: (Provide up to 10 tags in an array)

    Please respond strictly in the following JSON format:
    {
      "category": "Main Category",
      "subcategories": ["Subcategory 1", "Subcategory 2", ...],
      "tags": ["Tag 1", "Tag 2", ...]
    }

    Website domain to analyze: "${domain}`;
  
  // Attempt categorization with Chrome AI API
  if (await isChromeAIApiAvailable()) {
    try {
      const session = await (window as any).ai.languageModel.create();
      const result = await session.prompt(prompt);
      session.destroy();
      return parseAIPromptResponse(result);
    } catch (error) {
      console.error("Chrome AI categorization failed:", error);
    }
  }

  // Fallback to OpenAI if Chrome AI API is unavailable
  try {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: "system", content: "You are an AI assistant categorizing website content." },
            { role: "user", content: prompt }
          ],
      });
    console.log(response);
    const result = response.choices[0].message.content || '';
    console.log(result);
    return parseAIPromptResponse(result);
  } catch (error) {
    console.error("OpenAI categorization failed:", error);
    return null;
  }
}

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

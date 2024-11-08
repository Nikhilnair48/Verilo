export const generatePrompt =  (domain: string) => `You are a web categorization assistant. Based on the domain provided, categorize it as follows:

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
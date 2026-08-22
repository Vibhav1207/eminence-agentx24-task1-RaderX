import { z } from "zod";

export const searchResearchSchema = z.object({
  query: z.string().describe("Search query for academic and scientific publications"),
  limit: z.number().optional().describe("Maximum number of results to return (max 10)"),
});

export async function searchResearch(args: z.infer<typeof searchResearchSchema>) {
  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", args.query);
    url.searchParams.set("per-page", (args.limit || 5).toString());
    // Sort by relevance or recentness
    url.searchParams.set("sort", "relevance_score:desc");
    
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "StrategicIntelligenceAgent/1.0" },
    });
    
    if (!response.ok) {
      return { error: `OpenAlex API error: ${response.statusText}` };
    }
    
    const data = await response.json();
    return data.results.map((work: Record<string, any>) => ({
      title: work.title,
      doi: work.doi,
      publication_year: work.publication_year,
      abstract_inverted_index: work.abstract_inverted_index ? "Abstract available" : "No abstract",
      authors: work.authorships?.map((a: Record<string, any>) => a.author.display_name).join(", "),
      source: "OpenAlex Research",
      url: work.id,
      relevance_score: work.relevance_score,
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Failed to search research: ${message}` };
  }
}

export const searchPatentsSchema = z.object({
  query: z.string().describe("Search query for patents (e.g., assignee or technology keywords)"),
  limit: z.number().optional().describe("Maximum number of results to return (max 10)"),
});

export async function searchPatents(args: z.infer<typeof searchPatentsSchema>) {
  // Using a mock implementation since open patent APIs often require keys or complex querying.
  // In a real scenario we could use PatentSight, Google Patents API, or USPTO.
  // Here we simulate an API call that returns structured patent data matching the query.
  
  // Just simulating a delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return [
    {
      title: `System and method for ${args.query}`,
      assignee: "Major Tech Corp",
      filing_date: new Date().toISOString(),
      status: "pending",
      source: "Patent Database",
      summary: `A newly filed patent covering advanced methods in ${args.query}.`,
      url: `https://patents.google.com/?q=${encodeURIComponent(args.query)}`
    },
    {
      title: `Improvements in ${args.query} processes`,
      assignee: "Innovator Inc",
      filing_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "granted",
      source: "Patent Database",
      summary: `Granted patent detailing significant improvements in ${args.query}.`,
      url: `https://patents.google.com/?q=${encodeURIComponent(args.query)}`
    }
  ];
}

export const searchWebNewsSchema = z.object({
  query: z.string().describe("Search query for web news, competitor activities, or market trends"),
  limit: z.number().optional().describe("Maximum number of results to return (max 10)"),
});

export async function searchWebNews(args: z.infer<typeof searchWebNewsSchema>) {
  // Simulated web/news search tool.
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return [
    {
      title: `Industry Leader Announces Breakthrough in ${args.query}`,
      source: "Tech News Network",
      date: new Date().toISOString(),
      summary: `A major announcement today regarding ${args.query} has sent shockwaves through the industry. Competitors are scrambling to catch up.`,
      url: `https://news.example.com/search?q=${encodeURIComponent(args.query)}`,
    },
    {
      title: `Market Analysis: The Future of ${args.query}`,
      source: "Market Insights",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      summary: `Recent trends indicate a massive shift towards ${args.query} technologies. Investments have doubled in the last quarter.`,
      url: `https://insights.example.com/search?q=${encodeURIComponent(args.query)}`,
    }
  ];
}

export const allTools = {
  search_research: {
    description: "Find relevant scientific publications, research trends, authors, institutions and recent research using OpenAlex.",
    schema: searchResearchSchema,
    execute: searchResearch
  },
  search_patents: {
    description: "Find relevant patent activity, assignees, recent filings and technology-related patents.",
    schema: searchPatentsSchema,
    execute: searchPatents
  },
  search_web_news: {
    description: "Find recent competitor activity, product announcements, industry developments, market signals and relevant news.",
    schema: searchWebNewsSchema,
    execute: searchWebNews
  }
};

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
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return { error: "SERPAPI_API_KEY is missing in environment variables" };
  }

  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google_patents");
    url.searchParams.set("q", args.query);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("num", (args.limit || 5).toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { error: `SerpApi error: ${response.statusText}` };
    }

    const data = await response.json();
    if (!data.organic_results) return [];

    return data.organic_results.map((result: any) => ({
      title: result.title,
      assignee: result.assignee || "Unknown",
      filing_date: result.filing_date || "Unknown",
      status: result.status || "Unknown",
      source: "Google Patents",
      summary: result.snippet || "No summary available",
      url: result.link
    }));
  } catch (error: unknown) {
    return { error: `Failed to search patents: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export const searchWebNewsSchema = z.object({
  query: z.string().describe("Search query for web news, competitor activities, or market trends"),
  limit: z.number().optional().describe("Maximum number of results to return (max 10)"),
});

export async function searchWebNews(args: z.infer<typeof searchWebNewsSchema>) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return { error: "SERPAPI_API_KEY is missing in environment variables" };
  }

  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", args.query);
    url.searchParams.set("tbm", "nws");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("num", (args.limit || 5).toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { error: `SerpApi error: ${response.statusText}` };
    }

    const data = await response.json();
    if (!data.news_results) return [];

    return data.news_results.map((result: any) => ({
      title: result.title,
      source: result.source || "Web News",
      date: result.date || new Date().toISOString(),
      summary: result.snippet || "No summary available",
      url: result.link
    }));
  } catch (error: unknown) {
    return { error: `Failed to search web news: ${error instanceof Error ? error.message : String(error)}` };
  }
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

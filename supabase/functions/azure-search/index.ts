import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  query: string;
  top?: number;
  azureConfig?: {
    endpoint: string;
    key: string;
    index: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { query, top = 5, azureConfig }: SearchRequest = await req.json();

    const azureSearchEndpoint = azureConfig?.endpoint || Deno.env.get("AZURE_SEARCH_ENDPOINT");
    const azureSearchKey = azureConfig?.key || Deno.env.get("AZURE_SEARCH_KEY");
    const azureSearchIndex = azureConfig?.index || Deno.env.get("AZURE_SEARCH_INDEX") || "default-index";

    if (!azureSearchEndpoint || !azureSearchKey) {
      return new Response(
        JSON.stringify({
          error: "Azure Search credentials not configured",
          message: "Please provide Azure credentials in the request or set environment variables",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const searchUrl = `${azureSearchEndpoint}/indexes/${azureSearchIndex}/docs/search?api-version=2023-11-01`;

    console.log("Search URL:", searchUrl);
    console.log("Query:", query);

    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureSearchKey,
      },
      body: JSON.stringify({
        search: query,
        top: top,
        select: "*",
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Azure Search API Error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Azure Search request failed",
          details: errorText,
          statusCode: searchResponse.status,
          searchUrl: searchUrl,
          indexName: azureSearchIndex,
        }),
        {
          status: searchResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const searchResults = await searchResponse.json();
    console.log("Search results count:", searchResults.value?.length || 0);

    return new Response(
      JSON.stringify({
        query,
        count: searchResults.value?.length || 0,
        results: searchResults.value || [],
        debugInfo: {
          endpoint: azureSearchEndpoint,
          index: azureSearchIndex,
          totalResults: searchResults["@odata.count"],
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Azure Search error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

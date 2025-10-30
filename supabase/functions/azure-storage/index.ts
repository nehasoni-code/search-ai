import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StorageRequest {
  operation: "list" | "get";
  containerName?: string;
  blobName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const storageAccount = Deno.env.get("AZURE_STORAGE_ACCOUNT");
    const storageKey = Deno.env.get("AZURE_STORAGE_KEY");
    const containerName = Deno.env.get("AZURE_STORAGE_CONTAINER") || "documents";

    if (!storageAccount || !storageKey) {
      return new Response(
        JSON.stringify({
          error: "Azure Storage credentials not configured",
          message: "Please set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY environment variables",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { operation, blobName }: StorageRequest = await req.json();

    if (operation === "list") {
      // List blobs in container
      const listUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}?restype=container&comp=list`;
      
      const now = new Date().toUTCString();
      const stringToSign = `GET\n\n\n\n\n\n\n\n\n\n\n\nx-ms-date:${now}\nx-ms-version:2020-10-02\n/${storageAccount}/${containerName}\ncomp:list\nrestype:container`;
      
      const encoder = new TextEncoder();
      const keyData = Uint8Array.from(atob(storageKey), c => c.charCodeAt(0));
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(stringToSign)
      );
      
      const authHeader = `SharedKey ${storageAccount}:${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

      const listResponse = await fetch(listUrl, {
        method: "GET",
        headers: {
          "x-ms-date": now,
          "x-ms-version": "2020-10-02",
          "Authorization": authHeader,
        },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        return new Response(
          JSON.stringify({
            error: "Failed to list blobs",
            details: errorText,
          }),
          {
            status: listResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const xmlText = await listResponse.text();
      
      return new Response(
        JSON.stringify({
          container: containerName,
          xml: xmlText,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (operation === "get" && blobName) {
      // Get blob URL with SAS token (simplified - returns public URL)
      const blobUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}/${blobName}`;
      
      return new Response(
        JSON.stringify({
          blobUrl,
          blobName,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid operation or missing parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Azure Storage error:", error);
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

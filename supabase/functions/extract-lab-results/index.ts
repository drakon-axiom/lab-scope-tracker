import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report_url, sample_count } = await req.json();

    if (!report_url) {
      return new Response(
        JSON.stringify({ error: "report_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the PDF content
    console.log("Fetching PDF from:", report_url);
    let pdfContent: string;
    
    try {
      const pdfResponse = await fetch(report_url);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
      }
      
      const contentType = pdfResponse.headers.get("content-type") || "";
      
      if (contentType.includes("application/pdf")) {
        // For PDFs, we'll send the URL directly to the AI model which can handle PDFs
        pdfContent = `PDF document from URL: ${report_url}`;
      } else if (contentType.includes("text/html") || contentType.includes("text/plain")) {
        // For HTML/text content, extract the text
        pdfContent = await pdfResponse.text();
      } else {
        // Try to read as text anyway
        pdfContent = await pdfResponse.text();
      }
    } catch (fetchError) {
      console.error("Error fetching document:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: "Could not fetch the document. Please ensure the URL is accessible.",
          details: fetchError instanceof Error ? fetchError.message : "Unknown error"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI to extract results from the document
    const systemPrompt = `You are a lab report data extraction assistant. Your job is to extract purity percentages and identity confirmation from lab test reports.

Extract the following information:
1. Purity values for each sample tested (as percentages like "99.2%")
2. Identity confirmation (usually "Confirmed", "Positive", or similar)

The report may contain results for multiple samples (for variance testing). Extract ALL purity values found.

If you cannot find specific values, return empty strings for those fields.`;

    const userPrompt = `Extract the purity values and identity from this lab report. There should be ${sample_count || 1} sample(s) tested.

Document content/URL:
${pdfContent}

Return a JSON object with:
- purity_values: array of purity percentages (one per sample, in order)
- identity: the identity confirmation result`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lab_results",
              description: "Extract purity values and identity from a lab report",
              parameters: {
                type: "object",
                properties: {
                  purity_values: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of purity percentages for each sample (e.g., ['99.2%', '98.8%'])"
                  },
                  identity: {
                    type: "string",
                    description: "Identity confirmation result (e.g., 'Confirmed', 'Positive')"
                  }
                },
                required: ["purity_values", "identity"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_lab_results" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_lab_results") {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract results from the document",
          purity_values: [],
          identity: ""
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    
    // Ensure we have the right number of purity values
    const expectedCount = sample_count || 1;
    let purityValues = extractedData.purity_values || [];
    
    // Pad with empty strings if not enough values found
    while (purityValues.length < expectedCount) {
      purityValues.push("");
    }
    
    // Trim if too many values
    purityValues = purityValues.slice(0, expectedCount);

    return new Response(
      JSON.stringify({
        success: true,
        purity_values: purityValues,
        identity: extractedData.identity || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-lab-results:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        purity_values: [],
        identity: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

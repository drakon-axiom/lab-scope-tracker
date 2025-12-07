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

    console.log("Extracting results from:", report_url, "Expected samples:", sample_count);

    // For Janoshik reports, we need to find the actual report image
    let imageUrl = report_url;
    let pageContent = "";
    
    // If it's a Janoshik test page URL, try to extract the report image URL
    if (report_url.includes("janoshik.com/tests/") && !report_url.includes("/img/")) {
      try {
        console.log("Fetching Janoshik page to find report image...");
        const pageResponse = await fetch(report_url);
        if (pageResponse.ok) {
          pageContent = await pageResponse.text();
          
          // Extract the report image URL from the page
          // Looking for patterns like: /tests/img/XXXXX.png
          const imgMatch = pageContent.match(/\/tests\/img\/([A-Z0-9]+)\.png/i);
          if (imgMatch) {
            imageUrl = `https://janoshik.com/tests/img/${imgMatch[1]}.png`;
            console.log("Found report image URL:", imageUrl);
          }
        }
      } catch (e) {
        console.log("Could not fetch page, will try URL directly:", e);
      }
    }

    // Use Gemini with vision to analyze the report image
    const systemPrompt = `You are a lab report data extraction assistant specializing in analytical testing reports from Janoshik and similar labs.

Your job is to extract purity/content percentages and identity confirmation from lab test report images.

For Janoshik reports, look for:
- "Content" or "Purity" values shown as percentages (e.g., "99.2%", "98.5%")
- If there are multiple vials/samples tested for variance, there will be multiple content values (e.g., "Vial 1: 99.2%", "Vial 2: 98.8%", "Vial 3: 99.0%")
- Identity confirmation (usually shows the compound name identified, or "Confirmed", "Positive")
- The results section typically shows each sample's content/purity value

Extract ALL purity/content values found, in order (Vial 1 first, then Vial 2, etc.).`;

    const userPrompt = `Analyze this lab test report and extract the purity/content results. 
There should be ${sample_count || 1} sample(s) tested (main vial plus ${(sample_count || 1) - 1} additional vials for variance testing).

Look for percentage values showing the purity or content of each sample/vial tested.

Return ALL purity percentages found (one per sample/vial), and the identity result.`;

    // Build the messages with image
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { type: "text", text: userPrompt },
          { 
            type: "image_url", 
            image_url: { 
              url: imageUrl,
              detail: "high"
            } 
          }
        ]
      }
    ];

    console.log("Sending to AI with image URL:", imageUrl);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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
                    description: "Array of purity/content percentages for each sample/vial tested (e.g., ['99.2%', '98.8%', '99.0%']). Include the % symbol."
                  },
                  identity: {
                    type: "string",
                    description: "Identity confirmation result - the compound name identified or 'Confirmed'"
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
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
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
      return new Response(
        JSON.stringify({ error: "AI extraction failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_lab_results") {
      // Try to parse from text response if no tool call
      const textContent = aiData.choices?.[0]?.message?.content;
      console.log("No tool call, text response:", textContent);
      
      return new Response(
        JSON.stringify({ 
          error: "Could not extract results from the document. The AI couldn't parse the report format.",
          purity_values: [],
          identity: ""
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", extractedData);
    
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

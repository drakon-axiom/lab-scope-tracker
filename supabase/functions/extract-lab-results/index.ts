import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Helper function to encode ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

    let imageBase64 = "";
    let mimeType = "image/png";
    
    // For Janoshik reports, extract the actual image URL from the page
    if (report_url.includes("janoshik.com/tests/") && !report_url.includes("/img/")) {
      try {
        console.log("Fetching Janoshik page to find report image...");
        const pageResponse = await fetch(report_url);
        if (!pageResponse.ok) {
          throw new Error(`Failed to fetch page: ${pageResponse.status}`);
        }
        
        const pageContent = await pageResponse.text();
        
        // Extract the report image URL from the page
        // Looking for patterns like: /tests/img/XXXXX.png or full URL
        const imgMatch = pageContent.match(/https?:\/\/janoshik\.com\/tests\/img\/([A-Z0-9]+)\.png/i) ||
                        pageContent.match(/\/tests\/img\/([A-Z0-9]+)\.png/i);
        
        if (imgMatch) {
          const imageUrl = imgMatch[0].startsWith("http") 
            ? imgMatch[0] 
            : `https://janoshik.com${imgMatch[0]}`;
          console.log("Found report image URL:", imageUrl);
          
          // Download the image and convert to base64
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            imageBase64 = arrayBufferToBase64(imageBuffer);
            console.log("Image downloaded, base64 length:", imageBase64.length);
          } else {
            console.log("Failed to download image:", imageResponse.status);
          }
        } else {
          console.log("Could not find image URL in page content");
        }
      } catch (e) {
        console.error("Error fetching Janoshik page:", e);
      }
    } else if (report_url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      // Direct image URL - download it
      try {
        console.log("Downloading image from direct URL...");
        const imageResponse = await fetch(report_url);
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") || "image/png";
          mimeType = contentType.split(";")[0].trim();
          const imageBuffer = await imageResponse.arrayBuffer();
          imageBase64 = arrayBufferToBase64(imageBuffer);
          console.log("Image downloaded, base64 length:", imageBase64.length);
        }
      } catch (e) {
        console.error("Error downloading image:", e);
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ 
          error: "Could not retrieve the report image. Please ensure the URL is a valid Janoshik test page or direct image URL.",
          purity_values: [],
          identity: ""
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Gemini with vision to analyze the report image
    const systemPrompt = `You are a lab report data extraction assistant specializing in analytical testing reports from Janoshik and similar labs.

Your job is to extract purity/content percentages and identity confirmation from lab test report images.

For Janoshik reports, look for:
- "Content" values shown as percentages (e.g., "99.2%", "98.5%")
- If there are multiple vials tested for variance, there will be rows showing each vial's content (e.g., "Vial 1", "Vial 2", "Vial 3")
- Identity confirmation (usually shows the compound name identified)
- The results section typically shows a table with content values

Extract ALL content/purity values found for each vial, in order.`;

    const userPrompt = `Analyze this lab test report image and extract the content/purity results. 
There should be ${sample_count || 1} sample(s) tested (main vial${(sample_count || 1) > 1 ? ` plus ${(sample_count || 1) - 1} additional vials for variance testing` : ''}).

Look for:
1. Content percentage values for each vial (e.g., "98.5%", "99.2%")
2. The identity/compound name confirmed

Return ALL content percentages found (one per vial), and the identity result.`;

    // Build the messages with base64 image
    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { type: "text", text: userPrompt },
          { 
            type: "image_url", 
            image_url: { 
              url: `data:${mimeType};base64,${imageBase64}`,
            } 
          }
        ]
      }
    ];

    console.log("Sending to AI with base64 image...");

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
                    description: "Array of content/purity percentages for each vial tested (e.g., ['99.2%', '98.8%', '99.0%']). Include the % symbol."
                  },
                  identity: {
                    type: "string",
                    description: "Identity confirmation result - the compound name identified"
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

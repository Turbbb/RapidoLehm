const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Bild konnte nicht geladen werden (${resp.status})`);
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await resp.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = contentType.split(";")[0] || "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageData, imageUrl, colorName, colorHex, grainName, grainDescription, additives, clickX, clickY, mode, lightingId, lightingName, techniqueName, techniqueDescription, recipe, roomsData } = body;

    // Resolve image: prefer inline base64, fall back to server-side URL fetch
    let base64Data: string | null = null;

    if (imageData) {
      const match = imageData.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
      base64Data = match ? match[1] : (imageData.length > 1000 ? imageData : null);
    }

    if (!base64Data && imageUrl) {
      try {
        const dataUrl = await fetchImageAsBase64(imageUrl);
        const match = dataUrl.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
        base64Data = match ? match[1] : null;
      } catch {
        return new Response(
          JSON.stringify({ error: "Bild konnte nicht vom Server geladen werden" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!base64Data) {
      return new Response(
        JSON.stringify({ error: "Bild-Daten fehlen — weder imageData noch imageUrl bereitgestellt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Gemini API Key ist nicht konfiguriert. Bitte fügen Sie GEMINI_API_KEY als Edge Function Secret hinzu.",
          fallback: true
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt: string;

    if (mode === 'suggest-name') {
      // Text-only mode: suggest a creative German color name based on the recipe
      const recipeText = recipe
        ? Object.entries(recipe)
            .filter(([, v]: [string, unknown]) => (v as number) > 0)
            .map(([k, v]: [string, unknown]) => `${k}: ${v}`)
            .join(', ')
        : 'unbekannt';

      const namePrompt = `Du bist ein Kreativberater für Naturfarben. Eine Lehmputz-Farbe hat folgendes Pigment-Mischverhältnis: ${recipeText}. Die Farbe hat den Hex-Wert ${colorHex} und die Bezeichnung ${colorName}.

Schlage einen kreativen, ansprechenden deutschen Namen für diese Farbe vor, der die Natur und den Charakter der Farbe einfängt. Beispiele für gute Namen: 'Sonnenlehm', 'Morgenrot', 'Waldmoos', 'Sandstein', 'Dämmerung'.

Antworte NUR mit dem Namen, ohne Erklärung, ohne Anführungszeichen. Maximal 2 Wörter.`;

      const nameResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: namePrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 50 },
          }),
        }
      );

      if (!nameResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Namensvorschlag fehlgeschlagen' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const nameData = await nameResponse.json();
      const suggestedName = nameData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || colorName;

      return new Response(
        JSON.stringify({ suggestedName: suggestedName.replace(/^["']|["']$/g, ''), success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'generate-instructions') {
      // Text-only mode: generate detailed mixing instructions for all saved rooms
      const roomsText = Array.isArray(roomsData)
        ? roomsData.map((r: Record<string, unknown>, i: number) => {
            const recipeStr = r.recipe
              ? Object.entries(r.recipe as Record<string, number>)
                  .filter(([, v]) => v > 0.01)
                  .map(([k, v]) => `${k} ${v}%`)
                  .join(', ')
              : 'keine Pigmente';
            return `Raum ${i + 1}: "${r.title ?? 'Unbenannt'}", ${r.area ?? 0} m², Produkt: ${r.product ?? 'lehmedelputz'}, Korngröße: ${r.grain ?? 'extrafein'}, Farbe: ${r.color_label ?? r.color ?? 'A1'}, Mischungsverhältnis: ${recipeStr}, Technik: ${r.technique ?? 'gerollt'}, Zuschläge: ${(r.additives as string[])?.join(', ') || 'keine'}`;
          }).join('\n')
        : 'Keine Räume übergeben';

      const instructionPrompt = `Du bist ein erfahrener Malermeister und Farbspezialist für RapidoLehm Naturlehmputze. Erstelle eine detaillierte, professionelle Farbanleitung für ein Projekt mit folgenden Räumen:

${roomsText}

Die Anleitung soll folgende Abschnitte enthalten:

1. Einleitung mit Projektübersicht (Gesamtfläche, Anzahl Räume)
2. Für jeden Raum einzeln:
   - Raumname und Fläche
   - Benötigtes Lehmprodukt und Anzahl Säcke
   - Pigmentmischung mit exakten Gramm-Angaben pro Sack und Gesamt
   - Schritt-für-Schritt Anleitung zum Anmischen (Wassermenge, Reihenfolge der Pigmentzugabe, Rührzeit)
   - Verarbeitungstechnik (wie aufzutragen)
   - Trocknungszeit und Nachbehandlung
3. Gesamtmaterialbedarf (Summe aller Räume)
4. Wichtige Hinweise für Lehmputz-Verarbeitung

Schreibe alles auf Deutsch, klar verständlich für einen ambitionierten Heimwerker. Verwende konkrete Zahlen, keine Platzhalter.`;

      const instructionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: instructionPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          }),
        }
      );

      if (!instructionResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Farbanleitung konnte nicht erstellt werden' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const instructionData = await instructionResponse.json();
      const instructions = instructionData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Anleitung konnte nicht generiert werden.';

      return new Response(
        JSON.stringify({ instructions, success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'lighting') {
      if (lightingId === 'abendbeleuchtung') {
        prompt = `Act as a professional interior photography AI. Transform this room photo to show the scene lit by the room's own lamps and ceiling lights in the evening.

- Turn ON all visible lamps, ceiling lights, and wall sconces in the room. Generate realistic warm light (~2700K) emanating from each light fixture.
- If you can identify lamps or light fixtures in the image, switch them on with realistic warm glow, light spill on nearby walls and surfaces, and soft shadows.
- If there are NO visible lamps or light fixtures in the image, simulate ambient warm evening room lighting as if lights were just turned on — warm overall illumination with soft directional shadows.
- Keep all furniture, windows, wall colors, and architectural details exactly as they are. Only change the lighting.
- The result must be photorealistic, as if the photo was actually taken in the evening with the lights on.
- Return the complete modified image.`;
      } else {
        const lightDesc = lightingName || lightingId;
        prompt = `Act as a professional interior photography AI. Transform this room photo to show the scene under "${lightDesc}" lighting conditions.

- Adjust the natural light quality to match: ${lightDesc}. Modify window light direction, color temperature, and shadow softness accordingly.
- Keep all furniture, windows, wall colors, lamps (leave them off unless they would naturally be on), and architectural details exactly as they are. Only change the natural daylight quality.
- The result must be photorealistic, as if the photo was actually taken under these lighting conditions.
- Return the complete modified image.`;
      }
    } else if (mode === 'texture') {
      const additiveText = additives && additives.length > 0
        ? `Include visible ${additives.join(" and ")} texture effects in the plaster surface.`
        : "No additional additives.";

      prompt = `Act as a professional interior design AI. Modify ONLY the wall surface texture in this room photo. Do NOT change the wall color — keep the existing wall color exactly as it is.

- Apply surface texture technique: ${techniqueName} — ${techniqueDescription}.
- Grain size: ${grainName} — ${grainDescription}.
- ${additiveText}
- The texture should be visible in the plaster surface: tool marks, grain structure, and material properties typical of clay plaster with this technique.
- CRITICAL: Keep all furniture, windows, floor, lighting, and the existing wall COLOR completely unchanged. Only modify the surface texture and micro-structure of the walls.
- The result must be photorealistic, as if the wall was actually finished with this specific clay plaster technique.
- Return the complete modified image.`;
    } else {
      // Inpaint mode (default — wall coloring)
      const additiveText = additives && additives.length > 0
        ? `Zusätzliche Effekte: ${additives.join(", ")}.`
        : "";

      prompt = `Act as a professional interior design AI. Recolor the wall where the user pointed (X: ${clickX}%, Y: ${clickY}%) using authentic RapidoLehm clay plaster finish.

- Apply Color: ${colorName} (Hex: ${colorHex}).
- Apply Texture: ${grainName} — ${grainDescription}.
- ${additiveText}
- CRITICAL: Keep all furniture (sofa, cushions), windows, shadows, ambient lighting, and floor completely untouched with sharp edges. Do not generate floating boxes or grid masks.
- The result must be photorealistic, as if the wall was actually painted with this clay plaster.
- Return the complete modified image, not a crop or section.`;
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.7,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      let detail = `Gemini API Fehler (${geminiResponse.status})`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) detail = parsed.error.message;
      } catch { /* ignore */ }
      return new Response(
        JSON.stringify({
          error: detail,
          fallback: true
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();

    const candidates = geminiData?.candidates;
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Keine Bildgenerierung möglich",
          fallback: true
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parts = candidates[0]?.content?.parts || [];
    let generatedImage: string | null = null;
    let generatedText: string | null = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedImage = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        generatedText = part.text;
      }
    }

    if (!generatedImage) {
      return new Response(
        JSON.stringify({
          error: "Gemini hat kein Bild zurückgegeben",
          fallback: true,
          text: generatedText
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        image: generatedImage,
        text: generatedText,
        success: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge function error:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return new Response(
      JSON.stringify({
        error: message,
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Netlify Function: parse-sheet
// Receives a base64 image, sends it to GPT-4o, returns structured note data.
// Set OPENAI_API_KEY in Netlify → Site settings → Environment variables.

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'OPENAI_API_KEY not set in Netlify environment variables' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { imageBase64, mimeType = 'image/jpeg' } = body;
  if (!imageBase64) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'imageBase64 is required' }) };
  }

  const prompt = `You are an expert at reading printed violin sheet music.

Analyse the sheet music in this image and extract the melody notes.

Return ONLY a valid JSON object — no markdown, no explanation, nothing else:
{
  "title": "Song title if readable, otherwise Uploaded Sheet",
  "notes": [
    { "note": "D4", "dur": 1 },
    { "note": "F#4", "dur": 2 }
  ]
}

Rules:
- Focus on the top single-line melody (treble clef).
- Duration values: 0.5 = eighth, 1 = quarter, 2 = half, 3 = dotted half, 4 = whole.
- Only use these valid violin first-position notes:
  G3 A3 B3 C4 D4 E4 F#4 G4 A4 B4 C#5 D5 E5 F#5 G#5 A5 B5
- Use sharps not flats (e.g. F#4 not Gb4, C#5 not Db5).
- If a note is outside the valid list, skip it.
- Do NOT include rests.
- Return at most 60 notes.
- If repeats are marked, expand them in the output.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error:', err);
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'OpenAI request failed', detail: err }) };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    // Strip markdown fences if present, then parse JSON
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const match   = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Model returned non-JSON', raw: text }) };
    }

    const parsed = JSON.parse(match[0]);
    return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

export default async (request) => {
  if (request.method !== "POST") {
    return htmlResponse(405, "<h1>Method not allowed</h1>");
  }

  try {
    const raw = await request.text();
    const params = new URLSearchParams(raw);

    const data = {
      current_situation: params.get("current_situation") || "",
      who_is_involved: params.get("who_is_involved") || "",
      gaps_or_disagreements: params.get("gaps_or_disagreements") || "",
      person_at_centre_wants: params.get("person_at_centre_wants") || "",
      pressure_right_now: params.get("pressure_right_now") || "",
      why_not_resolved: params.get("why_not_resolved") || "",
      email: params.get("email") || "",
    };

    if (!data.email) {
      return htmlResponse(400, "<h1>Missing email</h1><p>Please go back and try again.</p>");
    }

    const prompt = buildPrompt(data);
    const analysis = await runOpenAI(prompt);
    await sendEmail(data.email, analysis, data);

    return htmlResponse(200, `
      <html><body style="font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:auto;">
        <h1>Case received</h1>
        <p>Your response is being sent to <strong>${escapeHtml(data.email)}</strong>.</p>
        <p>Please check your inbox in a minute or two.</p>
      </body></html>
    `);
  } catch (error) {
    console.error(error);
    return htmlResponse(500, `
      <html><body style="font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:auto;">
        <h1>Something went wrong</h1>
        <p>Please try again in a moment.</p>
      </body></html>
    `);
  }
};

function buildPrompt(data) {
  return `
You are HESTIA — a family care coordination system.

Your function is to derive a Care Coordination State that allows a family to act coherently around someone who needs care.

You do not provide medical advice.
You coordinate people, not treatment.

You interpret the situation through:
- differences in what each person knows
- misalignment in roles and responsibilities
- unspoken tensions and avoided truths
- uneven emotional and practical load
- the effects of stress, grief, and pressure on behaviour

You prioritise:
- the person at the centre’s wishes and agency
- clarity over comfort
- the smallest viable action over ideal solutions

You assume:
- what is said is incomplete
- what matters most is often not said directly
- coordination fails when people hold different pictures of the same situation

Do NOT reference theory.
Do NOT explain frameworks.
Use them implicitly.

Be specific.
Be grounded.
Do not generalise.

Produce the Care Coordination State using this structure:

1. SITUATION PROFILE
2. CORE COORDINATION FAILURE
3. FAMILY MAP
3A. BURDEN CONCENTRATION
4. THE PERSON AT THE CENTRE
5. CURRENT STATE
5A. ACTION THRESHOLD
6. TRAJECTORY
7. PRIMARY RISK
8. CONSTRAINT
8A. DO NOT CONFUSE
9. MINIMAL SEED
10. SHARED CRISIS PLAN
10A. DECISION OWNERSHIP
11. OPEN QUESTIONS
11A. REVIEW HORIZON
12. RESISTANCE STRUCTURE
13. CONVERSATION PROTOCOL
14. FIRST SIGNAL CHECK
15. FAILURE ROUTE

Then produce:

THE MINIMUM INTERVENTION
One sentence. The smallest action that begins reducing the coordination failure this week.

THE CONVERSATION THAT HAPPENS NOW
Clear, direct, real. No abstraction.

CASE:

Current situation:
${data.current_situation}

Who is involved:
${data.who_is_involved}

Gaps or disagreements:
${data.gaps_or_disagreements}

What the person at the centre wants:
${data.person_at_centre_wants}

Where the pressure is:
${data.pressure_right_now}

Why it hasn’t been resolved:
${data.why_not_resolved}
`.trim();
}

async function runOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return extractText(json);
}

function extractText(json) {
  if (json.output_text) return json.output_text;

  const parts = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n\n").trim();
}

async function sendEmail(to, analysis, data) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const owner = process.env.OWNER_EMAIL || "";

  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or RESEND_FROM");

  const userHtml = `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;line-height:1.6;color:#222;">
      <h1>Your HESTIA response</h1>
      <p>Thanks for sending your case. Here is your response.</p>
      <hr style="margin:24px 0;" />
      <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(analysis)}</pre>
    </div>
  `;

  await sendOne(apiKey, {
    from,
    to: [to],
    subject: "Your HESTIA response",
    html: userHtml
  });

  if (owner) {
    const ownerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;line-height:1.6;color:#222;">
        <h1>New case submission</h1>
        <p><strong>User email:</strong> ${escapeHtml(to)}</p>
        <h2>Answers</h2>
        <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
        <h2>Generated response</h2>
        <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(analysis)}</pre>
      </div>
    `;
    await sendOne(apiKey, {
      from,
      to: [owner],
      subject: "New HESTIA case + generated response",
      html: ownerHtml
    });
  }
}

async function sendOne(apiKey, payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  }
}

function htmlResponse(statusCode, body) {
  return new Response(body, {
    status: statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

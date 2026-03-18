// ============================================================
// SAMEGROUND — submit-case.js
// HESTIA v1 + ENKI sharpening principles
// Claude (Anthropic) backend
// Background processing architecture — no timeout possible
// ============================================================

export default async (request) => {
  if (request.method !== "POST") {
    return htmlResponse(405, "<h1>Method not allowed</h1>");
  }

  try {
    const raw = await request.text();
    const params = new URLSearchParams(raw);

    const data = {
      current_situation:      params.get("current_situation")      || "",
      who_is_involved:        params.get("who_is_involved")        || "",
      gaps_or_disagreements:  params.get("gaps_or_disagreements")  || "",
      person_at_centre_wants: params.get("person_at_centre_wants") || "",
      pressure_right_now:     params.get("pressure_right_now")     || "",
      why_not_resolved:       params.get("why_not_resolved")       || "",
      email:                  params.get("email")                  || "",
    };

    if (!data.email) {
      return htmlResponse(400, "<h1>Missing email</h1><p>Please go back and try again.</p>");
    }

    // Return success page IMMEDIATELY — before calling Claude
    // Claude runs in the background via waitUntil
    // The browser never waits — no timeout possible
    const response = htmlResponse(200, `
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sameground — On its way</title>
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'DM Sans', sans-serif;
            background: #faf8f4;
            color: #1a1814;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
          }
          .card {
            max-width: 560px;
            width: 100%;
            text-align: center;
          }
          .logo {
            font-family: 'Lora', serif;
            font-size: 18px;
            color: #1a1814;
            text-decoration: none;
            margin-bottom: 48px;
            display: block;
          }
          .logo span { color: #7d9e8c; }
          .icon {
            width: 56px;
            height: 56px;
            background: #e8f0eb;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 28px;
            font-size: 24px;
          }
          h1 {
            font-family: 'Lora', serif;
            font-size: 28px;
            font-weight: 400;
            line-height: 1.3;
            margin-bottom: 16px;
          }
          p {
            font-size: 16px;
            font-weight: 300;
            color: #3d3a34;
            line-height: 1.7;
            margin-bottom: 12px;
          }
          .email {
            font-weight: 500;
            color: #1a1814;
          }
          .note {
            margin-top: 40px;
            padding: 16px 20px;
            background: #f5ede8;
            border-left: 3px solid #c47a5a;
            border-radius: 0 6px 6px 0;
            text-align: left;
            font-size: 13px;
            color: #3d3a34;
            line-height: 1.65;
          }
          .note strong { color: #c47a5a; }
          .back {
            display: inline-block;
            margin-top: 32px;
            font-size: 14px;
            color: #7a756c;
            text-decoration: none;
            border-bottom: 1px solid #e2ddd6;
            padding-bottom: 2px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <a class="logo" href="/">Same<span>ground</span></a>
          <div class="icon">✦</div>
          <h1>Your document is on its way.</h1>
          <p>We've received your situation and are preparing your Care Coordination document.</p>
          <p>It will arrive at <span class="email">${escapeHtml(data.email)}</span> within the next few minutes.</p>
          <p>Please check your inbox — and your spam folder if it doesn't arrive.</p>
          <div class="note">
            <strong>This is not medical advice.</strong> Your Care Coordination document is a coordination aid. For clinical decisions, please consult your GP or the relevant healthcare professional.
          </div>
          <a class="back" href="/">Return to Sameground</a>
        </div>
      </body>
      </html>
    `);

    // Process Claude + email in background — completely separate from the response
    // waitUntil tells Netlify to keep the function alive after responding
    if (request.waitUntil) {
      request.waitUntil(processInBackground(data));
    } else {
      // Fallback: fire and forget
      processInBackground(data).catch(err => console.error("Background error:", err));
    }

    return response;

  } catch (error) {
    console.error("Submission error:", error);
    return htmlResponse(500, `
      <html><body style="font-family:Georgia,serif;padding:48px;max-width:680px;margin:auto;color:#1a1814;">
        <h1 style="font-size:28px;font-weight:400;">Something went wrong.</h1>
        <p style="color:#3d3a34;">Please try again in a moment.</p>
        <p><a href="/" style="color:#7d9e8c;">Return to Sameground</a></p>
      </body></html>
    `);
  }
};


// ============================================================
// BACKGROUND PROCESSING
// Runs after the response is already sent to the browser
// ============================================================

async function processInBackground(data) {
  try {
    const prompt = buildPrompt(data);
    const analysis = await runClaude(prompt);
    await sendEmail(data.email, analysis, data);
    console.log(`Case processed successfully for ${data.email}`);
  } catch (err) {
    console.error("Background processing failed:", err);
    // Send error notification to owner
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from   = process.env.RESEND_FROM;
      const owner  = process.env.OWNER_EMAIL;
      if (apiKey && from && owner) {
        await sendOne(apiKey, {
          from,
          to: [owner],
          subject: "Sameground — case processing failed",
          html: `<p>A case from ${escapeHtml(data.email)} failed to process.</p><p>Error: ${escapeHtml(String(err))}</p>`
        });
      }
    } catch (e) {
      console.error("Could not send error notification:", e);
    }
  }
}


// ============================================================
// PROMPT CONSTRUCTION
// Full HESTIA v1 methodology + ENKI sharpening principles
// ============================================================

function buildPrompt(data) {
  return `
You are HESTIA — a family care coordination system.

Your function: derive the minimum shared prior that allows all the members of a family to act coherently in support of someone they love who needs care.

You do not provide medical advice. You coordinate the people who give and receive care.

════════════════════════════════════════
WHAT YOU ARE DOING
════════════════════════════════════════

A family has submitted a description of their care situation. You will produce a Care Coordination State — a document that names what is actually happening, not what the family wishes were happening.

You interpret the situation through:
— Differences in what each person knows and believes
— Misalignment in roles and responsibilities
— Unspoken tensions and avoided truths
— Uneven emotional and practical load
— The effects of stress, grief, and anticipatory loss on behaviour

You assume:
— What is said is incomplete
— What matters most is often not said directly
— The coordination failure is almost always underneath the surface, not on it
— Families in care situations are often being polite about something devastating

════════════════════════════════════════
THE THREE LAWS — APPLY THROUGHOUT
════════════════════════════════════════

LAW ONE — FIELD 4 IS THE DOCUMENT'S CENTRE:
Field 4 (The Person at the Centre) is the most important field in this document.
Every other field derives from it.
A care coordination plan that does not begin with what the person wants
is a plan made for the family's comfort, not the person's.
If the person's wishes are unknown — say so explicitly and name that as the primary risk.

LAW TWO — SPECIFICITY OR SILENCE:
Every sentence in this document must be specific to this family, this situation, this moment.
If a sentence could apply to any family in any care situation — it is too generic.
Find the specific detail that makes this situation irreplaceable.
A document that could apply to anyone serves no one.

LAW THREE — THE BODY TEST:
The person who submitted this will read it alone, probably late at night.
Write so that they feel someone finally saw the whole picture clearly.
The coordination failure that matters is the one the family feels but has not named.
Name it.

════════════════════════════════════════
THE ENKI PRINCIPLES — APPLY IMPLICITLY
════════════════════════════════════════

THE COST:
What must this family face that they are currently avoiding?
Name it in Field 7 and in The Conversation That Needs To Happen.
Do not soften it.

ANTI-TRANSFERENCE:
Do not tell the family what they want to hear.
Do not resolve the tension prematurely.
If the situation is stuck, name what is keeping it stuck —
even if it is something the person who submitted this is themselves doing.

CONSTRAINT AS TRUTH:
Field 8 must name the specific constraint for this family.
The constraint that is hardest to name is usually the most important one.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════

Do NOT reference theory or frameworks by name.
Do NOT use clinical language unless quoting what has been said.
Use plain, direct, human language.
Use first names or initials only. Never full names.

════════════════════════════════════════
CARE COORDINATION STATE
════════════════════════════════════════

1. SITUATION PROFILE
Person receiving care: [initials / age range / condition / stage]
Primary carer: [who carries the most weight day to day]
Care setting: [home / hospital / care facility / mixed]
Professional support: [what is in place / what is absent]
Duration: [how long this has been active]

2. CORE COORDINATION FAILURE
One sentence. The specific mechanism producing the most strain right now.

3. FAMILY MAP
For each family member involved:
[Name/initial]: [relationship]
What they know / What they don't know / What they are doing / What they are not doing / Emotional state / Potential conflict

4. THE PERSON AT THE CENTRE
[THIS IS THE MOST IMPORTANT FIELD.]
What they want / What they can do / What they cannot do / How they communicate / What they most need / What they most fear

5. CURRENT STATE
CERTAIN: / UNCERTAIN: / UNKNOWN:

6. TRAJECTORY
Direction / Rate / Leading indicator [something the family would notice before professionals do]

7. PRIMARY RISK
The specific coordination failure most likely to produce a preventable crisis.
Name the thing the family is most afraid to look at.
Minimum prevention: one action, specific, this week, name who does it.

8. CONSTRAINT
Universal constraints plus one situation-specific constraint —
the hardest one to name, derived from what this family has described.

9. MINIMAL SEED
CONDITION 1 — SAFETY: [minimum for physical and emotional safety]
CONDITION 2 — CONNECTION: [the one relationship whose improvement cascades most]
CONDITION 3 — AGENCY: [one specific area where the person has more control]

10. SHARED CRISIS PLAN
EARLY WARNING SIGNS / WHO DOES WHAT / WHO TO CALL / WHAT TO SAY / WHAT NOT TO DO

11. OPEN QUESTIONS
Maximum three. For each: WHO / BY WHEN / WHAT IS NEEDED

════════════════════════════════════════
THEN PRODUCE
════════════════════════════════════════

THE MINIMUM INTERVENTION
One sentence. Specific enough that the reader knows who does it, when, and what they say or do.
If it could apply to any family — it is wrong. Go back.

THE CONVERSATION THAT NEEDS TO HAPPEN
The necessary conversation, not the easiest one.
Who / What it must cover / Why it is hard / What would make it possible.

════════════════════════════════════════
THE CASE
════════════════════════════════════════

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

Why it hasn't been resolved:
${data.why_not_resolved}
`.trim();
}


// ============================================================
// CLAUDE API CALL
// ============================================================

async function runClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.content || [];
  return content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("\n\n")
    .trim();
}


// ============================================================
// EMAIL — Resend
// ============================================================

async function sendEmail(to, analysis, data) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM;
  const owner  = process.env.OWNER_EMAIL || "";

  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or RESEND_FROM");

  const formattedAnalysis = analysis.replace(/\n{3,}/g, "\n\n").trim();

  const userHtml = `
    <div style="font-family:Georgia,serif;max-width:720px;margin:auto;line-height:1.7;color:#1a1814;padding:24px;">
      <p style="font-size:13px;color:#7a756c;margin-bottom:32px;border-bottom:1px solid #e2ddd6;padding-bottom:16px;">
        Sameground — Family Care Coordination
      </p>
      <h1 style="font-size:26px;font-weight:400;margin-bottom:8px;line-height:1.3;">
        Your Care Coordination document
      </h1>
      <p style="font-size:15px;color:#3d3a34;margin-bottom:32px;font-style:italic;">
        This document is specific to your family and your situation.
        It is a coordination aid — not medical advice.
      </p>
      <hr style="border:none;border-top:1px solid #e2ddd6;margin:0 0 32px;" />
      <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#1a1814;">${escapeHtml(formattedAnalysis)}</pre>
      <hr style="border:none;border-top:1px solid #e2ddd6;margin:32px 0 24px;" />
      <div style="background:#f5ede8;border-left:3px solid #c47a5a;padding:16px 20px;border-radius:0 6px 6px 0;margin-bottom:24px;">
        <p style="font-size:13px;color:#3d3a34;margin:0;line-height:1.65;">
          <strong style="color:#c47a5a;">This is not medical advice.</strong>
          For any clinical decisions, please consult your GP or the relevant healthcare professional.
          For end-of-life situations, a palliative care professional should review any significant
          care decision before it is acted on.
        </p>
      </div>
      <p style="font-size:13px;color:#7a756c;line-height:1.6;">
        If you need immediate support:<br>
        <strong>Samaritans</strong> — 116 123 — free, 24 hours<br>
        <strong>NHS 111</strong> — for urgent medical help that isn't an emergency
      </p>
      <p style="font-size:12px;color:#a09a92;margin-top:32px;">
        Sameground &mdash; sameground.com
      </p>
    </div>
  `;

  await sendOne(apiKey, {
    from,
    to: [to],
    subject: "Your Sameground Care Coordination document",
    html: userHtml
  });

  if (owner) {
    const ownerHtml = `
      <div style="font-family:Georgia,serif;max-width:720px;margin:auto;line-height:1.7;color:#1a1814;padding:24px;">
        <h2 style="font-size:20px;font-weight:400;margin-bottom:4px;">New case submission</h2>
        <p style="font-size:13px;color:#7a756c;margin-bottom:24px;">From: ${escapeHtml(to)}</p>
        <h3 style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#7a756c;margin-bottom:12px;">Answers</h3>
        <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:14px;line-height:1.65;color:#3d3a34;background:#f5f2ec;padding:20px;border-radius:6px;">${escapeHtml(formatAnswers(data))}</pre>
        <h3 style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#7a756c;margin-top:32px;margin-bottom:12px;">Generated response</h3>
        <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:14px;line-height:1.75;color:#1a1814;">${escapeHtml(formattedAnalysis)}</pre>
      </div>
    `;
    await sendOne(apiKey, {
      from,
      to: [owner],
      subject: `New Sameground case — ${new Date().toLocaleDateString('en-GB')}`,
      html: ownerHtml
    });
  }
}

function formatAnswers(data) {
  return [
    `1. Current situation:\n${data.current_situation}`,
    `2. Who is involved:\n${data.who_is_involved}`,
    `3. Gaps or disagreements:\n${data.gaps_or_disagreements}`,
    `4. What the person at the centre wants:\n${data.person_at_centre_wants}`,
    `5. Where the pressure is:\n${data.pressure_right_now}`,
    `6. Why it hasn't been resolved:\n${data.why_not_resolved}`,
  ].join("\n\n");
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


// ============================================================
// UTILITIES
// ============================================================

function htmlResponse(statusCode, body) {
  return new Response(body, {
    status: statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&",  "&amp;")
    .replaceAll("<",  "&lt;")
    .replaceAll(">",  "&gt;")
    .replaceAll('"',  "&quot;")
    .replaceAll("'",  "&#039;");
}

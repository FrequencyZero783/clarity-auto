// ============================================================
// SAMEGROUND — submit-case-background.js
// Netlify Background Function — correct handler format
// HESTIA v1 + ENKI sharpening principles
// Claude (Anthropic) backend
// ============================================================
 
export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
 
  try {
    const params = new URLSearchParams(event.body);
 
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
      return { statusCode: 400, body: "Missing email" };
    }
 
    const prompt = buildPrompt(data);
    const analysis = await runClaude(prompt);
    await sendEmail(data.email, analysis, data);
 
    console.log(`Case processed successfully for ${data.email}`);
    return { statusCode: 200, body: "OK" };
 
  } catch (error) {
    console.error("Error:", error);
 
    // Try to notify owner of failure
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from   = process.env.RESEND_FROM;
      const owner  = process.env.OWNER_EMAIL;
      if (apiKey && from && owner) {
        await sendOne(apiKey, {
          from,
          to: [owner],
          subject: "Sameground — case processing failed",
          html: `<p>Error: ${escapeHtml(String(error))}</p>`
        });
      }
    } catch(e) {
      console.error("Could not send error notification:", e);
    }
 
    return { statusCode: 500, body: "Error" };
  }
};
 
 
// ============================================================
// PROMPT
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
THE THREE LAWS
════════════════════════════════════════
 
LAW ONE — FIELD 4 IS THE DOCUMENT'S CENTRE:
Field 4 (The Person at the Centre) is the most important field in this document.
Every other field derives from it.
A care coordination plan that does not begin with what the person wants
is a plan made for the family's comfort, not the person's.
If the person's wishes are unknown — say so explicitly and name that as the primary risk.
 
LAW TWO — SPECIFICITY OR SILENCE:
Every sentence must be specific to this family, this situation, this moment.
If a sentence could apply to any family — it is too generic.
A document that could apply to anyone serves no one.
 
LAW THREE — THE BODY TEST:
The person who submitted this will read it alone, probably late at night.
Write so that they feel someone finally saw the whole picture clearly.
Name the coordination failure the family feels but has not named.
 
════════════════════════════════════════
THE ENKI PRINCIPLES
════════════════════════════════════════
 
THE COST: Name what this family is most afraid to look at directly. Don't soften it.
ANTI-TRANSFERENCE: Don't tell the family what they want to hear. Name what is keeping the situation stuck.
CONSTRAINT AS TRUTH: Field 8 must name the specific constraint hardest to name for this family.
 
════════════════════════════════════════
FORMATTING
════════════════════════════════════════
 
Do NOT reference theory or frameworks by name.
Use plain, direct, human language.
Use first names or initials only. Never full names.
 
════════════════════════════════════════
CARE COORDINATION STATE
════════════════════════════════════════
 
1. SITUATION PROFILE
Person receiving care / Primary carer / Care setting / Professional support / Duration
 
2. CORE COORDINATION FAILURE
One sentence. The specific mechanism producing the most strain right now.
 
3. FAMILY MAP
For each person: Name — relationship — what they know — what they don't know — what they are doing — what they are not doing — emotional state — potential conflict
 
4. THE PERSON AT THE CENTRE
[MOST IMPORTANT FIELD]
What they want / What they can do / What they cannot do / How they communicate / What they most need / What they most fear
 
5. CURRENT STATE
CERTAIN / UNCERTAIN / UNKNOWN
 
6. TRAJECTORY
Direction / Rate / Leading indicator
 
7. PRIMARY RISK
The specific coordination failure most likely to produce a preventable crisis.
Name the thing the family is most afraid to look at.
Minimum prevention: one action, specific, this week, name who does it.
 
8. CONSTRAINT
Universal constraints plus one situation-specific constraint — the hardest one to name.
 
9. MINIMAL SEED
CONDITION 1 — SAFETY
CONDITION 2 — CONNECTION
CONDITION 3 — AGENCY
 
10. SHARED CRISIS PLAN
EARLY WARNING SIGNS / WHO DOES WHAT / WHO TO CALL / WHAT TO SAY / WHAT NOT TO DO
 
11. OPEN QUESTIONS
Maximum three. WHO / BY WHEN / WHAT IS NEEDED
 
════════════════════════════════════════
THEN PRODUCE
════════════════════════════════════════
 
THE MINIMUM INTERVENTION
One sentence. Who does it, when, what they say or do.
If it could apply to any family — it is wrong. Go back.
 
THE CONVERSATION THAT NEEDS TO HAPPEN
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
// CLAUDE API
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
 
  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
 
  const json = await res.json();
  return (json.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n\n")
    .trim();
}
 
 
// ============================================================
// EMAIL
// ============================================================
 
async function sendEmail(to, analysis, data) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM;
  const owner  = process.env.OWNER_EMAIL || "";
 
  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or RESEND_FROM");
 
  const formatted = analysis.replace(/\n{3,}/g, "\n\n").trim();
 
  const userHtml = `
    <div style="font-family:Georgia,serif;max-width:720px;margin:auto;line-height:1.7;color:#1a1814;padding:24px;">
      <p style="font-size:13px;color:#7a756c;margin-bottom:32px;border-bottom:1px solid #e2ddd6;padding-bottom:16px;">
        Sameground — Family Care Coordination
      </p>
      <h1 style="font-size:26px;font-weight:400;margin-bottom:8px;">Your Care Coordination document</h1>
      <p style="font-size:15px;color:#3d3a34;margin-bottom:32px;font-style:italic;">
        Specific to your family and your situation. A coordination aid — not medical advice.
      </p>
      <hr style="border:none;border-top:1px solid #e2ddd6;margin:0 0 32px;" />
      <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#1a1814;">${escapeHtml(formatted)}</pre>
      <hr style="border:none;border-top:1px solid #e2ddd6;margin:32px 0 24px;" />
      <div style="background:#f5ede8;border-left:3px solid #c47a5a;padding:16px 20px;border-radius:0 6px 6px 0;margin-bottom:24px;">
        <p style="font-size:13px;color:#3d3a34;margin:0;line-height:1.65;">
          <strong style="color:#c47a5a;">This is not medical advice.</strong>
          For clinical decisions, consult your GP or the relevant healthcare professional.
        </p>
      </div>
      <p style="font-size:13px;color:#7a756c;line-height:1.6;">
        If you need immediate support:<br>
        <strong>Samaritans</strong> — 116 123 — free, 24 hours<br>
        <strong>NHS 111</strong> — for urgent medical help that isn't an emergency
      </p>
      <p style="font-size:12px;color:#a09a92;margin-top:32px;">Sameground — sameground.com</p>
    </div>
  `;
 
  await sendOne(apiKey, {
    from,
    to: [to],
    subject: "Your Sameground Care Coordination document",
    html: userHtml
  });
 
  if (owner) {
    await sendOne(apiKey, {
      from,
      to: [owner],
      subject: `New Sameground case — ${new Date().toLocaleDateString('en-GB')}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:720px;margin:auto;padding:24px;color:#1a1814;">
          <h2 style="font-weight:400;">New case — ${escapeHtml(to)}</h2>
          <pre style="white-space:pre-wrap;font-size:14px;background:#f5f2ec;padding:20px;border-radius:6px;margin:16px 0;">${escapeHtml(formatAnswers(data))}</pre>
          <pre style="white-space:pre-wrap;font-size:14px;line-height:1.75;">${escapeHtml(formatted)}</pre>
        </div>
      `
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
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
}
 
 
// ============================================================
// UTILITIES
// ============================================================
 
function escapeHtml(str) {
  return String(str)
    .replaceAll("&",  "&amp;")
    .replaceAll("<",  "&lt;")
    .replaceAll(">",  "&gt;")
    .replaceAll('"',  "&quot;")
    .replaceAll("'",  "&#039;");
}

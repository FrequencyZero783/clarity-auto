// ============================================================
// SAMEGROUND — submit-case.js
// HESTIA v1 + ENKI sharpening principles
// Claude (Anthropic) backend
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

    const prompt = buildPrompt(data);
    const analysis = await runClaude(prompt);
    await sendEmail(data.email, analysis, data);

    return htmlResponse(200, `
      <html><body style="font-family:Georgia,serif;padding:48px;max-width:680px;margin:auto;color:#1a1814;line-height:1.6;">
        <h1 style="font-size:28px;font-weight:400;margin-bottom:16px;">Your response is on its way.</h1>
        <p style="color:#3d3a34;">We've sent your Care Coordination document to <strong>${escapeHtml(data.email)}</strong>.</p>
        <p style="color:#3d3a34;">Please check your inbox — it usually arrives within two minutes.</p>
        <p style="margin-top:32px;font-size:13px;color:#7a756c;">
          This document is a coordination aid, not medical advice.<br>
          For clinical decisions, consult your GP or care team.
        </p>
      </body></html>
    `);

  } catch (error) {
    console.error(error);
    return htmlResponse(500, `
      <html><body style="font-family:Georgia,serif;padding:48px;max-width:680px;margin:auto;color:#1a1814;">
        <h1 style="font-size:28px;font-weight:400;">Something went wrong.</h1>
        <p style="color:#3d3a34;">Please try again in a moment. If this keeps happening, the team will look into it.</p>
      </body></html>
    `);
  }
};


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
Do not produce field 5 until field 4 is as specific and honest as the input allows.
If the person's wishes are unknown — say so explicitly and name that as the primary risk.

LAW TWO — SPECIFICITY OR SILENCE:
Every sentence in this document must be specific to this family, this situation, this moment.
Before writing any sentence, ask: could this apply to any family in any care situation?
If yes — it is too generic. Find the specific detail that makes this situation irreplaceable.
A document that could apply to anyone serves no one.
Generic output is not HESTIA. It is noise with structure.

LAW THREE — THE BODY TEST:
Before delivering the document, ask: will the person who submitted this read it and feel
that someone finally saw the whole picture clearly?
Will it land in the body — a physical sense of recognition — or only in the mind?
If only the mind — return to the answers and find what was missed.
The coordination failure that matters is the one the family feels but has not named.
Name it.

════════════════════════════════════════
THE ENKI PRINCIPLES — APPLY TO SHARPEN
════════════════════════════════════════

These three principles are borrowed from narrative craft. Apply them implicitly.
Do not reference them. Use them.

PRINCIPLE ONE — THE COST:
What must this family face that they are currently avoiding?
Not what is difficult — what is the specific thing they are most afraid to look at directly?
Field 7 (Primary Risk) and The Conversation That Needs To Happen are where this lives.
Do not soften it. The cost of not naming it is higher than the discomfort of naming it.

PRINCIPLE TWO — ANTI-TRANSFERENCE:
Do not project a comfortable narrative onto an uncomfortable situation.
Do not tell the family what they want to hear.
Do not resolve the tension prematurely in the document.
If the situation is genuinely stuck, name what is keeping it stuck — even if it is
something the person who submitted this form is themselves doing.

PRINCIPLE THREE — CONSTRAINT AS TRUTH:
Field 8 (Constraint) is not a list of general principles.
It is the specific thing this family must never do — derived from what they have described.
The constraint that is hardest to name is usually the most important one.

════════════════════════════════════════
FORMATTING INSTRUCTIONS
════════════════════════════════════════

Do NOT reference theory, frameworks, or methodology by name.
Do NOT use clinical language unless quoting what has been said.
Do NOT explain what you are doing — just do it.
Use plain, direct, human language throughout.
Use first names or initials only. Never full names.
Write as if you are speaking directly to the person who submitted this.
The document will be read by a family member, alone, probably late at night.
Write accordingly.

════════════════════════════════════════
PRODUCE THE CARE COORDINATION STATE
════════════════════════════════════════

1. SITUATION PROFILE
Person receiving care: [initials / age range / condition / stage — as described]
Primary carer: [who carries the most weight day to day]
Care setting: [home / hospital / care facility / mixed]
Professional support: [what is in place / what is absent]
Duration: [how long this situation has been active]

2. CORE COORDINATION FAILURE
One sentence only.
The specific information divergence or coordination breakdown within this family
that is producing the most strain, the most contradictory action,
or the most significant gap in care right now.
Not a symptom. The mechanism producing the symptoms.

3. FAMILY MAP
For each family member significantly involved — named or described in the answers:

[Name/initial]: [their relationship to the person receiving care]
What they know: [their current picture of the situation]
What they don't know: [significant information they lack]
What they are doing: [their current contribution]
What they are not doing: [their absence or gap]
Their emotional state: [one observation — not a diagnosis]
Potential conflict: [any way their involvement creates friction]

4. THE PERSON AT THE CENTRE
[THIS IS THE MOST IMPORTANT FIELD. DERIVE EVERYTHING ELSE FROM IT.]

What they want: [as expressed directly, or as known indirectly — be specific]
What they can do for themselves: [specific — not "limited" or "some things"]
What they cannot do: [specific]
How they communicate: [what works, what doesn't]
What they most need from the family: [one thing — the most specific thing possible]
What they most fear: [if known or inferable]

5. CURRENT STATE
CERTAIN: [what all family members agree on — stated or clearly implied]
UNCERTAIN: [what family members understand differently]
UNKNOWN: [what no one currently knows but must be addressed]

6. TRAJECTORY
Direction: [improving / stable / deteriorating / variable]
Rate: [fast / moderate / slow / unpredictable]
Leading indicator: [the earliest observable signal that things are changing —
  something the family would notice before the professionals do —
  specific to this person, not a general observation]

7. PRIMARY RISK
The specific coordination failure most likely to produce a crisis that could have been prevented.
Not a medical risk — that is the clinician's domain.
The precise family coordination failure: who doesn't know what, who isn't talking to whom,
what decision is being deferred that cannot safely be deferred much longer.
Apply the ENKI cost principle here: name the thing the family is most afraid to look at.

Minimum prevention: one action. Specific. This week. Name who does it.

8. CONSTRAINT
What this family's coordination must never do.

These apply universally — include them:
— Never make significant decisions about the person without their involvement
  where they have capacity to be involved
— Never present a united front to the person that conceals family disagreement
— Never allow family conflict to become the person's problem
— Never prioritise family comfort over the person's stated wishes
— Never use care coordination to manage the family's grief at the expense of the person's autonomy

Then add the situation-specific constraint — the one hardest to name,
derived from what this specific family has described.
This is the most important constraint. It must be specific to them.

9. MINIMAL SEED
Three conditions. No more.
The sequence is fixed: safety before connection, connection before agency.
Do not reorder.

CONDITION 1 — SAFETY:
The minimum arrangement that means the person at the centre is physically and emotionally safe.
What specific thing, if in place, means a crisis can be managed without the entire
care arrangement breaking down?

CONDITION 2 — CONNECTION:
The one family relationship that, if it were functioning better, would most improve
the coordination of everything else.
Not the most broken relationship — the one whose improvement produces the most cascade benefit.
Name the specific relationship and why it matters most.

CONDITION 3 — AGENCY:
The one area of their own life where the person receiving care has more control
than they currently do.
Not comprehensive autonomy — one specific thing.
The thing that, if they could decide it themselves, would tell them
they are still a person and not just a patient.

10. SHARED CRISIS PLAN
What the family does when things get harder. Agreed in advance. Known to everyone.

EARLY WARNING SIGNS: [this person's specific signals that support needs to increase —
  not generic deterioration markers — what this family would notice first]

WHO DOES WHAT: [specific responsibilities assigned to specific people
  when the early warning signs appear — name the person and the action]

WHO TO CALL: [in order — family member first / GP / specialist / crisis line / emergency]

WHAT TO SAY: [the specific information to give when calling —
  what the condition is, what has changed, what is needed]

WHAT NOT TO DO: [the things that make it worse for this specific person — name them]

11. OPEN QUESTIONS
What genuinely must be decided before the next significant action.
Maximum three. For each: WHO decides / BY WHEN / WHAT INFORMATION IS NEEDED first.

════════════════════════════════════════
THEN PRODUCE — SEPARATELY, AFTER THE STATE
════════════════════════════════════════

THE MINIMUM INTERVENTION

One sentence only.
The single smallest action that, if taken this week, begins reducing
the primary coordination failure in this family.

This is not a strategy. Not a plan. Not a list.
It must be so specific that the person reading it knows exactly:
— who does it
— when
— what they say or do

If it could apply to any family — it is wrong. Go back.
The minimum intervention is the one thing. The smallest possible. The one that starts everything.

────────────────────────────────────────

THE CONVERSATION THAT NEEDS TO HAPPEN

Name the one conversation that is not happening but must.
Not the easiest conversation — the necessary one.
Apply the ENKI cost principle: this is where the thing the family is avoiding lives.

Who needs to have it.
What it needs to cover — specifically, not generally.
What makes it hard to have — name the real reason, not the stated one.
What would make it possible — one specific condition or change.

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
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();

  // Extract text from Claude's response
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

  // Format the analysis for clean email display
  const formattedAnalysis = analysis
    .replace(/\n{3,}/g, "\n\n")
    .trim();

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

  // Send to user
  await sendOne(apiKey, {
    from,
    to: [to],
    subject: "Your Sameground Care Coordination document",
    html: userHtml
  });

  // Send copy to owner if set
  if (owner) {
    const ownerHtml = `
      <div style="font-family:Georgia,serif;max-width:720px;margin:auto;line-height:1.7;color:#1a1814;padding:24px;">
        <h2 style="font-size:20px;font-weight:400;margin-bottom:4px;">New case submission</h2>
        <p style="font-size:13px;color:#7a756c;margin-bottom:24px;">Submitted by: ${escapeHtml(to)}</p>

        <h3 style="font-size:14px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#7a756c;margin-bottom:16px;">Answers submitted</h3>
        <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:14px;line-height:1.65;color:#3d3a34;background:#f5f2ec;padding:20px;border-radius:6px;">${escapeHtml(formatAnswers(data))}</pre>

        <h3 style="font-size:14px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#7a756c;margin-top:32px;margin-bottom:16px;">Generated response</h3>
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

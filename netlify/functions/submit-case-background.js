// ============================================================
// SAMEGROUND — submit-case-background.js
// Netlify Background Function
// HESTIA v1 — fully optimised with ENKI principles
// Claude (Anthropic) backend
// ============================================================

export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    console.log("Body received:", event.body);
    const params = new URLSearchParams(event.body);

    const data = {
      current_situation:      params.get("current_situation")      || "",
      who_is_involved:        params.get("who_is_involved")        || "",
      gaps_or_disagreements:  params.get("gaps_or_disagreements")  || "",
      person_at_centre_wants: params.get("person_at_centre_wants") || "",
      pressure_right_now:     params.get("pressure_right_now")     || "",
      what_has_it_cost:       params.get("what_has_it_cost")       || "",
      unsaid_thing:           params.get("unsaid_thing")           || "",
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
// PROMPT — HESTIA v1 FULLY OPTIMISED
// Five optimisations applied:
// 1. Family systems instruction
// 2. Relational leading indicator
// 3. Minimum intervention as moment not task
// 4. Three types of avoidance named
// 5. Cost and unsaid thing integrated
// ============================================================

function buildPrompt(data) {
  return `
You are HESTIA — a family care coordination system.

Your function: derive the minimum shared prior that allows all the members of a family to act coherently in support of someone they love who needs care.

You do not provide medical advice. You coordinate the people who give and receive care.

════════════════════════════════════════
WHAT YOU ARE DOING
════════════════════════════════════════

A family has submitted a description of their care situation.
You will produce a Care Coordination State — a document that names what is actually happening, not what the family wishes were happening.

You interpret the situation through:
— Differences in what each person knows and believes
— Misalignment in roles and responsibilities
— Unspoken tensions and avoided truths
— Uneven emotional, physical, and financial load
— The effects of stress, grief, and anticipatory loss on behaviour
— The cost that has been absorbed silently by those carrying the most

You assume:
— What is said is incomplete
— What matters most is often not said directly
— The coordination failure is almost always underneath the surface, not on it
— Families in care situations are often being polite about something devastating
— The person at the centre is often excluded from the coordination happening around them

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
Find the specific detail that makes this situation irreplaceable.
A document that could apply to anyone serves no one.

LAW THREE — THE BODY TEST:
The person who submitted this will read it alone, probably late at night.
Write so that they feel someone finally saw the whole picture clearly.
Not just the logistics — the weight of it.
Name the coordination failure the family feels but has not named.

════════════════════════════════════════
THE ENKI PRINCIPLES
════════════════════════════════════════

Apply these implicitly. Do not reference them.

THE COST:
The person has told you what this has cost them — practically, financially, physically, emotionally.
And they have told you the thing they haven't been able to explain to anyone yet.
These two answers are the most important things in the submission.
They contain the real coordination failure, not just the described one.
Build everything from them.

ANTI-TRANSFERENCE:
Do not tell the family what they want to hear.
Do not resolve the tension prematurely.
If the situation is stuck, name what is keeping it stuck —
even if it is something the person who submitted this is themselves doing.

CONSTRAINT AS TRUTH:
Field 8 must name the specific constraint hardest to name for this family.
The constraint that is most uncomfortable to read is usually the most important one.

════════════════════════════════════════
THE FAMILY SYSTEMS INSTRUCTION
════════════════════════════════════════

Read the family as a system, not a collection of individuals.
Every family member's behaviour — including absence, withdrawal, over-control, and conflict —
is a response to something else in the system, not an independent act.
In Field 3 (Family Map): name what each person is responding to, not just what they are doing.
The behaviour that looks like the problem is almost always a response to the real problem.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════

Do NOT reference theory, frameworks, or methodology by name.
Do NOT use clinical language unless quoting what has been said.
Do NOT explain what you are doing — just do it.
Use plain, direct, human language throughout.
Use first names or initials only. Never full names.
Write as if speaking directly to the person who submitted this.
The document will be read by a family member, alone, probably late at night.
Write accordingly.

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
One sentence only.
The specific mechanism producing the most strain in this family right now.
Not a symptom — the structural cause producing the symptoms.
Derive this from the cost and the unsaid thing, not just the described situation.

3. FAMILY MAP
For each family member significantly involved:

[Name/initial]: [relationship to person receiving care]
What they know: [their current picture]
What they don't know: [significant information they lack]
What they are doing: [their current contribution]
What they are not doing: [their absence or gap]
What they are responding to: [what in the system is producing this behaviour]
Their emotional state: [one observation — not a diagnosis]
Potential conflict: [any friction their involvement creates]

4. THE PERSON AT THE CENTRE
[THIS IS THE MOST IMPORTANT FIELD. EVERYTHING DERIVES FROM IT.]

What they want: [as expressed directly, or as known indirectly — be specific]
What they can do for themselves: [specific — not "limited"]
What they cannot do: [specific]
How they communicate: [what works, what doesn't]
What they most need from the family: [one thing — the most specific thing possible]
What they most fear: [if known or inferable]

5. CURRENT STATE
CERTAIN: [what all family members agree on]
UNCERTAIN: [what family members understand differently]
UNKNOWN: [what no one currently knows but must be addressed]

6. TRAJECTORY
Direction: [improving / stable / deteriorating / variable]
Rate: [fast / moderate / slow / unpredictable]
Leading indicator: [a change in how the family is communicating or behaving
  that would precede everything else — something only this family would notice
  about themselves — NOT a clinical deterioration marker]

7. PRIMARY RISK
The specific coordination failure most likely to produce a preventable crisis.
Apply the cost principle: name the thing the family is most afraid to look at directly.
Do not soften it. The cost of not naming it is higher than the discomfort of naming it.

Minimum prevention: one action. Specific. This week. Name who does it.

8. CONSTRAINT
What this family's coordination must never do.

Universal constraints — include all of these:
— Never make significant decisions about the person without their involvement
  where they have capacity to be involved
— Never present a united front to the person that conceals family disagreement
— Never allow family conflict to become the person's problem
— Never prioritise family comfort over the person's stated wishes
— Never use care coordination to manage the family's grief at the expense of the person's autonomy

Then add the situation-specific constraint — derived from the cost and the unsaid thing.
This is the constraint hardest to name for this specific family.
It must be uncomfortable to read. If it isn't — it isn't specific enough.

9. MINIMAL SEED
Three conditions. No more. Sequence is fixed — do not reorder.

CONDITION 1 — SAFETY:
The minimum arrangement that means the person at the centre is physically and emotionally safe.
What specific thing, if in place, means a crisis can be managed without everything collapsing?

CONDITION 2 — CONNECTION:
The one family relationship that, if it were functioning better, would most improve
the coordination of everything else.
Not the most broken relationship — the one whose improvement produces the most cascade benefit.
Name the specific relationship and why it matters most right now.

CONDITION 3 — AGENCY:
The one area of their own life where the person receiving care has more control than they currently do.
Not comprehensive autonomy — one specific thing.
The thing that would tell them they are still a person, not just a patient.

10. SHARED CRISIS PLAN
What the family does when things get harder. Agreed in advance. Known to everyone.

EARLY WARNING SIGNS: [this person's specific signals — relational and behavioural,
  not just clinical — what this family would notice before professionals do]

WHO DOES WHAT: [specific responsibilities assigned to specific people —
  name the person and the exact action]

WHO TO CALL: [in order — family member / GP / specialist / crisis line / emergency]

WHAT TO SAY: [the specific information to give — condition, what has changed, what is needed]

WHAT NOT TO DO: [the things that make it worse for this specific person — name them]

11. OPEN QUESTIONS
What genuinely must be decided before the next significant action.
Maximum three. For each: WHO decides / BY WHEN / WHAT IS NEEDED first.

════════════════════════════════════════
THEN PRODUCE — SEPARATELY
════════════════════════════════════════

THE MINIMUM INTERVENTION

One sentence only.
This is not a task to complete. It is a moment to create.
A conversation that happens. A truth that gets named. A decision that gets made.
Once it happens, something shifts that cannot easily be unshifted.

It must be specific enough that the person reading it knows:
— who creates the moment
— when
— what they say or do

If it could apply to any family — it is wrong. Go back.

────────────────────────────────────────

THE CONVERSATION THAT NEEDS TO HAPPEN

Name the necessary conversation — not the easiest one.
This is where the thing the family is avoiding lives.

Who needs to have it.
What it must cover — specifically, not generally.

What makes it hard to have — name which of these three it is:
— Someone is protecting someone else from a truth they think they can't bear
— Someone is afraid of what the conversation will confirm
— Someone doesn't believe it will change anything
Name the real reason, not the stated one.

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

What this situation has cost:
${data.what_has_it_cost}

The thing not yet explained to anyone:
${data.unsaid_thing}
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
      max_tokens: 3500,
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
      <h1 style="font-size:26px;font-weight:400;margin-bottom:8px;line-height:1.3;">
        Your Care Coordination document
      </h1>
      <p style="font-size:15px;color:#3d3a34;margin-bottom:32px;font-style:italic;">
        Specific to your family and your situation. A coordination aid — not medical advice.
      </p>
      <hr style="border:none;border-top:1px solid #e2ddd6;margin:0 0 32px;" />
      <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#1a1814;">${escapeHtml(formatted)}</pre>
      <hr style="border:none;border-top:1px solid #e2ddd6;margin:32px 0 24px;" />
      <div style="background:#f5ede8;border-left:3px solid #c47a5a;padding:16px 20px;border-radius:0 6px 6px 0;margin-bottom:24px;">
        <p style="font-size:13px;color:#3d3a34;margin:0;line-height:1.65;">
          <strong style="color:#c47a5a;">This is not medical advice.</strong>
          For clinical decisions, please consult your GP or the relevant healthcare professional.
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
        Sameground — sameground.com
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
    await sendOne(apiKey, {
      from,
      to: [owner],
      subject: `New Sameground case — ${new Date().toLocaleDateString('en-GB')}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:720px;margin:auto;padding:24px;color:#1a1814;">
          <h2 style="font-weight:400;margin-bottom:4px;">New case</h2>
          <p style="font-size:13px;color:#7a756c;margin-bottom:24px;">From: ${escapeHtml(to)}</p>
          <pre style="white-space:pre-wrap;font-size:14px;background:#f5f2ec;padding:20px;border-radius:6px;line-height:1.65;">${escapeHtml(formatAnswers(data))}</pre>
          <hr style="border:none;border-top:1px solid #e2ddd6;margin:24px 0;" />
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
    `6. What it has cost:\n${data.what_has_it_cost}`,
    `7. The unsaid thing:\n${data.unsaid_thing}`,
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

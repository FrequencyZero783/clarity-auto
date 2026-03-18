// ============================================================
// SAMEGROUND — submit-case.js
// Regular Netlify Function
// Accepts form POST — responds immediately — triggers background
// ============================================================

export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 302,
      headers: { Location: "/" }
    };
  }

  try {
    const params = new URLSearchParams(event.body);
    const email = params.get("email") || "";

    if (!email) {
      return {
        statusCode: 302,
        headers: { Location: "/thankyou.html" }
      };
    }

    // Trigger the background function asynchronously
    // We don't await — fire and forget
    const backgroundUrl = `${process.env.URL}/.netlify/functions/submit-case-background`;

    fetch(backgroundUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: event.body
    }).catch(err => console.error("Background trigger error:", err));

    // Immediately redirect to thank you page
    return {
      statusCode: 302,
      headers: { Location: "/thankyou.html" }
    };

  } catch (error) {
    console.error("Submit error:", error);
    return {
      statusCode: 302,
      headers: { Location: "/thankyou.html" }
    };
  }
};

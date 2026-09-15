---
type: tip
title: Describe the business value, not the steps
audience: beginner
topics: [prompting]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Tell Claude what you want the outcome to be, not which functions to call. Claude is better at finding the right code path than you are at prescribing it.
---

Bad: "Call the `fetchUsers` function, then loop over the result and filter by `status === 'active'`, then render them in a table."

Good: "I want a page that shows only active users."

When you prescribe the steps, you constrain Claude to *your* solution — which may be worse than what it would write from scratch. Tell it the *outcome* (the business value, the user-visible behaviour) and let it pick the implementation. Then review the diff.

The one exception: if you have a hard constraint (a specific function MUST be used, a specific library is mandated), pin that as a constraint — but still let Claude pick the rest.

A get-unstuck move when the outcome feels fuzzy in your own head: describe the *user* and let Claude phrase the outcome for you.

> A retail customer-service agent is using this dashboard. They need to see — at a glance — which customers complained this week. Help me phrase the outcome I should be asking for.

Claude turns "I want… something useful for agents" into a sharp outcome line. Reuse that line as the actual ask.

## A template for the "why"

When you want this to be a habit rather than a thing you remember sometimes, there's a shape worth memorising:

> I'm working on **[the larger task]**. It's for **[who]**. This output would let them **[why it matters]**. With that in mind, **[the actual request]**.

Worked example:

> I'm preparing the quarterly complaints review. It's for the retail operations leads. They need to decide where to put two extra people next quarter. With that in mind, summarise `complaints-q3.csv` by product line.

The last sentence on its own would have produced a competent, generic summary. With the first three, Claude knows the summary needs to support a staffing decision — so it leads with volume and movement rather than, say, sentiment.

The reason isn't padding. It's what lets Claude make the hundred small judgement calls you didn't specify, in the direction you'd have picked.

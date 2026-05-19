---
type: tip
title: Describe the business value, not the steps
audience: beginner
topics: [prompting, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: Tell Claude what you want the outcome to be, not which functions to call. Claude is better at finding the right code path than you are at prescribing it.
---

Bad: "Call the `fetchUsers` function, then loop over the result and filter by `status === 'active'`, then render them in a table."

Good: "I want a page that shows only active users."

When you prescribe the steps, you constrain Claude to *your* solution — which may be worse than what it would write from scratch. Tell it the *outcome* (the business value, the user-visible behaviour) and let it pick the implementation. Then review the diff.

The one exception: if you have a hard constraint (a specific function MUST be used, a specific library is mandated), pin that as a constraint — but still let Claude pick the rest.

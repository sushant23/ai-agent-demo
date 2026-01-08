# Global AI Agent Behaviour — Next-Step Actions & Structured Recommendations

### **Objective**

Define global behavioural rules for the AI Agent to ensure consistent, action-oriented, deterministic interactions across all flows (SEO, Listings, Profitability, Inventory, Marketing, Strategy, Account).

These rules must be enforced across *all agent outputs, tools, and flow implementations*.

---

# ✅ **1. Explicit Next-Step Actions (Mandatory in Every Flow)**

The AI Agent must **always** offer clear, specific next-step actions at the end of every response — never vague alternatives like “What would you like to do?”

### **Requirements**

* Each agent answer must end with **2–4 actionable, concrete next steps**, based on the context of the conversation.
* These must map to real functionality the agent can execute (tools, UI actions, or follow-up flows).
* Actions must be presented in a way the user can trigger naturally using language (“optimise Lavender Soap”, “show low-stock items”, “rewrite email”, etc.).
* When relevant, agent should remind the user of what it can do next.

### **Examples**

**GOOD (explicit, actionable):**

* “Would you like to optimise this listing, see competitor pricing, or review your SEO tags?”
* “Should I show you the low-scoring listings, open one now, or generate improved content?”
* “I can simulate a supplier switch, compare costs, or analyse pricing impact — what would you like?”

**BAD (vague):**

* “What would you like to do next?”
* “Let me know if you need anything.”
* “Do you want more details?”

### **Developer Implications**

* Each flow definition must include recommended next-step options.
* Agent must map each user selection to a clear tool + UI action sequence.
* This behaviour must be part of the agent’s global policy → enforced at the LLM layer + tool routing layer.

---

# ✅ **2. Structured Recommendations with ID-Based Expansion**

Any time the agent provides **recommendations, insights, suggestions, or diagnosis**, these must be delivered in a **structured format** with unique IDs that allow expansion or drilling into deeper detail.

This applies to:

* Profitability recommendations
* SEO recommendations
* Pricing insights
* Inventory alerts
* Opportunity insights
* Marketing and strategy suggestions

### **Structured Recommendation Schema (Required)**

Every recommendation must have at minimum:

| Field | Description |
| -- | -- |
| `id` | Unique identifier for the recommendation |
| `title` | Short, clear title (e.g., “Improve Tags”, “Switch Supplier”, “Raise Price”) |
| `reason` | One-sentence explanation |
| `detail` | A longer explanation *only returned when user requests more detail* |
| `impact_estimate` (optional) | Numerical or qualitative impact (e.g., +8% margin) |

### **Agent Behaviour Requirements**

* The agent must **initially show only the title + reason**.
* When the user says “Expand this”, “Show me more”, “Why?”, “Explain that”, etc. —
  → the agent uses the **recommendation ID** to fetch the `detail` field.
* The agent must not hallucinate details not provided by recommendation objects or tools.
* Every recommendation returned by tools must be stored in context (`context.recommendations[product_id]`).

### **Example**

**Initial output (compact):**

1. **R-14: Switch to alternative supplier**
   Reason: Current supplier cost per unit is 18% higher than category average.
2. **R-22: Raise price from $12 → $14**
   Reason: You’re priced below market and operating at a thin margin.

**User:**
“Can you expand the first one?”

**Agent:**
(Uses `explain_recommendation(product_id, "R-14")`)
→ Shows full structured detail
→ Offers next-step actions: compare suppliers, simulate impact, open product page, etc.

### **Developer Implications**

* All services that produce recommendations must use this schema.
* Tools must support:
  * `get_recommendations(product_id)`
  * `explain_recommendation(product_id, recommendation_id)`
* LLM must be instructed **never to create new recommendation IDs** — only use those provided by tools.
* Global context must persist a dictionary of recommendations per product ID.

---

# 🔧 **Implementation Checklist for Dev Team**

### In LLM Layer

* Add global policy instructions enforcing explicit next-step prompts.
* Add policy requiring structured recommendation schema.

### In Tooling Layer

* Update recommendation-producing tools to return structured objects with unique IDs.
* Add `explain_recommendation()` tools for drill-down behaviour.

### In UI Layer

* Ensure agent-driven UI transitions exist for:
  * Opening product page/drawer
  * Switching to Profit/SEO tabs
  * Displaying filtered product lists
  * Displaying recommendation expansion UI

### In Memory/Context Layer

* Store recommendations under `context.recommendations[product_id]`.
* Maintain `context.active_product` and `context.active_recommendation`.

## Metadata
- URL: [https://linear.app/sprintr/issue/DEV-152/global-ai-agent-behaviour-next-step-actions-and-structured](https://linear.app/sprintr/issue/DEV-152/global-ai-agent-behaviour-next-step-actions-and-structured)
- Identifier: DEV-152
- Status: In Progress
- Priority: High
- Assignee: Bipin Bhandari
- Project: [AI Agent](https://linear.app/sprintr/project/ai-agent-8613cf5d486b). 
- Created: 2025-12-03T23:49:49.560Z
- Updated: 2025-12-27T10:10:01.959Z
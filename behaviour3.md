# Your Account (Flows 1-3)

### FLOW 1 — Account — Profile Request → User Profile Summary

#### User / Agent Script

**U:** Show me my profile.
*(or: “What details do you have about my account?”)*

**A:**
Here’s your current profile:

* Account name: **<Business Name>**
* Primary email: **<email>**
* Timezone: **<timezone>**
* Connected marketplaces: **<list>**
* Plan: **<plan name>**

Would you like to update any of these details or manage your subscriptions and connections?

---

#### UI Actions

* Opens **Account / Profile** page or panel
* Highlights Profile section with key info

---

#### Tools Required

* `get_user_profile(user_id)`
* `get_connected_marketplaces(user_id)`

---

#### State Produced

* `context.user_profile = object`

---

#### Edge-Case Handling

If profile is incomplete:

**A:**
Some of your profile information is missing (for example: business name or timezone).
Would you like me to take you to the profile page so you can complete it now?

---

---

### FLOW 2 — Account — Subscription Check → Plan Details Summary

#### User / Agent Script

**U:** What plan am I on?
*(or: “Remind me what I get with my plan.”)*

**A:**
You’re currently on the **<Plan Name>** plan, billed **<monthly/yearly>**.

Your plan includes:

* <X> connected marketplaces
* <Y> AI optimisation credits
* Access to: <key features: e.g. Profit Insights, Inventory Alerts, etc.>

Would you like to see upgrade options or manage your billing?

---

#### UI Actions

* Opens **Account → Billing / Plan** section
* Highlights current plan and features

---

#### Tools Required

* `get_subscription_details(user_id)`
* `get_plan_features(plan_id)`

---

#### State Produced

* `context.subscription = object`
* `context.plan_features = [features]`

---

#### Edge-Case Handling

If user is on a trial:

**A:**
You’re currently on a **trial of the <Plan Name>** plan, which ends on <date>.
Would you like to see what happens after the trial or explore other plans?

---

---

### FLOW 3 — Account — Goal Retrieval → Saved Goal Summary

#### User / Agent Script

**U:** What goals did I set when I signed up?
*(or: “What am I trying to achieve again?”)*

**A:**
During onboarding, you told me your main goals were:

* **Goal 1** (e.g. “Increase profit margin by 5%”)
* **Goal 2** (e.g. “Grow total revenue by 20% over 6 months”)

I can keep these in mind when suggesting actions, and we can also track progress against them.
Would you like an update on how you’re tracking toward these goals?

---

##### Branch — User asks for update

**U:** Yes, show me how I’m doing on those.

**A:**
Here’s your progress:

* **Profit margin goal:** Current margin: <X>% vs target <Y>%
* **Revenue goal:** Current growth: <X>% vs target <Y>%

Would you like to prioritise actions that move you closer to one of these goals?

---

#### UI Actions

* Opens **Account → Goals** panel, or overlays a goals summary
* If progress requested, opens a **Goals & Progress** widget on Dashboard

---

#### Tools Required

* `get_user_goals(user_id)`
* `get_goal_progress(goal_id)`

---

#### State Produced

* `context.user_goals = [goals]`
* `context.goal_progress = object`

---

#### Edge-Case Handling

If no goals are set:

**A:**
You haven’t set any explicit goals yet.
Would you like me to help you define 1–2 business goals so I can tailor my recommendations?

## Metadata
- URL: [https://linear.app/sprintr/issue/DEV-154/your-account-flows-1-3](https://linear.app/sprintr/issue/DEV-154/your-account-flows-1-3)
- Identifier: DEV-154
- Status: Todo
- Priority: High
- Assignee: Bipin Bhandari
- Project: [AI Agent](https://linear.app/sprintr/project/ai-agent-8613cf5d486b). 
- Created: 2025-12-03T23:43:52.063Z
- Updated: 2025-12-04T03:20:46.817Z
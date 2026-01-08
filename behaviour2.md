# General Assistence (Flows 1-5)

### FLOW 1 — AI Assistance — Marketing Strategy → Multi-Step Plan Generation

#### User / Agent Script

**U:** Can you help me with a marketing plan for my shop?
*(or: “How do I get more sales?”)*

**A:**
Absolutely. Based on your current products and performance, here’s a simple 4-week marketing plan:

**Week 1 – Fix the foundations**

* Optimise SEO for your top 5 products
* Improve images and descriptions on your best-sellers

**Week 2 – Email & existing customers**

* Send a simple “bestsellers” email to past customers
* Highlight your highest-margin products

**Week 3 – Promotion / bundle push**

* Create 1–2 bundles (e.g. Gift Sets)
* Run a limited-time promotion around them

**Week 4 – Review & iterate**

* Review what worked best
* Double-down on top channels/products

Would you like me to:

* suggest a specific email campaign,
* create suggested bundles, or
* pick the 5 products to optimise first?

---

#### UI Actions

* No mandatory UI navigation, but may:
  * open a **Marketing / Actions** panel, or
  * pin the marketing plan as a “Suggested Plan” card

---

#### Tools Required

* `get_top_products_by_revenue(period)`
* `get_high_margin_products()`
* (Optional) `create_marketing_plan_outline(goals, data)`

---

#### State Produced

* `context.marketing_plan = object`

---

#### Edge-Case Handling

If data is limited (new account):

**A:**
You don’t have much sales data yet, so I’ll base the plan on your current catalog rather than past performance.
Once you have a few weeks of sales, I can refine this with real numbers.

---

---

### FLOW 2 — AI Assistance — Email Writing → Draft Email Generation (Example Campaign)

#### User / Agent Script

**U:** Write an email to promote my best-selling soap.

**A:**
Got it. I’ll base this on your top-selling soap: **<Product Name>**.

Here’s a draft you can use in your email tool:

> **Subject:** Your new favourite everyday soap 💜
>
> **Body:**
> Hi <first name>,
> … \[full email copy with intro, benefits, social proof, CTA, etc.\]

Would you like me to adjust the tone (e.g. more playful, more premium) or write a version for a sale/promotion?

---

#### UI Actions

* Opens **AI Output / Email Draft** panel
* Allows user to copy text easily

---

#### Tools Required

* `get_top_product_by_revenue(period)`
* `generate_email_copy(product, tone, goal)`

---

#### State Produced

* `context.last_email_draft = text`
* `context.active_product = product_id`

---

#### Edge-Case Handling

If user wants a specific product instead:

**U:** No, use my *Charcoal Detox Bar* instead.

**A:**
Sure — I’ll rewrite the email for **Charcoal Detox Bar**.

> \[New email draft\]

---

---

### FLOW 3 — AI Assistance — Product Content → Description/Tag Rewrite

#### User / Agent Script

**U:** Improve the description for my Lemongrass Soap.

**A:**
Sure — I’ll pull the current details for **Lemongrass Soap** and craft an improved description and tags.

*(Agent calls product tools)*

Here’s an upgraded version:

> **New Description:**
> \[SEO-friendly, benefit-led, marketplace-appropriate copy\]

Suggested tags:

* <tag 1>, <tag 2>, <tag 3> …

Would you like to use this version?
I can open the optimisation drawer so you can review and apply it.

---

##### Branch — User wants it applied

**U:** Yes, let’s use it.

**A:**
Great — opening the SEO & Content Optimisation drawer for **Lemongrass Soap** with the new description and tags ready to apply.

---

#### UI Actions

* Resolve product by name → open **Product page**
* Open **SEO & Content Optimisation drawer**
* Pre-fill new description and tags in the draft area

---

#### Tools Required

* `search_products_by_name_or_fuzzy(query)`
* `get_product_details(product_id)`
* `generate_product_copy(product, marketplace, tone)`
* `open_product_page(product_id)`
* `open_seo_optimisation_drawer(product_id)`

---

#### State Produced

* `context.active_product = product_id`
* `context.proposed_description = text`
* `context.proposed_tags = [tags]`

---

#### Edge-Case Handling

If name is ambiguous:

**A:**
I found more than one product matching “Lemongrass”:

1. Lemongrass Soap Bar
2. Lemongrass & Lime Gift Set

Which one should I improve?

---

---

### FLOW 4 — AI Assistance — Business Strategy → High-Level Recommendation Summary

#### User / Agent Script

**U:** What should I focus on next to grow my business?

**A:**
Based on your current performance, here are three high-impact priorities:

1. **Improve SEO for low-scoring listings**
   You have <N> products with an SEO score under 60 that are still getting impressions.
2. **Increase margin on underperforming products**
   <N> listings have weak margins despite steady sales.
3. **Push your top performers harder**
   Your top 3 products account for <X>% of revenue — they’re your quickest win for growth.

We can:

* start with SEO improvements,
* review low-margin products, or
* double down on your bestsellers.

What would you like to tackle first?

---

##### Branch — user chooses one

**U:** Let’s start with the low-margin products.

**A:**
Great — here are your lowest-margin products:
<list>
Which one would you like to open first?

*(Then this plugs into your existing profitability drill-down flow.)*

---

#### UI Actions

* Optionally pins a “Next Best Actions”/“Co-pilot Suggestions” card
* May highlight relevant dashboard tiles (SEO, profit, top products)

---

#### Tools Required

* `get_low_seo_products(threshold)`
* `get_low_margin_products(threshold)`
* `get_top_products_by_revenue(period)`
* `generate_strategy_summary(data, goals)`

---

#### State Produced

* `context.strategy_recommendations = [items]`
* Links into other flows via: `context.selected_priority`

---

#### Edge-Case Handling

If user has very low data volume:

**A:**
You don’t have much data yet, so my suggestions will be more general.
Let’s start by making sure your core listings are well-written and well-priced.
Would you like to:

* optimise your top 3 products, or
* review pricing on your most expensive items?

## Metadata
- URL: [https://linear.app/sprintr/issue/DEV-153/general-assistence-flows-1-5](https://linear.app/sprintr/issue/DEV-153/general-assistence-flows-1-5)
- Identifier: DEV-153
- Status: Todo
- Priority: High
- Assignee: sushant.devkota@gmail.com
- Project: [AI Agent](https://linear.app/sprintr/project/ai-agent-8613cf5d486b). 
- Created: 2025-12-03T23:46:43.289Z
- Updated: 2025-12-22T23:13:32.806Z
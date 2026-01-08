# Business Performance (Flows 1–5)

# **FLOW 1 — Business Performance — Overview Request → Business Summary Snapshot**

## **User / Agent Script**

**U:** Give me an overview of my business.

**A:**
Here’s your current business snapshot:

* **Total listings:** <X>
* **Total sales this month:** <X>
* **Total revenue this month:** <X>
* **Top marketplace:** <Marketplace>
* **Top-selling product:** <Product>

Would you like a breakdown by marketplace, product, or time period?

---

## **UI Actions**

* Highlights key metrics tiles (Listings, Revenue, Sales)

---

## **Tools Required**

* `get_total_listings(user_id)`
* `get_total_sales(period)`
* `get_total_revenue(period)`
* `get_top_marketplace(period)`
* `get_top_product(period)`

---

## **State Produced**

* `context.business_overview = object`

---

## **Edge-Case Handling**

If there is no recent sales activity:

**A:** You haven’t had any sales in the selected period.
Would you like to expand the date range or look at your most-viewed products instead?

---

---

# **FLOW 2 — Business Performance — SEO Analysis → Average Score Summary & Action Prompt (Updated)**

## **User / Agent Script**

**U:** What’s my average SEO score?

**A:**
Your average SEO score across all listings is **<X>**.
I’ve noticed **<N> listings** are below 60 and could benefit from optimisation.

I can:

* show you all low-scoring listings, or
* jump straight into optimising a specific listing if you tell me its name.

What would you like to do?

---

### Branch A — User asks to *see* low-scoring listings

**U:** Show me the low-scoring ones.

**A:**
Here are your listings with an SEO score below 60:
<list: title, marketplace, SEO score>

If you’d like to optimise any of these, just tell me the listing name (for example: “optimise Lemongrass Soap”) and I’ll open the SEO & Content Optimisation drawer for you.

---

### Branch B — User jumps straight to optimisation by name

**U:** Optimise *Lemongrass Soap*.
*(User might also say: “fix the lemongrass one”, “let’s improve Lemongrass”, “go ahead with Lemongrass” etc.)*

**A:**
Got it — opening **Lemongrass Soap** for SEO and content optimisation.

*(UI: Agent loads Product Listing page for that listing and opens the SEO & Content Optimisation drawer.)*

You’ll now see the optimisation panel for **Lemongrass Soap**.
From here, we can:

* improve the title,
* rewrite the description, 
* refresh tags to target better keywords.
* generate new images and videos

---

## **UI Actions**

* Show SEO Score summary on Dashboard / Performance area
* When user asks to *see* low scores:
  * Open Product List page filtered to `SEO score < 60`
* When user asks to *optimise* a specific listing:
  * Resolve listing by name / fuzzy match
  * Open **Product Listing page** for that product and SEO and Content tab
  * Open **SEO & Content Optimisation drawer** for that listing

---

## **Tools Required**

* `get_average_seo_score(user_id)`
* `count_low_seo_products(threshold)`
* `filter_products_by_seo(threshold)`
* `search_products_by_name_or_fuzzy(query)` ← to resolve “lemongrass one”
* `open_product_page(product_id)`
* `open_seo_optimisation_drawer(product_id)`
* (Optional future) `start_seo_optimisation_job(product_id, scope)`

---

## **State Produced**

* `context.average_seo_score = X`
* `context.low_seo_products = [product_ids]`
* `context.active_product = product_id` (when user selects listing)
* `context.active_panel = "seo_optimisation_drawer"`

---

## **Edge-Case Handling**

### 1\. SEO scores missing

**A:**
It looks like some of your products haven’t been analysed yet.
Would you like me to run SEO scoring now and then show you which listings need the most help?

*(If yes: call SEO scoring tool / pipeline, then re-run average + low-score list.)*

---

### 2\. Ambiguous listing name

**U:** Optimise the lavender one.

**A:**
I found multiple products matching “lavender”:

1. Lavender 200g Soap
2. Lavender & Citrus Gift Pack

Which one would you like me to optimise?

---

# **FLOW 3 — Business Performance — Top Products → High Performer Identification (Revenue Example)**

## **User / Agent Script**

**U:** Which products are performing the best?

**A:**
Your top-performing products this month (by revenue) are:
<list: product + revenue>
These listings are driving most of your sales momentum.
Would you like a deep dive into any of these products or compare them across marketplaces?

---

## **UI Actions**

* Shows “Top Products” chart/list in Agent window

---

## **Tools Required**

* `get_top_products_by_revenue(period)`
* `get_product_performance(product_id, period)`

---

## **State Produced**

* `context.top_products = [ids]`

---

## **Edge-Case Handling**

If revenue is fragmented:

**A:** Your top sellers are fairly close in performance — would you like me to analyse trends or identify growth opportunities?

---

---

# **FLOW 4 — Business Performance — Marketplace Breakdown → Profit Comparison Across Channels**

## **User / Agent Script**

**U:** Which marketplace is most profitable for me?

**A:**
Here’s your profitability breakdown by marketplace for <period>:

* **Shopify:** <margin %>
* **Amazon:** <margin %>
* **eBay:** <margin %>
* **Wix / WooCommerce:** <margin %>

Your highest profitability is currently on **<Marketplace>**, primarily due to lower fees and stronger pricing.
Would you like product-level insights for this marketplace?

---

## **Tools Required**

* `get_profit_by_marketplace(period)`
* `compare_marketplace_profitability()`

---

## **State Produced**

* `context.marketplace_profitability = object`

---

## **Edge-Case Handling**

If a marketplace has incomplete data:

**A:** I don’t have complete cost data for <Marketplace>.
Would you like me to guide you through updating your product costs?

---

---

# **FLOW 5 — Business Performance — Ranking Request → Most & Least Profitable Products Overview**

*(This flow pairs naturally with the detailed profitability flow you approved earlier.)*

## **User / Agent Script**

**U:** Show me my most profitable and least profitable products.

**A:**
Here’s your profitability ranking for this month:

**Most profitable:**
<top list with margins + revenue>

**Least profitable:**
<bottom list with margins + revenue>

I can walk you through ways to improve low-performing listings, show specific recommendations, or open any product for deeper analysis.
What would you like to do?

## Metadata
- URL: [https://linear.app/sprintr/issue/DEV-155/business-performance-flows-1-5](https://linear.app/sprintr/issue/DEV-155/business-performance-flows-1-5)
- Identifier: DEV-155
- Status: Todo
- Priority: High
- Assignee: Bipin Bhandari
- Project: [AI Agent](https://linear.app/sprintr/project/ai-agent-8613cf5d486b). 
- Created: 2025-12-03T23:42:38.806Z
- Updated: 2025-12-05T05:55:30.055Z
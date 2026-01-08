# Product Queries — Full Catalog Request → Product Overview List (Flow 1 - 4)

General note: the AI Agent should have access to all the customers data related to their business performance/listings

e.g. If User asks Agent 'Show me exactly how much profit I’ll gain if I follow your recommendations'

Agent should a) know which product the user is vieweing b) have access to the AI Insights c) have access to all data related to listing e.g. in this case, the COGS of the listing.

# **FLOW 1 — Product Queries — Full Catalog Request → Product Overview List**

## **User / Agent Script**

**U:** Show me all my products.

**A:**
Sure — you currently have **<X> products** across <marketplaces>.
Here’s a quick overview of your catalog:
<list: product title, price, SEO score, marketplace>
Would you like to filter these, search for something specific, or open one to view its full details?

---

## **UI Actions**

* Opens the Product List page (if not visible)
* Highlights totals (products, stores, marketplaces)

---

## **Tools Required (or whatever we call our tools in langchain)**

* `list_all_products(user_id)`
* `count_products(user_id)`
* `aggregate_by_marketplace(user_id)`

---

## **State Produced**

* `context.product_list = [ids]`

---

## **Edge-Case Handling**

If user has 0 products:

**A:** You don’t have any products synced yet.
Would you like me to guide you through the sync process?

---

# **FLOW 2 — Product Queries — Search → Product Identification (Fuzzy Match Example)**

## **User / Agent Script**

**U:** Find “pepper soap.”
*(User means “Peppermint Soap”).*

**A:**
I didn’t find an exact match for “pepper soap,” but the closest match is **Peppermint Soap**.
Here are the details:
<title, price, SEO score, tags>
Would you like to open it, optimise it, or compare variants?

---

## **UI Actions**

* Highlights matched product
* Opens Product Drawer if user requests

---

## **Tools Required**

* `search_products(query)`
* `fuzzy_match_title(query)`
* `open_product_drawer(product_id)`

---

## **State Produced**

* `context.active_product = product_id`

---

## **Edge-Case Handling**

If multiple matches:

**A:** I found several products that match that search — which one did you mean?
<list of 3–5 closest titles>

---

# **FLOW 3 — Product Queries — Filter → Product Set Narrowing (SEO/Price/Marketplace Example)**

## **User / Agent Script**

**U:** Show me products with an SEO score below 60.

**A:**
Here are all products with an SEO score below **60**:
<list>
These likely need optimisation. Would you like me to fix any of them? You can just say the name of the listing.

---

### Additional variations the agent must support:

**U:** Show me all products under $15.
**U:** Show me only Amazon products.
**U:** Filter by Shopify + price above $20.
**U:** Filter my products by low conversion.

---

## **UI Actions**

* Updates Product List using filters
* Flags SEO-challenged items visually

---

## **Tools Required**

* `filter_products(price_min?, price_max?, seo_min?, seo_max?, marketplace?)`
* `sort_products(metric?)`

---

## **State Produced**

* `context.filtered_products = [ids]`

---

## **Edge-Case Handling**

If filter returns 0 products:

**A:** I couldn’t find products matching that filter.
Would you like to adjust the range?

---

# **FLOW 4 — Product Queries — Drill-Down → Product Detail Expansion (SEO/Tags/Competitors Example)**

## **User / Agent Script**

**U:** Open the Lavender 200g soap.

**A:**
Sure — here are the details for **Lavender 200g Soap**:

* Title, description
* Price
* SEO Score
* Tags
* Competitor pricing
  Would you like me to optimise the listing, suggest updated tags, rewrite the description, or review the competitors?

---

## **UI Actions**

* Opens Product Drawer
* Opens default Info tab
* Shows competitors section (if enabled)

---

## **Tools Required**

* `get_product_details(product_id)`
* `get_competitor_data(product_id)`
* `open_product_drawer(product_id)`

---

## **State Produced**

* `context.active_product = product_id`
* `context.active_product_details = object`

---

## **Edge-Case Handling**

If competitor data is missing:

**A:** I don’t have competitor data for this product yet — would you like me to run a competitor scan?

---

---

## Metadata
- URL: [https://linear.app/sprintr/issue/DEV-156/product-queries-full-catalog-request-→-product-overview-list-flow-1-4](https://linear.app/sprintr/issue/DEV-156/product-queries-full-catalog-request-→-product-overview-list-flow-1-4)
- Identifier: DEV-156
- Status: Todo
- Priority: High
- Assignee: Bipin Bhandari
- Project: [AI Agent](https://linear.app/sprintr/project/ai-agent-8613cf5d486b). 
- Created: 2025-12-03T23:37:09.200Z
- Updated: 2025-12-05T05:56:25.233Z
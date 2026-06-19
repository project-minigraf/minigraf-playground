import type { Lesson, Tutorial } from '@/lib/types'

const SETUP = `; Sellers
(transact [[:corestore-direct :seller/name "Corestore Direct"]
           [:corestore-direct :seller/sla-days 3]
           [:techsource :seller/name "TechSource"]
           [:techsource :seller/sla-days 7]
           [:gadgethaus :seller/name "GadgetHaus"]
           [:gadgethaus :seller/sla-days 5]])

; Products
(transact [[:laptop-pro :product/name "LaptopPro 15"]
           [:phone-x :product/name "PhoneX 12"]
           [:nc-headphones :product/name "NoiseCancel Pro"]
           [:usb-cable :product/name "USB-C Cable"]
           [:keyboard-k1 :product/name "Compact Keyboard"]])

; Seller listings (per-seller pricing)
(transact [[:listing-cd-laptop :listing/seller :corestore-direct]
           [:listing-cd-laptop :listing/product :laptop-pro]
           [:listing-cd-laptop :listing/price 1299]
           [:listing-ts-laptop :listing/seller :techsource]
           [:listing-ts-laptop :listing/product :laptop-pro]
           [:listing-ts-laptop :listing/price 1249]
           [:listing-cd-phone :listing/seller :corestore-direct]
           [:listing-cd-phone :listing/product :phone-x]
           [:listing-cd-phone :listing/price 799]
           [:listing-gh-phone :listing/seller :gadgethaus]
           [:listing-gh-phone :listing/product :phone-x]
           [:listing-gh-phone :listing/price 819]
           [:listing-cd-nc :listing/seller :corestore-direct]
           [:listing-cd-nc :listing/product :nc-headphones]
           [:listing-cd-nc :listing/price 249]
           [:listing-ts-nc :listing/seller :techsource]
           [:listing-ts-nc :listing/product :nc-headphones]
           [:listing-ts-nc :listing/price 229]
           [:listing-cd-usb :listing/seller :corestore-direct]
           [:listing-cd-usb :listing/product :usb-cable]
           [:listing-cd-usb :listing/price 19]
           [:listing-ts-keyboard :listing/seller :techsource]
           [:listing-ts-keyboard :listing/product :keyboard-k1]
           [:listing-ts-keyboard :listing/price 89]])

; Customers
(transact [[:alice :customer/name "Alice"]
           [:ben :customer/name "Ben"]
           [:clara :customer/name "Clara"]])

; Orders
(transact [[:order-a1 :order/customer :alice]
           [:order-a1 :order/seller :corestore-direct]
           [:order-a1 :order/status :delivered]
           [:order-b1 :order/customer :ben]
           [:order-b1 :order/seller :techsource]
           [:order-b1 :order/status :delivered]
           [:order-c1 :order/customer :clara]
           [:order-c1 :order/seller :gadgethaus]
           [:order-c1 :order/status :placed]
           [:order-a2 :order/customer :alice]
           [:order-a2 :order/seller :corestore-direct]
           [:order-a2 :order/status :placed]])

; Order items
(transact [[:order-a1-i1 :item/order :order-a1]
           [:order-a1-i1 :item/product :laptop-pro]
           [:order-a1-i1 :item/price 1299]
           [:order-b1-i1 :item/order :order-b1]
           [:order-b1-i1 :item/product :laptop-pro]
           [:order-b1-i1 :item/price 1249]
           [:order-b1-i2 :item/order :order-b1]
           [:order-b1-i2 :item/product :nc-headphones]
           [:order-b1-i2 :item/price 229]
           [:order-c1-i1 :item/order :order-c1]
           [:order-c1-i1 :item/product :phone-x]
           [:order-c1-i1 :item/price 819]
           [:order-a2-i1 :item/order :order-a2]
           [:order-a2-i1 :item/product :usb-cable]
           [:order-a2-i1 :item/price 19]])`

const lesson1: Lesson = {
  id: 'marketplace-1',
  title: 'Multi-seller joins',
  description: 'Query across sellers, products, and orders using multi-hop joins and expression clause filters.',
  steps: [
    {
      id: 'm1-s1',
      instruction: `## Step 1: List all orders with customer and seller

The marketplace dataset has sellers, products, listings (per-seller pricing), customers, orders, and order items. Run the setup and query to see every order alongside its customer name and seller name.

The query walks three entity hops: \`order → :order/customer → :customer/name\` and \`order → :order/seller → :seller/name\`.`,
      starterCode: `${SETUP}

(query [:find ?customer-name ?seller-name ?status
        :where [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]
               [?order :order/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?order :order/status ?status]])`,
      expectedResult: {
        columns: ['?customer-name', '?seller-name', '?status'],
        rows: [
          ['Alice', 'Corestore Direct', ':delivered'],
          ['Ben', 'TechSource', ':delivered'],
          ['Clara', 'GadgetHaus', ':placed'],
          ['Alice', 'Corestore Direct', ':placed'],
        ],
      },
      hints: [
        'Each `[pattern]` clause narrows the set of matching bindings — chain them to walk entity relationships.',
        'Variables like `?cust` and `?seller` act as join keys: whatever `?order` binds for `:order/customer`, `?cust` carries into the next clause.',
      ],
      successMessage: 'All four orders retrieved with their customer and seller names.',
    },
    {
      id: 'm1-s2',
      instruction: `## Step 2: Filter orders by seller

Add a keyword literal clause to restrict results to a single seller. Placing \`[?order :order/seller :techsource]\` before the name join means only orders whose seller is exactly \`:techsource\` survive.`,
      starterCode: `${SETUP}

(query [:find ?customer-name ?status
        :where [?order :order/seller :techsource]
               [?order :order/customer ?cust]
               [?cust :customer/name ?customer-name]
               [?order :order/status ?status]])`,
      expectedResult: {
        columns: ['?customer-name', '?status'],
        rows: [['Ben', ':delivered']],
      },
      hints: [
        'Using a keyword literal like `:techsource` instead of a variable binds the pattern to that exact entity.',
        'Order of clauses does not change the result, but putting the most selective clause first can help you reason about the query.',
      ],
      successMessage: "Filtered to TechSource's single order — Ben's delivered purchase.",
    },
    {
      id: 'm1-s3',
      instruction: `## Step 3: Compare prices across sellers

The listing entity bridges a seller to a product with a price. Query all listings to see every seller's price for every product, then add an expression clause \`[(< ?price 300)]\` to surface only the budget items.`,
      starterCode: `${SETUP}

(query [:find ?seller-name ?product-name ?price
        :where [?listing :listing/seller ?seller]
               [?seller :seller/name ?seller-name]
               [?listing :listing/product ?product]
               [?product :product/name ?product-name]
               [?listing :listing/price ?price]
               [(< ?price 300)]])`,
      expectedResult: {
        columns: ['?seller-name', '?product-name', '?price'],
        rows: [
          ['Corestore Direct', 'NoiseCancel Pro', '249'],
          ['TechSource', 'NoiseCancel Pro', '229'],
          ['Corestore Direct', 'USB-C Cable', '19'],
          ['TechSource', 'Compact Keyboard', '89'],
        ],
      },
      hints: [
        'Expression clauses like `[(< ?price 300)]` filter rows after all triple patterns are matched — all variables must already be bound.',
        'Remove the expression clause to see all 8 listings and observe that NoiseCancel Pro appears twice (one listing per seller).',
      ],
      successMessage: 'Cross-seller price comparison working — the listing entity is the join bridge.',
    },
    {
      id: 'm1-s4',
      instruction: `## Step 4: Find fast sellers

Write a query that lists every seller name alongside its SLA commitment (in days), then add an expression clause to keep only sellers with an SLA of fewer than 6 days.

This step is open-ended — the tutor will give feedback.`,
      starterCode: `${SETUP}

; Query all sellers and their SLA, then filter for fast ones
(query [:find ?seller-name ?sla
        :where [?seller :seller/name ?seller-name]
               [?seller :seller/sla-days ?sla]])`,
      hints: [
        'Add `[(< ?sla 6)]` after the two triple patterns to filter the results.',
        'Corestore Direct (3 days) and GadgetHaus (5 days) both qualify; TechSource (7 days) does not.',
      ],
      successMessage: 'You filtered sellers by a numeric attribute using an expression clause.',
    },
  ],
}

export const tutorialMarketplace: Tutorial = {
  id: 'marketplace',
  title: 'Corestore Marketplace',
  description: 'Model a multi-seller e-commerce platform with temporal price tracking.',
  goals: 'multi-seller joins, temporal price comparison, aggregates per seller, negation, and disjunction',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [lesson1],
}

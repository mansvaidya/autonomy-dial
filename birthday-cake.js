// The birthday-cake lesson: the worked example from the paper's persona
// demonstrations (order, customize and send a cake), on the Basketly demo
// marketplace, from the Summit Warehouse Club.
//
// A step is:
//   id           stable id (for logs)
//   view         the shop view the step happens on (null = any)
//   target       CSS selector the Teacher highlights; the person acts on it
//   instruction  what to do, in full
//   short        a shorter reminder, for someone who has done this before
//   why          the reason behind the step (transferable knowledge)
//   hints        increasingly specific help when the person is stuck
//   getBack      what to say if the person has moved somewhere else
//   getBackTarget  what to highlight in that case
//   sensitive    the person types private data themselves; the Teacher never reads it
//   learned      a phrase for the closing recap ("You chose the store, …")
//   doneWhen     (shopState) => boolean; the goal of the step. It also accepts
//                later evidence (the cake is already in the cart), so a person
//                who goes ahead of the Teacher is never pulled back.
//   learnedWhen  (optional) stricter check for the recap

const CAKE = 'choc-mousse-cake'; // the suggestion when the agent picks for you
// A cake is safe for the granddaughter when the shop says it has no nuts.
const safeCake = (s) => !!(s.productIsCake && s.productHasNuts === false);
const inCart = (s) => !!s.cartHasCake && !s.cartHasNutCake;
const pastCart = (s) => (s.view === 'checkout' || s.view === 'confirmation') && !s.cartHasNutCake;
const sec = (id) => `.modal [data-guide="${id}"] .pm-sec-head`;

export const birthdayCake = {
  id: 'birthday-cake',
  title: 'How to order a birthday cake online',
  goal: 'order a birthday cake',
  site: 'basketly',
  brief: 'Your granddaughter\'s birthday is this weekend. Send her a birthday cake with a message, from Summit Warehouse Club. She is allergic to nuts, so the cake must be nut-free: check its allergens before you buy. Pay with the printed test card.',
  steps: [
    {
      id: 'choose-store',
      kind: 'find',
      narrate: 'Opening Summit Warehouse Club.',
      perform: (h) => h.click('[data-guide="store-summit"] button'),
      view: 'home',
      target: '[data-guide="store-summit"]',
      instruction: 'First, choose the store. On this page you\'ll see a list of stores under "Stores near you". Find Summit Warehouse Club, with the dark blue circle, and click it.',
      short: 'Click Summit Warehouse Club in the list of stores.',
      why: 'Delivery apps like this one carry many stores. Each has its own prices and delivery times, so you choose the store before you choose the items.',
      hints: [
        'The store list is just below the purple banner and the row of round buttons. Summit Warehouse Club is the first store, with a dark blue circle and a letter S.',
        'Look for the words "Summit Warehouse Club" in the first box under "Stores near you", and click anywhere on that box.',
      ],
      getBack: 'To choose Summit, go back to the list of stores: click the word basketly at the top left of the page.',
      getBackTarget: '[data-guide="logo"]',
      learned: 'chose the store',
      doneWhen: (s) => (s.storeId === 'summit' && s.view !== 'home') || inCart(s) || pastCart(s),
    },
    {
      id: 'search',
      kind: 'find',
      narrate: 'Searching Summit for "chocolate cake".',
      perform: (h) => h.type('#bk-q', 'chocolate cake', { submit: true }),
      view: null,
      target: '[data-guide="search"]',
      instruction: 'You\'re in Summit\'s store now. Next, find the search bar at the top of the page, the long box that says "Search Summit Warehouse Club". Click in it, type "chocolate cake", and press Enter.',
      short: 'Search for "chocolate cake" in the bar at the top.',
      why: 'A big store has hundreds of items. Searching takes you straight to what you want, and the search bar is in the same spot on almost every shopping site.',
      hints: [
        'The search bar is the long, rounded box at the very top, between the word basketly and the cart button.',
        'Click once inside that long box at the top so the cursor blinks, then type the words chocolate cake and press the Enter key.',
      ],
      learned: 'searched for what you wanted',
      doneWhen: (s) => (/cake/i.test(s.query || '') && s.view === 'results') || s.productIsCake || inCart(s) || pastCart(s),
    },
    {
      id: 'filter-nut-free',
      kind: 'find',
      narrate: 'Turning on the Nut-free filter.',
      perform: (h) => h.click('[data-guide="filter-nut-free"]'),
      view: 'results',
      target: '[data-guide="filter-nut-free"]',
      instruction: 'There are lots of cakes here, and some have nuts. Above the results there\'s a row of filters. Click "Nut-free" so the list only shows cakes made without nuts.',
      short: 'Click the "Nut-free" filter above the results.',
      why: 'Filters narrow a long list to what fits your needs. They\'re a first pass, though: you still check the item itself before buying.',
      hints: [
        'The filters are small rounded buttons just above the cake pictures, after the word "Filter".',
        'Click the button that says "Nut-free". It turns purple with a check mark when it\'s on.',
      ],
      getBack: 'To use the filter, go back to the results: search for "chocolate cake" again in the bar at the top.',
      getBackTarget: '[data-guide="search"]',
      learned: 'filtered out cakes with nuts',
      doneWhen: (s) => !!(s.filters && s.filters.nutFree) || s.productIsCake || inCart(s) || pastCart(s),
      learnedWhen: (s) => !!(s.filters && s.filters.nutFree),
    },
    {
      id: 'open-product',
      kind: 'find',
      narrate: 'Opening the Chocolate Mousse Cake. It\'s listed as nut-free, but we\'ll check.',
      perform: (h) => h.click(`.pgrid [data-guide="product-${CAKE}"] .pcard-hit, [data-guide="product-${CAKE}"] .pcard-hit`),
      view: null,
      target: `[data-guide="product-${CAKE}"]`,
      instruction: 'Now pick a cake you like and click its picture or its name to open it. If you\'re not sure, the Chocolate Mousse Cake, the first one, is a good choice.',
      short: 'Open a cake you like.',
      why: 'The results only show a summary. Opening an item shows its details, its allergens and its choices, like size.',
      hints: [
        'The Chocolate Mousse Cake is the first item in the results, a round dark chocolate cake for $14.99.',
        'Click right on a cake\'s picture. Don\'t click the small "Add" button on the corner; click the picture itself.',
      ],
      learned: 'opened the cake',
      doneWhen: (s) => s.productIsCake || inCart(s) || pastCart(s),
    },
    {
      id: 'check-details',
      kind: 'find',
      narrate: 'Opening the cake\'s details.',
      perform: (h) => h.click(sec('details')),
      view: 'product',
      target: '[data-guide="details"]',
      instruction: 'Before choosing anything, read about the cake. Scroll down inside the cake\'s window and click "Details" to open it.',
      short: 'Open "Details" in the cake\'s window.',
      why: 'The details say what you\'re really getting, like how many people it serves and how to store it. The photo alone doesn\'t tell you.',
      hints: [
        'Below the "Add to cart" button there are sections with a plus sign: Details, Ingredients, Allergens and Reviews.',
        'Scroll down inside the white window and click the word "Details". It opens to show a short description.',
      ],
      getBack: 'The cake\'s window has closed. Open the cake again by clicking its picture.',
      getBackTarget: '.pgrid .pcard',
      learned: 'read the details',
      doneWhen: (s) => !!(s.productIsCake && s.detailsOpened) || inCart(s) || pastCart(s),
    },
    {
      id: 'check-allergens',
      kind: 'find',
      narrate: 'Checking the allergens.',
      perform: (h) => h.click(sec('allergens')),
      view: 'product',
      target: '[data-guide="allergens"]',
      instruction: 'Now the most important check: allergens. Click "Allergens", just below Details and Ingredients, and look for nuts. It should say "Made without nuts".',
      short: 'Open "Allergens" and check for nuts.',
      why: 'A filter can be wrong or out of date, so for an allergy you always read the item\'s own allergen list. If it lists nuts, it isn\'t safe for her.',
      hints: [
        'The Allergens section is below Details and Ingredients, near the bottom of the cake\'s window. There\'s also an "Allergens" link under the stars at the top.',
        'Click the word "Allergens". A green box means no nuts; an orange box with a warning sign means it contains nuts.',
      ],
      getBack: 'The cake\'s window has closed. Open a cake again by clicking its picture.',
      getBackTarget: '.pgrid .pcard',
      learned: 'checked the allergens',
      doneWhen: (s) => !!(safeCake(s) && s.allergensOpened) || inCart(s) || pastCart(s),
    },
    {
      id: 'read-reviews',
      kind: 'find',
      narrate: 'Opening the reviews.',
      perform: (h) => h.click(sec('reviews')),
      view: 'product',
      target: '[data-guide="reviews"]',
      instruction: 'This cake has no nuts. Last check: open "Reviews" at the bottom to see what other people said about it.',
      short: 'Open "Reviews".',
      why: 'Reviews tell you about things the shop doesn\'t, like whether it arrived on time or looked like the photo.',
      hints: [
        'Reviews is the last section in the cake\'s window, below Allergens. You can also click the stars near the cake\'s name.',
        'Click the word "Reviews". It shows a few short comments with star ratings.',
      ],
      getBack: 'The cake\'s window has closed. Open the cake again by clicking its picture.',
      getBackTarget: '.pgrid .pcard',
      learned: 'read the reviews',
      doneWhen: (s) => !!(safeCake(s) && s.reviewsOpened) || inCart(s) || pastCart(s),
    },
    {
      id: 'size',
      kind: 'choose',
      prefill: true,
      ask: 'It comes in 7 inch, which serves 6 to 8, or 10 inch, which serves 12 to 16. The prices are on each choice. Which size would you like?',
      askShort: 'which size, 7 inch or 10 inch?',
      options: () => ['7 inch', '10 inch'],
      parse: (u) => (/\b(10|ten)\b|\bbig(ger)?\b|\blarge\b/i.test(u) ? '10 inch' : /\b(7|seven)\b|\bsmall(er)?\b/i.test(u) ? '7 inch' : null),
      narrate: (v) => `Choosing the ${v} size.`,
      perform: (h, v) => h.click(`.opt-pill[data-size="${v}"]`),
      view: 'product',
      target: '[data-guide="size"]',
      instruction: 'The cake\'s page has opened on top of the store. Now choose a size. Under "Choose a size", pick 7 inch or 10 inch. The price changes with the size.',
      short: 'Pick a size under "Choose a size".',
      why: 'Many items have choices that change the price, and the shop needs a choice before it can add the item. It\'s worth checking these before adding anything.',
      hints: [
        'The size choices are two boxes on the right, under the price, labelled 7 inch and 10 inch.',
        'Click the box that says 10 inch, or 7 inch for a smaller cake. It turns purple when it\'s chosen. You may need to scroll down a little inside the cake\'s window.',
      ],
      getBack: 'The cake\'s window has closed. To choose a size, open the cake again by clicking its picture.',
      getBackTarget: '.pgrid .pcard',
      learned: 'chose the size',
      doneWhen: (s) => !!(safeCake(s) && s.size) || inCart(s) || pastCart(s),
    },
    {
      id: 'message',
      kind: 'choose',
      prefill: true,
      ask: 'What would you like written on the cake? You can also say "no message".',
      askShort: 'what should the message say?',
      parse: (u, s, opts = {}) => {
        if (opts.upfront) { const m = String(u).match(/(?:saying|that says|message|write)\s*:?\s*["“']([^"”']{1,40})["”']/i); return m ? m[1].trim() : null; }
        if (/^\s*(no( message)?|none|nothing|skip( it)?|leave it blank)\s*[.!]?\s*$/i.test(u)) return '';
        const t = String(u).replace(/^\s*(it should say|have it say|please write|write|say|put|the message is|make it say|message)\s*:?\s*/i, '').replace(/^["“']|["”'.]$/g, '').trim();
        return t ? t.slice(0, 40) : null;
      },
      narrate: (v) => (v ? `Typing "${v}" as the message.` : 'Leaving the message blank.'),
      perform: (h, v) => (v ? h.type('#bk-msg', v) : 'skip'),
      view: 'product',
      target: '[data-guide="message"]',
      instruction: 'Next, the message for the cake. Click in the box labelled "Message on the cake" and type what you\'d like written, for example "Happy Birthday, Maya".',
      short: 'Type your message in "Message on the cake".',
      why: 'The bakery writes exactly what you type, so it\'s worth checking the spelling before you move on.',
      hints: [
        'The message box is just below the size choices.',
        'Click inside the empty box under "Message on the cake" so the cursor blinks, then type your message. Say "done" when you have.',
      ],
      getBack: 'To add a message, open the cake again by clicking its picture.',
      getBackTarget: '.pgrid .pcard',
      learned: 'added a message',
      doneWhen: (s) => !!(safeCake(s) && s.messageFilled) || inCart(s) || pastCart(s),
      learnedWhen: (s) => !!s.messageFilled || !!s.cartHasMessage,
    },
    {
      id: 'add-to-cart',
      kind: 'do',
      narrate: 'Adding the cake to your cart.',
      perform: (h) => h.click('.modal [data-guide="add-to-cart"]'),
      view: 'product',
      target: '[data-guide="add-to-cart"]',
      instruction: 'Now click the purple "Add to cart" button, below the message box.',
      short: 'Click "Add to cart".',
      why: 'Adding to the cart doesn\'t buy anything yet. It\'s like putting it in a basket; you can still change your mind.',
      hints: [
        'The "Add to cart" button is the long purple button below the message box, next to "Qty".',
        'Scroll down a little inside the cake\'s window if you need to, then click the purple button that says "Add to cart".',
      ],
      getBack: 'The cake isn\'t in your cart yet. Open the cake again by clicking its picture.',
      getBackTarget: '.pgrid .pcard',
      learned: 'put it in your cart',
      doneWhen: (s) => inCart(s) || pastCart(s),
    },
    {
      id: 'open-cart',
      kind: 'do',
      narrate: 'Opening your cart.',
      perform: (h) => h.click('[data-guide="view-cart"], [data-guide="cart"]'),
      view: null,
      target: '[data-guide="view-cart"], [data-guide="cart"]',
      instruction: 'The cake is in your cart. Now open the cart: click the "View cart" button, or the cart button at the top right of the page.',
      short: 'Open the cart.',
      why: 'The cart is where you check everything before paying. It\'s almost always in the top right corner.',
      hints: [
        'In the cake\'s window there\'s now a purple "View cart" button. At the top right of the page, the cart button shows a number 1.',
        'Click the purple button that says "View cart".',
      ],
      doneWhen: (s) => s.view === 'cart' || pastCart(s),
    },
    {
      id: 'checkout',
      kind: 'do',
      narrate: 'Going to checkout.',
      perform: (h) => h.click('[data-guide="checkout"]'),
      view: 'cart',
      target: '[data-guide="checkout"]',
      instruction: 'Your cart has opened on the right. Check that it shows the cake with the right size and message, then click "Go to checkout" at the bottom.',
      short: 'Check the cart, then "Go to checkout".',
      why: 'Checking the cart now is easier than fixing a mistake after the order is placed.',
      hints: [
        'The "Go to checkout" button is the purple button at the bottom of the cart, with the price on it.',
        'Click the long purple button at the bottom of the cart panel that says "Go to checkout".',
      ],
      getBack: 'The cart has closed. Open it again with the cart button at the top right.',
      getBackTarget: '[data-guide="cart"]',
      learned: 'checked the cart',
      doneWhen: (s) => pastCart(s),
    },
    {
      id: 'address',
      kind: 'private',
      view: 'checkout',
      target: '[data-guide="address"]',
      instruction: 'This is the checkout page. First, type the delivery address under "Delivery address": the street, the city and the ZIP code. If it\'s for a friend, use their address.',
      short: 'Type the delivery address.',
      why: 'The address is printed on the label exactly as you type it, so it\'s worth a quick re-read.',
      hints: [
        'The address boxes are in the first section, numbered 1, at the top of the page.',
        'Click in the box that says "Street address" and type it, then do the same for "City" and "ZIP code". The apartment and state boxes are optional.',
      ],
      getBack: 'To finish the address, go back to checkout: open the cart at the top right, then click "Go to checkout".',
      getBackTarget: '[data-guide="cart"]',
      sensitive: true,
      learned: 'entered the address',
      doneWhen: (s) => !!s.addressFilled || s.view === 'confirmation',
    },
    {
      id: 'delivery-time',
      kind: 'choose',
      prefill: true,
      ask: (s) => `When should it arrive? You can pick ${(s.days || ['Today', 'Tomorrow']).join(', ').replace(/, ([^,]*)$/, ' or $1')}, in the morning, at midday, in the afternoon or in the evening. For example, "tomorrow afternoon".`,
      askShort: 'which day and time?',
      options: (s) => [...(s.days || []).slice(0, 2).map((d) => `${d} morning`), 'afternoon'],
      parse: (u, s = {}, opts = {}) => {
        const days = s.days || ['Today', 'Tomorrow'];
        const lc = String(u).toLowerCase();
        const day = days.find((d) => lc.includes(d.toLowerCase()));
        const slot = /early morning|first thing/.test(lc) ? '9am–11am' : /morning/.test(lc) ? '9am–11am' : /\bnoon\b|lunch|midday/.test(lc) ? '11am–1pm' : /late afternoon/.test(lc) ? '3pm–5pm' : /afternoon/.test(lc) ? '1pm–3pm' : /evening|night/.test(lc) ? '5pm–7pm' : null;
        if (opts.upfront) return day && slot ? { day, slot } : null;
        if (!day && !slot) return null;
        return { day: day || days[1] || days[0], slot: slot || '1pm–3pm' };
      },
      narrate: (v) => `Choosing ${v.day}, ${v.slot.replace('–', ' to ')}.`,
      perform: async (h, v) => (await h.click(`.day[data-day="${v.day}"]`)) && h.click(`.slot[data-slot="${v.slot}"]`),
      view: 'checkout',
      target: '[data-guide="delivery-day"]',
      instruction: 'Now choose when the cake should arrive. In section 2, "Delivery time", click a day, then click a time window under it.',
      short: 'Pick a delivery day and time.',
      why: 'Cakes are perishable, so choosing a time close to the party means it arrives fresh. Each time shows its own delivery fee.',
      hints: [
        'Section 2 is below the address. First click a day, like Tomorrow; the times appear underneath.',
        'Click one of the four day boxes, then one of the time boxes that appear below it. Your choices turn purple.',
      ],
      getBack: 'Go back to checkout to choose the time.',
      getBackTarget: '[data-guide="cart"]',
      learned: 'picked a delivery time',
      doneWhen: (s) => !!s.deliveryDay || s.view === 'confirmation',
    },
    {
      id: 'payment',
      kind: 'private',
      view: 'checkout',
      target: '[data-guide="payment"]',
      instruction: 'Now the payment, in section 4. Take the printed test card you were given and copy it into the boxes: the name on the card, the 16-digit card number, the expiry date as month and year, and the 3-digit security code from the back.',
      short: 'Type the test card details in section 4, Payment.',
      why: 'Card details are private, so they\'re always yours to type. On any site, check for the lock and "Secure checkout" at the top before you type a card.',
      hints: [
        'The payment boxes are in section 4, below the delivery time and the phone number. Scroll down if you need to.',
        'Type the name exactly as printed, then the long number. The expiry goes in as two digits for the month, then two for the year, like 12/30. The security code is the three digits on the back.',
      ],
      getBack: 'To pay, go back to checkout: open the cart at the top right, then click "Go to checkout".',
      getBackTarget: '[data-guide="cart"]',
      sensitive: true,
      learned: 'entered the card details',
      doneWhen: (s) => !!s.cardValid || s.view === 'confirmation',
    },
    {
      id: 'place-order',
      kind: 'commit',
      view: 'checkout',
      target: '[data-guide="summary"]',
      instruction: 'Last step, and an important one. On the right is the order summary. Read it over: the cake, the size, the message, the delivery time and the total. When it all looks right, click "Place order" at the top of the summary.',
      short: 'Review the summary, then "Place order".',
      why: 'This is the decision point. Everything before it can be changed freely, but once you place the order, changing it is harder. That\'s why it\'s always yours to click.',
      hints: [
        'The summary is the box on the right side of the page. The purple "Place order" button is at its top.',
        'Check each line in the box on the right, then click the purple "Place order" button.',
      ],
      getBack: 'Your order isn\'t placed yet. Go back to checkout to review and place it.',
      getBackTarget: '[data-guide="cart"]',
      learned: 'reviewed the order before placing it',
      doneWhen: (s) => s.view === 'confirmation',
    },
  ],
  watch: [
    { id: 'nut-cake', when: (s) => !!(s.productIsCake && s.productHasNuts && s.allergensOpened), say: 'Careful: this cake contains nuts, so it isn\'t safe for your granddaughter. Close this window with the ✕ and choose a cake that says "Made without nuts".' },
    { id: 'nut-cart', when: (s) => !!s.cartHasNutCake, say: 'Wait: the cake in your cart contains nuts. Open the cart and click "Remove" next to it, then choose a nut-free cake.' },
  ],
  matches: /\b(cake|birthday|bake|bakery|order)\b/i,
};

export default birthdayCake;

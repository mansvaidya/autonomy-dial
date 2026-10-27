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

const CAKE = 'choc-mousse-cake';
const inCart = (s) => !!s.cartHasCake;
const pastCart = (s) => s.view === 'checkout' || s.view === 'confirmation';

export const birthdayCake = {
  id: 'birthday-cake',
  title: 'How to order a birthday cake online',
  steps: [
    {
      id: 'choose-store',
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
      doneWhen: (s) => (/cake/i.test(s.query || '') && s.view === 'results') || s.productId === CAKE || inCart(s) || pastCart(s),
    },
    {
      id: 'open-product',
      view: null,
      target: `[data-guide="product-${CAKE}"]`,
      instruction: 'Here are the results. Find the Chocolate Mousse Cake, the dark chocolate cake, and click its picture or its name to open it.',
      short: 'Open the Chocolate Mousse Cake.',
      why: 'The results only show a summary. Opening an item shows its details and its choices, like size.',
      hints: [
        'It\'s the first item in the results, with a picture of a round dark chocolate cake and a price of $14.99.',
        'Click right on the cake picture. Don\'t click the small "Add" button on the corner; click the picture itself.',
      ],
      doneWhen: (s) => s.productId === CAKE || inCart(s) || pastCart(s),
    },
    {
      id: 'size',
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
      getBackTarget: `[data-guide="product-${CAKE}"]`,
      learned: 'chose the size',
      doneWhen: (s) => !!(s.productId === CAKE && s.size) || inCart(s) || pastCart(s),
    },
    {
      id: 'message',
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
      getBackTarget: `[data-guide="product-${CAKE}"]`,
      learned: 'added a message',
      doneWhen: (s) => !!(s.productId === CAKE && s.messageFilled) || inCart(s) || pastCart(s),
      learnedWhen: (s) => !!s.messageFilled || !!s.cartHasMessage,
    },
    {
      id: 'add-to-cart',
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
      getBackTarget: `[data-guide="product-${CAKE}"]`,
      learned: 'put it in your cart',
      doneWhen: (s) => inCart(s) || pastCart(s),
    },
    {
      id: 'open-cart',
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
      doneWhen: (s) => pastCart(s),
    },
    {
      id: 'address',
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
      id: 'place-order',
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
  matches: /\b(cake|birthday|bake|bakery|order)\b/i,
};

export default birthdayCake;

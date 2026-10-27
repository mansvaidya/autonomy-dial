// The birthday-cake lesson: the worked example from the paper's persona
// demonstrations (order, customize and send a cake), on the mock shop.
//
// A step is:
//   id           stable id (for logs)
//   view         the shop page the step happens on (null = any page)
//   target       CSS selector the Teacher highlights; the person acts on it
//   instruction  what to do, in full
//   short        a shorter reminder, for someone who has done this before
//   why          the reason behind the step (transferable knowledge)
//   hints        increasingly specific help when the person is stuck
//   getBack      what to say if the person has moved to a different page
//   getBackTarget  what to highlight in that case
//   sensitive    the person types private data themselves; the Teacher never reads it
//   learned      a phrase for the closing recap ("You searched for …")
//   doneWhen     (shopState) => boolean; the goal of the step

const ON_OR_AFTER_CART = ['cart', 'checkout', 'confirmation'];

export const birthdayCake = {
  id: 'birthday-cake',
  title: 'How to order a birthday cake online',
  steps: [
    {
      id: 'search',
      view: null,
      target: '[data-guide="search"]',
      instruction: 'First, find the search box at the top of the page. Click inside it, type "chocolate cake", and press Enter.',
      short: 'Search for "chocolate cake" in the box at the top.',
      why: 'Searching is usually faster than browsing the aisles, and the search box is in the same place on almost every shopping site.',
      hints: [
        'The search box is the long white bar at the very top, next to the magnifying glass. It says "Search Corner Market".',
        'Click once inside that long bar at the top so the cursor blinks, then type the words chocolate cake and press the Enter key.',
      ],
      learned: 'searched for what you wanted',
      doneWhen: (s) => /cake/i.test(s.query || '') && s.view !== 'home',
    },
    {
      id: 'open-product',
      view: 'results',
      target: '[data-guide="product-chocolate-cake"]',
      instruction: 'Here are the results. Find the chocolate cake and click on its picture or its name to open its page.',
      short: 'Open the chocolate cake.',
      why: 'The results only show a summary. The product page is where you choose options like size.',
      hints: [
        'It\'s the first card, with the brown cake picture and the words "Chocolate Celebration Cake".',
        'Click directly on the words "Chocolate Celebration Cake" in the first card.',
      ],
      getBack: 'To get back to the cakes, search for "chocolate cake" again in the box at the top.',
      getBackTarget: '[data-guide="search"]',
      doneWhen: (s) => (s.view === 'product' && s.productId === 'chocolate-cake') || s.cartCount > 0,
    },
    {
      id: 'size',
      view: 'product',
      target: '[data-guide="size"]',
      instruction: 'Now choose a size. Scroll down a little, past the description, to where it says "Choose a size", and pick 7 inch or 10 inch.',
      short: 'Pick a size under "Choose a size".',
      why: 'Shops often put choices like size below the description, so it\'s worth scrolling down on a product page before adding anything to the cart.',
      hints: [
        'Scroll down below the price and the description. You\'ll see two buttons that say 7 inch and 10 inch.',
        'Use your mouse wheel or the scroll bar to move the page down. The size buttons are just above the message box. Click the one you want; it turns green when it\'s chosen.',
      ],
      getBack: 'To choose the size, go back to the cake\'s page. Search for "chocolate cake" and open it again.',
      getBackTarget: '[data-guide="search"]',
      learned: 'chose the size',
      doneWhen: (s) => !!s.size || s.cartCount > 0,
    },
    {
      id: 'message',
      view: 'product',
      target: '[data-guide="message"]',
      instruction: 'Next, the message for the cake. Click in the box labelled "Message on the cake" and type what you\'d like written, for example "Happy Birthday".',
      short: 'Type your message in "Message on the cake".',
      why: 'Bakeries write exactly what you type, so it\'s worth checking the spelling before you move on.',
      hints: [
        'The message box is right under the size buttons.',
        'Click inside the empty box under "Message on the cake" so the cursor blinks, then type your message. Say "done" when you have.',
      ],
      getBack: 'To add a message, go back to the cake\'s page.',
      getBackTarget: '[data-guide="search"]',
      learned: 'added a message',
      // The message is optional: once the cake is in the cart, move on. Only
      // claim it in the recap if a message was actually written.
      doneWhen: (s) => !!s.messageFilled || s.cartCount > 0,
      learnedWhen: (s) => !!s.messageFilled || !!s.cartHasMessage,
    },
    {
      id: 'add-to-cart',
      view: 'product',
      target: '[data-guide="add-to-cart"]',
      instruction: 'Now click the green "Add to cart" button.',
      short: 'Click "Add to cart".',
      why: 'Adding to the cart doesn\'t buy anything yet. It\'s like putting it in a basket; you can still change your mind.',
      hints: [
        'The "Add to cart" button is the big green button below the message box.',
        'Scroll down a little more if you need to. The green button says "Add to cart". Click it once.',
      ],
      getBack: 'The cake isn\'t in your cart yet. Go back to the cake\'s page to add it.',
      getBackTarget: '[data-guide="search"]',
      learned: 'put it in your cart',
      doneWhen: (s) => s.cartCount > 0,
    },
    {
      id: 'open-cart',
      view: null,
      target: '[data-guide="cart"]',
      instruction: 'The cake is in your cart. Now open the cart by clicking the cart button at the top right of the page.',
      short: 'Open the cart, top right.',
      why: 'The cart is where you review everything before paying. It\'s almost always in the top right corner.',
      hints: [
        'Look at the top right corner. There\'s a button with a basket and the word "Cart" and a number 1.',
        'Click the "Cart" button in the top right corner, next to the search box.',
      ],
      doneWhen: (s) => ON_OR_AFTER_CART.includes(s.view),
    },
    {
      id: 'checkout',
      view: 'cart',
      target: '[data-guide="checkout"]',
      instruction: 'Here\'s your cart. Check that it shows the cake with the right size and message, then click "Go to checkout".',
      short: 'Check the cart, then "Go to checkout".',
      why: 'Checking the cart now is easier than fixing a mistake after the order is placed.',
      hints: [
        'The "Go to checkout" button is on the right, under the total.',
        'Click the green "Go to checkout" button under the price total.',
      ],
      getBack: 'Open the cart again with the cart button at the top right.',
      getBackTarget: '[data-guide="cart"]',
      doneWhen: (s) => s.view === 'checkout' || s.view === 'confirmation',
    },
    {
      id: 'delivery-day',
      view: 'checkout',
      target: '[data-guide="delivery-day"]',
      instruction: 'Choose when the cake should arrive. Under "Delivery day", pick the day you want, for example Saturday morning.',
      short: 'Pick a delivery day.',
      why: 'Cakes are perishable, so choosing a delivery window close to the party means it arrives fresh.',
      hints: [
        'The delivery choices are the first section on the checkout page, with the days of the week.',
        'Click one of the day buttons under "Delivery day". The one you choose turns green.',
      ],
      getBack: 'Go back to checkout: open the cart at the top right, then click "Go to checkout".',
      getBackTarget: '[data-guide="cart"]',
      learned: 'picked a delivery day',
      doneWhen: (s) => !!s.deliveryDay || s.view === 'confirmation',
    },
    {
      id: 'address',
      view: 'checkout',
      target: '[data-guide="address"]',
      instruction: 'Next, type the delivery address in the three boxes: street, town, and ZIP code.',
      short: 'Type the delivery address.',
      why: 'The address is typed exactly as you enter it on the label, so it\'s worth a quick re-read.',
      hints: [
        'The address boxes are under "Deliver to", below the delivery days.',
        'Click in the box that says "Street address" and type it, then do the same for "Town or city" and "ZIP code".',
      ],
      getBack: 'Go back to checkout to finish the address.',
      getBackTarget: '[data-guide="cart"]',
      sensitive: true,
      learned: 'entered the address',
      doneWhen: (s) => !!s.addressFilled || s.view === 'confirmation',
    },
    {
      id: 'place-order',
      view: 'checkout',
      target: '[data-guide="summary"]',
      instruction: 'Last step, and an important one. Read over the order summary: the cake, the size, the message, the day and the total. When it all looks right, click "Place order".',
      short: 'Review the summary, then "Place order".',
      why: 'This is the decision point. Everything before it can be changed freely, but once you place the order, changing it is harder. That\'s why it\'s always yours to click.',
      hints: [
        'The summary is the box on the right with the total. The "Place order" button is at its bottom.',
        'Check each line in the box on the right, then click the green "Place order" button under it.',
      ],
      getBack: 'Your order isn\'t placed yet. Go back to checkout to review and place it.',
      getBackTarget: '[data-guide="cart"]',
      learned: 'reviewed the order before placing it',
      doneWhen: (s) => s.view === 'confirmation',
    },
  ],
  // Used when the person asks what they're learning, and to match a request.
  matches: /\b(cake|birthday|bake|bakery|order)\b/i,
};

export default birthdayCake;

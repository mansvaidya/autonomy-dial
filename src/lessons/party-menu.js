// The party-menu lesson: the paper's Information Management scenario.
// "Plan a full party menu for ten guests under dietary constraints (two
// vegetarian, one nut allergy) and a $250 budget, then generate a shopping
// list." On Platewise, ending with the list sent to Basketly.
//
// Step fields are described in birthday-cake.js. Lesson-specific extras:
//   kind      find | choose | do | private | commit (who may do it; see agent.js)
//   ask       what the agent asks when it makes this choice for you
//   suggest   the choice the agent proposes ("yes" accepts it)
//   parse     turns a spoken answer into a choice
//   perform   how the agent's hands do the step (only at Helper/Autopilot)
//   narrate   what the agent says while doing it

import { RECIPES, recipe, hasNuts, recipeFromWords } from '../recipes.js';

const BRIEF = { guests: 10, veg: 2, nuts: true, budget: 250 };
const safe = (course, { veg } = {}) => RECIPES.filter((r) => r.course === course && !hasNuts(r) && (!veg || r.veg));
const names = (list) => list.map((r) => r.name);
// A spoken dish name, limited to the course being chosen. A dish with nuts is
// allowed if asked for by name; the nut warning then speaks up.
const pickFrom = (course) => (u) => {
  const best = recipeFromWords(u, RECIPES);
  if (best && recipe(best).course !== course) return null; // e.g. "fruit salad" when choosing a side
  return recipeFromWords(u, RECIPES.filter((r) => r.course === course));
};

async function addRecipe(hands, id) {
  if (!hands.exists(`[data-guide="add-${id}"]`)) {
    if (hands.exists('[data-guide="course-all"]')) await hands.click('[data-guide="course-all"]');
    if (!hands.exists(`[data-guide="add-${id}"]`) && hands.exists('[data-act="back"]')) await hands.click('[data-act="back"]');
  }
  return hands.click(`[data-guide="add-${id}"]`);
}

const dishStep = ({ id, course, veg, label, suggestId, why, extraDone }) => ({
  id,
  kind: 'choose',
  view: ['browse', 'recipe'],
  target: (s) => (s.view === 'recipe' ? '[data-guide="add-to-menu"]' : '[data-guide="menu-grid"]'),
  instruction: `Now choose ${label}. Click a recipe to see it, check its allergens, then click "Add to party menu". You can also use the "Add" button on its card.`,
  short: `Add ${label}.`,
  why,
  hints: [
    `The recipes are in the middle of the page. ${course === 'main' ? 'Mains have the word "Main" above their name.' : course === 'side' ? 'Sides say "Side" above their name.' : 'Desserts say "Dessert" above their name.'} The "Course" buttons on the left can show just ${course === 'main' ? 'mains' : course === 'side' ? 'sides' : 'desserts'}.`,
    `Click the "＋ Add" button on the card of the dish you want. It changes to "✓ In menu", and the dish appears on the right.`,
  ],
  getBack: 'To keep choosing dishes, click the "Party menu" button at the top right.',
  getBackTarget: '[data-guide="plan-party"]',
  ask: (s) => {
    const r = recipe(suggestId);
    const others = names(safe(course, { veg }).filter((x) => x.id !== suggestId)).slice(0, 2);
    return `For ${label}, I suggest the ${r.name}: ${r.veg ? 'vegetarian, ' : ''}nut-free, about $${Math.round(r.cost * (s.guests || 10) / 10)}. Shall I add it? Or name another, like the ${others.join(' or the ')}.`;
  },
  askShort: `which ${course === 'dessert' ? 'dessert' : course} should I add?`,
  suggest: () => suggestId,
  parse: pickFrom(course),
  options: () => ['yes', ...names(safe(course, { veg })).slice(0, 3)],
  narrate: (v) => `Adding the ${recipe(v || suggestId).name} to your menu.`,
  perform: (hands, v) => addRecipe(hands, v || suggestId),
  learned: `chose ${label}`,
  doneWhen: (s) => extraDone(s) || s.reviewed,
});

export const partyMenu = {
  id: 'party-menu',
  title: 'How to plan a party menu and shopping list',
  goal: 'plan the party menu and shopping list',
  site: 'platewise',
  brief: 'A birthday party for 10 guests. 2 are vegetarian and 1 has a nut allergy. Food budget: $250. Plan the menu, then make a shopping list.',
  steps: [
    {
      id: 'open-planner',
      kind: 'find',
      view: null,
      target: '[data-guide="plan-party"]',
      instruction: 'This is Platewise, a recipe website. First, open the party planner: click the orange "Plan a party" button at the top right.',
      short: 'Click "Plan a party" at the top right.',
      why: 'A party planner keeps your guests, their diets and your budget in one place, and checks every recipe against them.',
      hints: [
        'The "Plan a party" button is at the top right of the page, with a party popper picture. There\'s another one in the big banner.',
        'Click the orange button that says "Plan a party".',
      ],
      narrate: 'Opening the party planner.',
      perform: (h) => h.click('[data-guide="plan-party"]'),
      doneWhen: (s) => s.plannerOpen,
    },
    {
      id: 'party-details',
      kind: 'choose',
      view: 'setup',
      target: '[data-guide="party-details"]',
      instruction: 'Fill in the party details from your brief: 10 guests, 2 of them vegetarian, tick the box for a nut allergy, and a budget of $250.',
      short: 'Enter 10 guests, 2 vegetarian, nut allergy, $250.',
      why: 'The site uses these to scale every recipe to 10 people, flag dishes with nuts, and keep a running total against your budget.',
      hints: [
        'The boxes are in the white card: "How many guests?", "How many are vegetarian?", the allergy tick boxes, and "Food budget".',
        'Click in "How many guests?" and type 10. Then type 2 for vegetarian, tick "Nuts", and type 250 for the budget.',
      ],
      getBack: 'Click "Plan a party" at the top right to get back to the party details.',
      getBackTarget: '[data-guide="plan-party"]',
      ask: () => `Your brief says 10 guests, 2 vegetarians, a nut allergy and a $250 budget. Shall I enter those?`,
      askShort: 'shall I enter 10 guests, 2 vegetarian, nut allergy, $250?',
      suggest: () => BRIEF,
      parse: () => null,
      options: () => ['yes'],
      narrate: () => 'Entering 10 guests, 2 vegetarian, a nut allergy and a $250 budget.',
      perform: async (h) => {
        await h.type('[data-guide="guests"]', '10');
        await h.type('[data-guide="veg"]', '2');
        if (!h.exists('[data-allergy="nuts"]:checked')) await h.click('[data-allergy="nuts"]');
        await h.type('[data-guide="budget"]', '250');
        return true;
      },
      learned: 'entered your guests, diets and budget',
      doneWhen: (s) => s.detailsOk || s.started,
    },
    {
      id: 'start-planning',
      kind: 'do',
      view: 'setup',
      target: '[data-guide="start-planning"]',
      instruction: 'Now click the green "Start planning" button at the bottom of the card.',
      short: 'Click "Start planning".',
      why: 'This saves your details and opens the recipes, scaled to your party.',
      hints: ['It\'s the long green button at the bottom of the white card.', 'Scroll down a little if you need to, then click "Start planning".'],
      getBack: 'Click "Plan a party" at the top right to get back to the planner.',
      getBackTarget: '[data-guide="plan-party"]',
      narrate: 'Starting the plan.',
      perform: (h) => h.click('[data-guide="start-planning"]'),
      doneWhen: (s) => s.started,
    },
    {
      id: 'nut-filter',
      kind: 'find',
      view: ['browse', 'recipe'],
      target: '[data-guide="filter-nuts"]',
      instruction: 'Here are the recipes. Since one guest has a nut allergy, turn on the "Nut-free" filter on the left, under "Free from". Then only safe recipes are shown.',
      short: 'Tick "Nut-free" on the left.',
      why: 'Filters hide what you can\'t use, so you don\'t have to check every recipe yourself. Some dishes have nuts you wouldn\'t expect, like pesto or carrot cake.',
      hints: [
        'The filters are in the column on the left side of the page. Look for "Free from".',
        'Click the small box next to "Nut-free" so it shows a tick.',
      ],
      getBack: 'Click "Party menu" at the top right to get back to the recipes.',
      getBackTarget: '[data-guide="plan-party"]',
      narrate: 'Turning on the nut-free filter.',
      perform: (h) => h.click('[data-filter="nutFree"]'),
      learned: 'filtered out dishes with nuts',
      learnedWhen: (s) => s.filters.nutFree,
      doneWhen: (s) => s.filters.nutFree || s.menuCount >= 2 || s.reviewed,
    },
    dishStep({ id: 'add-main', course: 'main', label: 'a main dish', suggestId: 'roast-chicken',
      why: 'Start with the main dish. It\'s usually the biggest part of the budget, and the sides can be chosen to go with it.',
      extraDone: (s) => s.menuHasMain }),
    dishStep({ id: 'add-veg-main', course: 'main', veg: true, label: 'a vegetarian main for your 2 vegetarian guests', suggestId: 'veg-lasagna',
      why: 'Two guests don\'t eat meat, so they need a main dish too. The green leaf marks vegetarian recipes.',
      extraDone: (s) => s.menuHasVegMain }),
    dishStep({ id: 'add-side', course: 'side', label: 'a side dish', suggestId: 'roast-veg',
      why: 'A side rounds out the meal, and a vegetable side works for everyone.',
      extraDone: (s) => s.menuHasSide }),
    dishStep({ id: 'add-dessert', course: 'dessert', label: 'a dessert', suggestId: 'brownies',
      why: 'Desserts are where nuts often hide, in carrot cake or baklava for example, so check the allergens.',
      extraDone: (s) => s.menuHasDessert }),
    {
      id: 'review',
      kind: 'do',
      view: ['browse', 'recipe'],
      target: '[data-guide="review-menu"]',
      instruction: 'Your menu is on the right. Look at the cost bar against your $250 budget, then click "Review menu" under it.',
      short: 'Click "Review menu" on the right.',
      why: 'The review checks the whole menu against your guests and budget before you shop.',
      hints: ['"Review menu" is the green button at the bottom of the "Your party menu" panel on the right.', 'Scroll down the right-hand panel if you need to, then click "Review menu".'],
      getBack: 'Click "Party menu" at the top right to get back to your menu.',
      getBackTarget: '[data-guide="plan-party"]',
      narrate: 'Opening the menu review.',
      perform: (h) => h.click('[data-guide="review-menu"]'),
      learned: 'checked the menu against your budget',
      doneWhen: (s) => s.reviewed,
    },
    {
      id: 'make-list',
      kind: 'do',
      view: 'review',
      target: '[data-guide="make-list"]',
      instruction: 'Check the list of ticks at the top: nut-free, a vegetarian main, and within budget. If they\'re all green, click "Make shopping list".',
      short: 'Check the ticks, then "Make shopping list".',
      why: 'The shopping list adds up the ingredients from every dish, already scaled for 10 people.',
      hints: ['The green ticks are near the top. "Make shopping list" is the green button at the bottom.', 'Scroll down and click "Make shopping list".'],
      getBack: 'Open your menu with the "Party menu" button at the top right, then click "Review menu".',
      getBackTarget: '[data-guide="plan-party"]',
      narrate: 'Making the shopping list.',
      perform: (h) => h.click('[data-guide="make-list"]'),
      doneWhen: (s) => s.listMade,
    },
    {
      id: 'send-list',
      kind: 'commit',
      view: 'list',
      target: '[data-guide="send-list"]',
      instruction: 'Last step. Read over the shopping list and untick anything you already have at home. When it looks right, click "Send list to Basketly".',
      short: 'Untick what you have, then "Send list to Basketly".',
      why: 'Sending puts the items in your Basketly cart. It doesn\'t order anything yet, but it\'s your list, so the decision is yours.',
      hints: ['The list is in the middle of the page. The green "Send list to Basketly" button is at the bottom.', 'Scroll to the bottom of the list and click "Send list to Basketly".'],
      getBack: 'Go back to your shopping list: open "Party menu", then "Review menu", then "Make shopping list".',
      getBackTarget: '[data-guide="plan-party"]',
      learned: 'sent the shopping list',
      doneWhen: (s) => s.sent,
    },
  ],
  watch: [
    { id: 'nuts', when: (s) => s.nutAllergy && s.menuHasNuts, say: (s) => `Careful: the ${s.nutDish} contains nuts. ${s.nutNote || ''} One of your guests has a nut allergy. You can remove it with the ✕ next to it in your menu on the right.` },
    { id: 'budget', when: (s) => s.overBudget, say: (s) => `Heads up: the menu is now about $${s.total}, over your $${s.budget} budget. You could swap a dish for a cheaper one.` },
  ],
  matches: /\b(party|menu|recipe|dinner|guests|vegetarian|allerg|shopping list|plan)\b/i,
};

export default partyMenu;

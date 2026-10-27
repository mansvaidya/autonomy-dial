// recipes.js — recipes for the Platewise demo recipe site.
//
// Platewise is fictional. Photos come from Wikimedia Commons (credits below and
// in credits.html). Costs are rough estimates for 10 servings, for the demo's
// budget tracker only. Allergens are what matters for the lesson: several
// dishes quietly contain nuts.
//
// `basketly` on an ingredient names the Basketly product it maps to when the
// shopping list is sent there.

const WM = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
const ph = (path, title, license, author) => ({
  src: path.startsWith('http') ? path : WM + path,
  credit: { title, license, author: author || 'Unknown', site: 'Wikimedia Commons', page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(title.replace(/ /g, '_')) },
});

export const COURSES = [
  { id: 'main', name: 'Mains' },
  { id: 'side', name: 'Sides & salads' },
  { id: 'dessert', name: 'Desserts' },
];

export const ALLERGENS = { nuts: 'Nuts', peanuts: 'Peanuts', gluten: 'Gluten', dairy: 'Dairy', eggs: 'Eggs', shellfish: 'Shellfish', sesame: 'Sesame', soy: 'Soy' };
const NUT = ['nuts', 'peanuts'];

export const RECIPES = [
  // ── Mains ──
  { id: 'roast-chicken', course: 'main', name: 'Herb Roast Chicken & Potatoes', veg: false, allergens: [], cost: 42, time: '1 hr 30 min', rating: 4.8, reviews: 2318,
    img: ph('1/11/02023_0151_Roasted_Chicken_and_Potatoes.jpg/960px-02023_0151_Roasted_Chicken_and_Potatoes.jpg', '02023 0151 Roasted Chicken and Potatoes.jpg', 'CC BY-SA 4.0', 'Silar'),
    blurb: 'A crowd-pleasing roast with crispy potatoes, lemon and rosemary. Easy to scale up.',
    ingredients: [['Whole chickens', 2, 'ct', 'chicken-breast'], ['Potatoes', 4, 'lb'], ['Lemons', 2, 'ct', 'lemons'], ['Butter', 0.5, 'lb', 'butter'], ['Garlic', 1, 'head'], ['Fresh rosemary', 1, 'bunch']],
    steps: ['Heat the oven to 425°F.', 'Rub the chickens with butter, garlic and rosemary; stuff with lemon halves.', 'Roast on a bed of potatoes for about 75 minutes, until the juices run clear.', 'Rest 10 minutes before carving.'] },
  { id: 'veg-lasagna', course: 'main', name: 'Eggplant & Spinach Lasagna', veg: true, allergens: ['gluten', 'dairy', 'eggs'], cost: 36, time: '1 hr 15 min', rating: 4.7, reviews: 1642,
    img: ph('d/df/Eggplant_Lasagna_%28Vegitarian%29_%286_of_6%29.jpg/960px-Eggplant_Lasagna_%28Vegitarian%29_%286_of_6%29.jpg', 'Eggplant Lasagna (Vegitarian) (6 of 6).jpg', 'CC BY 2.0', 'Wheeler Cowperthwaite'),
    blurb: 'Layers of roasted eggplant, spinach, ricotta and marinara. Vegetarian and nut-free.',
    ingredients: [['Lasagna noodles', 1, 'lb', 'barilla'], ['Eggplants', 2, 'ct'], ['Baby spinach', 10, 'oz', 'spinach'], ['Ricotta', 2, 'lb'], ['Mozzarella', 1, 'lb', 'mozzarella'], ['Parmesan', 4, 'oz', 'parmesan'], ['Tomatoes', 3, 'lb', 'tomatoes'], ['Eggs', 2, 'ct', 'eggs']],
    steps: ['Roast sliced eggplant until golden.', 'Mix ricotta, egg and spinach.', 'Layer noodles, sauce, eggplant and ricotta; top with mozzarella and parmesan.', 'Bake 45 minutes at 375°F.'] },
  { id: 'stuffed-peppers', course: 'main', name: 'Stuffed Roasted Red Peppers', veg: true, allergens: [], cost: 28, time: '50 min', rating: 4.5, reviews: 611,
    img: ph('3/3c/Vegan_Stuffed_Roasted_Red_Peppers_%285908287385%29.jpg/960px-Vegan_Stuffed_Roasted_Red_Peppers_%285908287385%29.jpg', 'Vegan Stuffed Roasted Red Peppers (5908287385).jpg', 'CC BY 2.0', 'Lablascovegmenu'),
    blurb: 'Sweet peppers filled with herbed rice, tomatoes and onions. Vegan and free from the common allergens.',
    ingredients: [['Red bell peppers', 10, 'ct', 'bell-peppers'], ['Long-grain rice', 2, 'lb'], ['Tomatoes', 2, 'lb', 'tomatoes'], ['Onions', 2, 'ct', 'onions'], ['Olive oil', 4, 'tbsp', 'olive-oil']],
    steps: ['Cook the rice with onion and tomato.', 'Halve and seed the peppers.', 'Fill and roast 30 minutes at 400°F.'] },
  { id: 'risotto', course: 'main', name: 'Mushroom & Leek Risotto', veg: true, allergens: ['dairy'], cost: 30, time: '45 min', rating: 4.6, reviews: 880,
    img: ph('e/ed/Mushroom_and_Leek_Risotto_%2849535206656%29.jpg/960px-Mushroom_and_Leek_Risotto_%2849535206656%29.jpg', 'Mushroom and Leek Risotto (49535206656).jpg', 'CC BY 2.0', 'spurekar'),
    blurb: 'Creamy arborio rice with mushrooms, leeks and parmesan.',
    ingredients: [['Arborio rice', 2, 'lb'], ['Mushrooms', 2, 'lb'], ['Leeks', 3, 'ct'], ['Butter', 0.25, 'lb', 'butter'], ['Parmesan', 6, 'oz', 'parmesan'], ['Vegetable stock', 3, 'qt']],
    steps: ['Soften leeks and mushrooms in butter.', 'Toast the rice, then add hot stock a ladle at a time.', 'Finish with parmesan.'] },
  { id: 'chili', course: 'main', name: 'Beef & Bean Chili', veg: false, allergens: [], cost: 34, time: '1 hr', rating: 4.6, reviews: 1290,
    img: ph('2/29/Chili_con_carne_%284431800858%29.jpg/960px-Chili_con_carne_%284431800858%29.jpg', 'Chili con carne (4431800858).jpg', 'CC BY-SA 2.0', 'cyclonebill'),
    blurb: 'A hearty pot of chili that feeds a crowd and keeps warm on the stove.',
    ingredients: [['Ground beef', 3, 'lb'], ['Kidney beans', 3, 'cans'], ['Canned tomatoes', 2, 'cans', 'tomatoes'], ['Onions', 2, 'ct', 'onions'], ['Chili powder', 3, 'tbsp']],
    steps: ['Brown the beef with onions.', 'Add spices, beans and tomatoes.', 'Simmer 45 minutes.'] },
  { id: 'pesto-pasta', course: 'main', name: 'Shrimp & Basil Pesto Pasta', veg: false, allergens: ['nuts', 'shellfish', 'dairy', 'gluten'], nutNote: 'The pesto is made with pine nuts.', cost: 58, time: '30 min', rating: 4.7, reviews: 954,
    img: ph('https://upload.wikimedia.org/wikipedia/commons/5/5e/Shrimp_and_basil_pesto_pasta_2.jpg', 'Shrimp and basil pesto pasta 2.jpg', 'CC BY 4.0', '에그란'),
    blurb: 'Fresh basil pesto tossed with spaghetti and garlicky shrimp.',
    ingredients: [['Spaghetti', 2, 'lb', 'barilla'], ['Shrimp', 2, 'lb'], ['Fresh basil', 3, 'bunch'], ['Pine nuts', 4, 'oz'], ['Parmesan', 4, 'oz', 'parmesan'], ['Olive oil', 1, 'cup', 'olive-oil']],
    steps: ['Blend basil, pine nuts, parmesan and oil into pesto.', 'Cook pasta; sauté shrimp with garlic.', 'Toss together.'] },
  { id: 'peanut-noodles', course: 'main', name: 'Peanut Sesame Noodles', veg: true, allergens: ['peanuts', 'sesame', 'soy', 'gluten'], nutNote: 'The sauce is made with peanut butter.', cost: 24, time: '25 min', rating: 4.4, reviews: 703,
    img: ph('b/be/Noodles_with_Peanut_Butter_Sauce.jpg/960px-Noodles_with_Peanut_Butter_Sauce.jpg', 'Noodles with Peanut Butter Sauce.jpg', 'Public domain', 'USDA'),
    blurb: 'Cold noodles in a creamy peanut-sesame sauce with crunchy vegetables.',
    ingredients: [['Noodles', 2, 'lb'], ['Peanut butter', 1, 'cup', 'jif'], ['Soy sauce', 0.5, 'cup'], ['Sesame oil', 3, 'tbsp'], ['Carrots', 1, 'lb', 'carrots'], ['Cucumbers', 2, 'ct']],
    steps: ['Whisk the sauce.', 'Cook and cool the noodles.', 'Toss with sauce and vegetables.'] },
  { id: 'sliders', course: 'main', name: 'Pulled Pork Sandwiches', veg: false, allergens: ['gluten'], cost: 46, time: '6 hr (slow cooker)', rating: 4.7, reviews: 1120,
    img: ph('4/4b/Pulled_pork_sandwich_-_%22Naked%22.jpg/960px-Pulled_pork_sandwich_-_%22Naked%22.jpg', 'Pulled pork sandwich - "Naked".jpg', 'CC BY-SA 4.0', 'Infrogmation of New Orleans'),
    blurb: 'Slow-cooked pork shoulder with barbecue sauce on soft rolls.',
    ingredients: [['Pork shoulder', 5, 'lb'], ['Soft rolls', 12, 'ct', 'rolls'], ['Barbecue sauce', 2, 'cups'], ['Onions', 1, 'ct', 'onions']],
    steps: ['Slow-cook the pork with onions for 6 hours.', 'Shred and mix with sauce.', 'Serve on rolls.'] },
  { id: 'mac-cheese', course: 'main', name: 'Baked Macaroni & Cheese', veg: true, allergens: ['dairy', 'gluten'], cost: 22, time: '45 min', rating: 4.8, reviews: 3011,
    img: ph('1/19/Baked_macaroni_and_cheese_1.jpg/960px-Baked_macaroni_and_cheese_1.jpg', 'Baked macaroni and cheese 1.jpg', 'CC BY 2.0', 'Martin'),
    blurb: 'Creamy, golden-topped macaroni and cheese. Kids and grown-ups both love it.',
    ingredients: [['Elbow macaroni', 2, 'lb', 'barilla'], ['Cheddar', 1.5, 'lb'], ['Milk', 1, 'qt'], ['Butter', 0.25, 'lb', 'butter'], ['Flour', 0.5, 'cup', 'flour']],
    steps: ['Make a cheese sauce.', 'Stir in cooked macaroni.', 'Bake 25 minutes at 375°F.'] },

  // ── Sides ──
  { id: 'caprese', course: 'side', name: 'Caprese Salad', veg: true, allergens: ['dairy'], cost: 26, time: '15 min', rating: 4.7, reviews: 1503,
    img: ph('9/9c/Insalata_Caprese_%28from_Poznan%29.JPG/960px-Insalata_Caprese_%28from_Poznan%29.JPG', 'Insalata Caprese (from Poznan).JPG', 'CC BY-SA 3.0', 'MOs810'),
    blurb: 'Ripe tomatoes, fresh mozzarella and basil with olive oil.',
    ingredients: [['Tomatoes', 3, 'lb', 'tomatoes'], ['Fresh mozzarella', 1.5, 'lb', 'mozzarella'], ['Fresh basil', 1, 'bunch'], ['Olive oil', 4, 'tbsp', 'olive-oil']],
    steps: ['Slice tomatoes and mozzarella.', 'Layer with basil; drizzle with oil.'] },
  { id: 'roast-veg', course: 'side', name: 'Roasted Vegetables', veg: true, allergens: [], cost: 16, time: '40 min', rating: 4.6, reviews: 940,
    img: ph('1/11/Roasted_Vegetables_%282897937502%29.jpg/960px-Roasted_Vegetables_%282897937502%29.jpg', 'Roasted Vegetables (2897937502).jpg', 'CC BY-SA 2.0', 'Mack Male'),
    blurb: 'Colorful seasonal vegetables roasted with olive oil and herbs.',
    ingredients: [['Bell peppers', 4, 'ct', 'bell-peppers'], ['Carrots', 2, 'lb', 'carrots'], ['Broccoli', 2, 'lb', 'broccoli'], ['Onions', 2, 'ct', 'onions'], ['Olive oil', 4, 'tbsp', 'olive-oil']],
    steps: ['Chop the vegetables.', 'Toss with oil and salt.', 'Roast 35 minutes at 425°F.'] },
  { id: 'quinoa-salad', course: 'side', name: 'Quinoa & Vegetable Salad', veg: true, allergens: [], cost: 18, time: '25 min', rating: 4.4, reviews: 512,
    img: ph('d/dc/Quinoa_Salad_%285045982815%29.jpg/960px-Quinoa_Salad_%285045982815%29.jpg', 'Quinoa Salad (5045982815).jpg', 'CC BY 2.0', 'Geoff Peters'),
    blurb: 'Fluffy quinoa with cucumber, tomato, herbs and lemon dressing.',
    ingredients: [['Quinoa', 1, 'lb'], ['Cucumbers', 2, 'ct'], ['Tomatoes', 1, 'lb', 'tomatoes'], ['Lemons', 2, 'ct', 'lemons'], ['Olive oil', 4, 'tbsp', 'olive-oil']],
    steps: ['Cook and cool the quinoa.', 'Chop the vegetables.', 'Toss with lemon and oil.'] },
  { id: 'green-salad', course: 'side', name: 'Arugula & Tomato Salad', veg: true, allergens: [], cost: 14, time: '10 min', rating: 4.3, reviews: 388,
    img: ph('7/70/Fresh_salad_with_arugula%2C_cabbage_and_tomato_in_a_glass_bowl.jpg/960px-Fresh_salad_with_arugula%2C_cabbage_and_tomato_in_a_glass_bowl.jpg', 'Fresh salad with arugula, cabbage and tomato in a glass bowl.jpg', 'CC BY-SA 3.0', 'Horacio Cambeiro'),
    blurb: 'A bright, peppery salad that goes with everything.',
    ingredients: [['Arugula', 10, 'oz'], ['Cabbage', 1, 'head'], ['Tomatoes', 1, 'lb', 'tomatoes'], ['Lemons', 1, 'ct', 'lemons']],
    steps: ['Wash and dry the greens.', 'Slice cabbage and tomatoes.', 'Dress just before serving.'] },
  { id: 'garlic-bread', course: 'side', name: 'Cheesy Garlic Bread', veg: true, allergens: ['gluten', 'dairy'], cost: 12, time: '15 min', rating: 4.8, reviews: 2210,
    img: ph('7/72/Garlic_Bread_Mozzarella_-_Oregano_Pizzeria_2025-05-17.jpg/960px-Garlic_Bread_Mozzarella_-_Oregano_Pizzeria_2025-05-17.jpg', 'Garlic Bread Mozzarella - Oregano Pizzeria 2025-05-17.jpg', 'CC0', 'Andy Li'),
    blurb: 'Crusty bread with garlic butter and melted mozzarella.',
    ingredients: [['Sourdough loaf', 2, 'ct', 'sourdough'], ['Butter', 0.25, 'lb', 'butter'], ['Mozzarella', 8, 'oz', 'mozzarella'], ['Garlic', 1, 'head']],
    steps: ['Mix butter and garlic.', 'Spread on sliced bread; top with cheese.', 'Bake until bubbling.'] },
  { id: 'corn', course: 'side', name: 'Grilled Corn on the Cob', veg: true, allergens: ['dairy'], cost: 10, time: '20 min', rating: 4.6, reviews: 774,
    img: ph('e/e2/Grilled_corn_on_the_cob_%2848286496447%29.jpg/960px-Grilled_corn_on_the_cob_%2848286496447%29.jpg', 'Grilled corn on the cob (48286496447).jpg', 'CC BY 2.0', 'spurekar'),
    blurb: 'Sweet corn charred on the grill and brushed with butter.',
    ingredients: [['Corn on the cob', 10, 'ct'], ['Butter', 0.25, 'lb', 'butter']],
    steps: ['Grill the corn, turning, about 12 minutes.', 'Brush with butter and salt.'] },
  { id: 'waldorf', course: 'side', name: 'Waldorf Salad', veg: true, allergens: ['nuts', 'eggs'], nutNote: 'It contains walnuts.', cost: 20, time: '15 min', rating: 4.2, reviews: 296,
    img: ph("a/a9/Waldorf_Salad_%28Aunt_Caroline%27s_recipe%29.jpg/960px-Waldorf_Salad_%28Aunt_Caroline%27s_recipe%29.jpg", "Waldorf Salad (Aunt Caroline's recipe).jpg", 'CC BY-SA 4.0', 'KaMan'),
    blurb: 'Crisp apples, celery and grapes in a light mayonnaise dressing.',
    ingredients: [['Apples', 6, 'ct', 'apples'], ['Celery', 1, 'bunch'], ['Grapes', 1, 'lb'], ['Walnuts', 6, 'oz'], ['Mayonnaise', 1, 'cup', 'hellmanns']],
    steps: ['Chop apples and celery.', 'Fold in grapes, walnuts and mayonnaise.'] },

  // ── Desserts ──
  { id: 'brownies', course: 'dessert', name: 'Fudgy Chocolate Brownies', veg: true, allergens: ['eggs', 'dairy', 'gluten'], cost: 14, time: '45 min', rating: 4.9, reviews: 4120,
    img: ph('7/7a/Chocolate_brownies_without_table.jpg/960px-Chocolate_brownies_without_table.jpg', 'Chocolate brownies without table.jpg', 'CC BY-SA 3.0', 'Wikimedia Commons contributor'),
    blurb: 'Rich, fudgy brownies, made without nuts.',
    ingredients: [['Butter', 0.5, 'lb', 'butter'], ['Sugar', 2, 'cups'], ['Eggs', 4, 'ct', 'eggs'], ['Flour', 1, 'cup', 'flour'], ['Cocoa powder', 1, 'cup']],
    steps: ['Melt butter and mix with sugar and cocoa.', 'Beat in eggs, fold in flour.', 'Bake 25 minutes at 350°F.'] },
  { id: 'fruit-salad', course: 'dessert', name: 'Summer Fruit Salad', veg: true, allergens: [], cost: 22, time: '15 min', rating: 4.5, reviews: 690,
    img: ph('e/eb/Fruit_salad_%281%29.jpg/960px-Fruit_salad_%281%29.jpg', 'Fruit salad (1).jpg', 'Public domain', 'Renee Comet'),
    blurb: 'Strawberries, blueberries, kiwi and oranges with a squeeze of lime.',
    ingredients: [['Strawberries', 2, 'lb', 'strawberries'], ['Blueberries', 18, 'oz', 'blueberries'], ['Kiwifruit', 1, 'lb', 'kiwi'], ['Mandarin oranges', 2, 'lb', 'mandarins']],
    steps: ['Chop the fruit.', 'Toss gently and chill.'] },
  { id: 'carrot-cake', course: 'dessert', name: 'Carrot Cake with Walnuts', veg: true, allergens: ['nuts', 'eggs', 'dairy', 'gluten'], nutNote: 'It\'s made with chopped walnuts.', cost: 24, time: '1 hr 20 min', rating: 4.7, reviews: 1388,
    img: ph('8/86/Top_of_Safeway_Carrot_Cake_Slice_%2824172389914%29.jpg/960px-Top_of_Safeway_Carrot_Cake_Slice_%2824172389914%29.jpg', 'Top of Safeway Carrot Cake Slice (24172389914).jpg', 'CC BY-SA 2.0', 'Willis Lam'),
    blurb: 'Moist spiced carrot cake with cream cheese frosting and walnuts.',
    ingredients: [['Carrots', 1, 'lb', 'carrots'], ['Flour', 2, 'cups', 'flour'], ['Eggs', 4, 'ct', 'eggs'], ['Walnuts', 4, 'oz'], ['Cream cheese', 1, 'lb']],
    steps: ['Grate carrots.', 'Mix batter, fold in walnuts.', 'Bake and frost.'] },
  { id: 'baklava', course: 'dessert', name: 'Pistachio Baklava', veg: true, allergens: ['nuts', 'gluten', 'dairy'], nutNote: 'It\'s filled with pistachios.', cost: 30, time: '1 hr 30 min', rating: 4.6, reviews: 602,
    img: ph('https://upload.wikimedia.org/wikipedia/commons/c/c7/Baklava%281%29.png', 'Baklava(1).png', 'CC BY-SA 4.0', 'Sakaman'),
    blurb: 'Layers of crisp pastry, pistachios and honey syrup.',
    ingredients: [['Phyllo dough', 1, 'lb'], ['Pistachios', 1, 'lb'], ['Butter', 0.5, 'lb', 'butter'], ['Honey', 1, 'cup']],
    steps: ['Layer buttered phyllo with nuts.', 'Bake until golden.', 'Pour over honey syrup.'] },
];

const byId = new Map(RECIPES.map((r) => [r.id, r]));
export const recipe = (id) => byId.get(id) || null;
export const hasNuts = (r) => r.allergens.some((a) => NUT.includes(a));

/** Find a recipe by words in what the person said ("the lasagna"). */
export function recipeFromWords(utterance, pool = RECIPES) {
  const u = String(utterance || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const r of pool) {
    const words = r.name.toLowerCase().replace(/[&,]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
    const score = words.filter((w) => u.includes(w) || u.includes(w.replace(/s$/, ''))).length;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best ? best.id : null;
}

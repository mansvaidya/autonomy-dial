// catalog.js — stores and products for the Basketly demo marketplace.
//
// Basketly and every store here are FICTIONAL. Branded packaged goods are real
// products, shown with photos from Open Food Facts (open database, product
// photos under CC BY-SA). Fresh items use photos from Wikimedia Commons under
// the licenses listed in `credit`. See credits.html for the full list.
//
// Images load from those sites at run time, so the demo needs an internet
// connection for photos; without one, each card shows a neutral placeholder.

const WM = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
const OFF = 'https://images.openfoodfacts.org/images/products/';
const wm = (path, title, license, author) => ({ src: WM + path, credit: { title, license, author, site: 'Wikimedia Commons', page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(title.replace(/ /g, '_')) } });
const off = (path, code) => ({ src: OFF + path, credit: { title: `Product ${code}`, license: 'CC BY-SA 3.0', author: 'Open Food Facts contributors', site: 'Open Food Facts', page: `https://world.openfoodfacts.org/product/${code}` } });

export const STORES = [
  { id: 'summit', name: 'Summit Warehouse Club', short: 'Summit', kind: 'Warehouse club', color: '#14365c', accent: '#e0b23c', glyph: 'S', eta: 'Delivery by 4:30pm', tags: ['In-store prices', 'Bulk sizes'], fee: '$0 delivery fee on $35+', carries: 'all', bulk: true },
  { id: 'greenway', name: 'Greenway Market', short: 'Greenway', kind: 'Groceries', color: '#1d7a46', accent: '#c7e9b0', glyph: 'G', eta: 'Delivery by 2:15pm', tags: ['Lower prices than in-store', 'EBT'], fee: '$3.99 delivery', carries: 'all' },
  { id: 'fairfield', name: 'Fairfield Fresh', short: 'Fairfield', kind: 'Organic · Natural', color: '#6b4f2a', accent: '#f1dfbd', glyph: 'F', eta: 'Delivery by 3:00pm', tags: ['Organic'], fee: '$4.99 delivery', carries: ['produce', 'dairy', 'bakery', 'pantry', 'breakfast'] },
  { id: 'harbor', name: 'Harbor Foods', short: 'Harbor', kind: 'Groceries · Deli', color: '#0e6b8a', accent: '#bfe6f2', glyph: 'H', eta: 'Delivery by 1:45pm', tags: ['Deli', 'Seafood'], fee: '$3.99 delivery', carries: ['meat', 'deli', 'produce', 'snacks', 'beverages', 'frozen'] },
  { id: 'bloom', name: 'Bloom & Stem', short: 'Bloom & Stem', kind: 'Flowers · Gifts', color: '#b03a62', accent: '#f7d3df', glyph: '✿', eta: 'Delivery by 5:00pm', tags: ['Gifts'], fee: '$5.99 delivery', carries: ['flowers', 'candy'] },
  { id: 'maple', name: 'Maple & Main Pharmacy', short: 'Maple & Main', kind: 'Pharmacy · Convenience', color: '#b3261e', accent: '#f6d2cf', glyph: 'M', eta: 'Delivery by 12:30pm', tags: ['Pharmacy', 'Convenience'], fee: '$2.99 delivery', carries: ['snacks', 'beverages', 'household', 'candy'] },
  { id: 'lotus', name: 'Lotus Asian Market', short: 'Lotus', kind: 'International', color: '#7a2e8c', accent: '#ecd2f2', glyph: 'L', eta: 'Delivery by 3:30pm', tags: ['International'], fee: '$3.99 delivery', carries: ['produce', 'pantry', 'snacks'] },
  { id: 'confetti', name: 'Confetti Party Co.', short: 'Confetti', kind: 'Party supplies', color: '#d05a00', accent: '#ffe0c7', glyph: 'C', eta: 'Delivery by 6:00pm', tags: ['Party'], fee: '$4.99 delivery', carries: ['bakery', 'candy', 'household'] },
];

// Bakery sub-categories (chips on the bakery page).
export const BAKERY_SUBS = [
  { id: 'cakes', name: 'Celebration cakes' },
  { id: 'ice-cream', name: 'Ice cream cakes' },
  { id: 'pies', name: 'Cheesecakes, pies & tarts' },
  { id: 'cupcakes', name: 'Cupcakes & cookies' },
  { id: 'breads', name: 'Breads & pastries' },
];

export const AISLES = [
  { id: 'bakery', name: 'Bakery & Desserts' },
  { id: 'produce', name: 'Fresh Produce' },
  { id: 'dairy', name: 'Dairy & Eggs' },
  { id: 'meat', name: 'Meat & Seafood' },
  { id: 'deli', name: 'Deli & Prepared' },
  { id: 'frozen', name: 'Frozen' },
  { id: 'snacks', name: 'Snacks' },
  { id: 'candy', name: 'Candy & Chocolate' },
  { id: 'beverages', name: 'Beverages' },
  { id: 'breakfast', name: 'Breakfast & Cereal' },
  { id: 'pantry', name: 'Pantry' },
  { id: 'household', name: 'Paper & Household' },
  { id: 'flowers', name: 'Flowers' },
];

// Cake options: the size and message steps of the lesson live here.
const sizes = (p7, p10) => [{ id: '7 inch', label: '7 inch', note: 'serves 6–8', price: p7 }, { id: '10 inch', label: '10 inch', note: 'serves 12–16', price: p10 }];
const MESSAGE = { label: 'Message on the cake', max: 40 };
const CAKE_OPTIONS = { sizes: sizes(14.99, 22.99), message: MESSAGE };
const ALLERGEN_NAMES = { wheat: 'Wheat', milk: 'Milk', eggs: 'Eggs', soy: 'Soy', 'tree nuts': 'Tree nuts', peanuts: 'Peanuts', coconut: 'Coconut' };

// A whole celebration cake: sizes, an optional message, and allergen facts.
// `nuts` names the nuts it contains (or is empty); the shop shows it only in
// the cake's Allergens section, so checking it is part of the task.
function cake({ id, name, p7, p10, img, details, ingredients, contains, nuts = '', sub = 'cakes', badge, rating = 4.6, reviews = 300, stores, brand = 'Summit Signature' }) {
  const all = [...contains, ...(nuts ? ['tree nuts'] : [])];
  return {
    id, aisle: 'bakery', sub, brand, name, size: '7 or 10 inch', price: p7, badge, rating, reviews, img, stores,
    options: { sizes: sizes(p7, p10), message: MESSAGE },
    details, ingredients,
    directions: 'Keep refrigerated. Best within 3 days. Let stand at room temperature 20 minutes before serving.',
    contains: all, nuts,
    allergens: `Contains: ${all.map((a) => ALLERGEN_NAMES[a] || a).join(', ')}${nuts ? ` (${nuts})` : ''}.${nuts ? '' : ' Made without nuts.'}`,
  };
}

const W = (path, title, license, author) => wm(path, title, license, author);

// price: base price at a regular store. bulkSize/bulkPrice: Summit's warehouse pack.
export const PRODUCTS = [
  // ── Bakery: celebration cakes ──
  { ...cake({ id: 'choc-mousse-cake', name: 'Chocolate Mousse Cake', p7: 14.99, p10: 22.99, badge: 'Best seller', rating: 4.8, reviews: 1284, stores: ['summit', 'greenway'],
    img: W('a/ae/Chocolate_mousse_cake_2.jpg/500px-Chocolate_mousse_cake_2.jpg', 'Chocolate mousse cake 2.jpg', 'CC BY-SA 3.0', 'Lionel Allorge'),
    details: 'Layers of moist chocolate cake filled with chocolate mousse and finished with a glossy chocolate ganache. Baked fresh daily in our in-store bakery. Personalize it with a message at no extra cost.',
    ingredients: 'Sugar, enriched wheat flour, cream, eggs, cocoa, semisweet chocolate, butter, soybean oil, salt, vanilla.',
    contains: ['wheat', 'milk', 'eggs', 'soy'] }),
    img2: W('4/4d/Gibberd_Garden_chocolate_cake_Harlow_Essex_England.jpg/500px-Gibberd_Garden_chocolate_cake_Harlow_Essex_England.jpg', 'Gibberd Garden chocolate cake Harlow Essex England.jpg', 'CC BY-SA 4.0', 'Acabashi') },
  cake({ id: 'choc-hazelnut-torte', name: 'Chocolate Hazelnut Torte', p7: 16.99, p10: 25.99, rating: 4.7, reviews: 642,
    img: W('0/0c/Hazelnut_Cake_at_cafe_Noworolski_in_Krak%C3%B3w%2C_2023.jpg/500px-Hazelnut_Cake_at_cafe_Noworolski_in_Krak%C3%B3w%2C_2023.jpg', 'Hazelnut Cake at cafe Noworolski in Kraków, 2023.jpg', 'CC BY-SA 4.0', 'Kgbo'),
    details: 'Thin layers of chocolate sponge and hazelnut praline cream, topped with toasted hazelnuts.',
    ingredients: 'Sugar, wheat flour, hazelnuts, butter, eggs, cocoa, cream, salt.', contains: ['wheat', 'milk', 'eggs'], nuts: 'hazelnuts' }),
  cake({ id: 'german-choc-cake', name: 'German Chocolate Cake', p7: 15.49, p10: 23.49, rating: 4.6, reviews: 518,
    img: W('4/4e/Safeway_German_Chocolate_Cake_%2818715098202%29.jpg/500px-Safeway_German_Chocolate_Cake_%2818715098202%29.jpg', 'Safeway German Chocolate Cake (18715098202).jpg', 'CC BY-SA 2.0', 'Willis Lam'),
    details: 'Chocolate layers with the classic coconut and pecan frosting.',
    ingredients: 'Sugar, wheat flour, buttermilk, eggs, cocoa, pecans, coconut, butter.', contains: ['wheat', 'milk', 'eggs', 'coconut'], nuts: 'pecans' }),
  cake({ id: 'choc-fudge-cake', name: 'Triple Chocolate Fudge Cake', p7: 15.99, p10: 23.99, rating: 4.7, reviews: 905,
    img: W('e/ef/Chocolate_fudge_cake_%288768339071%29.jpg/500px-Chocolate_fudge_cake_%288768339071%29.jpg', 'Chocolate fudge cake (8768339071).jpg', 'CC BY-SA 2.0', 'James Petts'),
    details: 'Dense chocolate cake with fudge frosting and chocolate shavings.',
    ingredients: 'Sugar, wheat flour, chocolate, butter, eggs, cocoa, milk, vanilla.', contains: ['wheat', 'milk', 'eggs', 'soy'] }),
  cake({ id: 'choc-angel-cake', name: 'Chocolate Angel Food Cake', p7: 12.99, p10: 18.99, rating: 4.4, reviews: 233,
    img: W('4/42/Chocolate_angel_food_cake_with_various_toppings.jpg/500px-Chocolate_angel_food_cake_with_various_toppings.jpg', 'Chocolate angel food cake with various toppings.jpg', 'CC BY 2.0', "Shari's Berries"),
    details: 'Light, airy chocolate angel food cake with whipped topping and berries.',
    ingredients: 'Egg whites, sugar, wheat flour, cocoa, cream, strawberries.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'black-forest-cake', name: 'Black Forest Cake', p7: 15.99, p10: 24.99, rating: 4.6, reviews: 471,
    img: W('8/85/Black_Forest_cake_5.jpg/500px-Black_Forest_cake_5.jpg', 'Black Forest cake 5.jpg', 'CC BY-SA 3.0', 'Roozitaa'),
    details: 'Chocolate sponge layered with cherries and whipped cream, finished with chocolate curls.',
    ingredients: 'Cream, sugar, wheat flour, cherries, eggs, cocoa, chocolate.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'opera-cake', name: 'Opera Cake', p7: 18.99, p10: 28.99, rating: 4.5, reviews: 187,
    img: W("8/88/Schubert%27s_Bakery_Opera_Cake_slice_%2834908321421%29.jpg/500px-Schubert%27s_Bakery_Opera_Cake_slice_%2834908321421%29.jpg", "Schubert's Bakery Opera Cake slice (34908321421).jpg", 'CC BY-SA 2.0', 'Willis Lam'),
    details: 'French layers of almond sponge, coffee buttercream and chocolate ganache.',
    ingredients: 'Almond flour, sugar, butter, eggs, chocolate, coffee, wheat flour.', contains: ['wheat', 'milk', 'eggs'], nuts: 'almonds' }),
  { ...cake({ id: 'celebration-cake', name: 'Vanilla Celebration Cake', p7: 13.99, p10: 20.99, rating: 4.6, reviews: 702, stores: ['summit', 'greenway', 'confetti'],
    img: W('9/91/Italy_-_birthday_cake_with_candles_1.jpg/500px-Italy_-_birthday_cake_with_candles_1.jpg', 'Italy - birthday cake with candles 1.jpg', 'CC BY-SA 3.0 it', 'Francesca Cesa Bianchi'),
    details: 'Vanilla sponge with whipped vanilla frosting. Candles shown are not included.',
    ingredients: 'Sugar, wheat flour, cream, eggs, butter, vanilla.', contains: ['wheat', 'milk', 'eggs'] }) },
  cake({ id: 'red-velvet-cake', name: 'Red Velvet Cake', p7: 14.49, p10: 21.99, badge: 'Popular', rating: 4.7, reviews: 866,
    img: W('1/13/Red_velvet_cake_slice.jpg/500px-Red_velvet_cake_slice.jpg', 'Red velvet cake slice.jpg', 'CC BY 2.0', '~Twon~'),
    details: 'Velvety cocoa layers with cream cheese frosting.',
    ingredients: 'Sugar, wheat flour, buttermilk, cream cheese, eggs, cocoa, butter.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'strawberry-cake', name: 'Strawberry Shortcake', p7: 14.99, p10: 22.49, rating: 4.6, reviews: 554,
    img: W('a/a6/Strawberry_short_cake%EF%BC%88%E3%82%B9%E3%83%88%E3%83%AD%E3%83%99%E3%83%AA%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%BC%E3%83%88%E3%82%B1%E3%83%BC%E3%82%AD%EF%BC%89_%282874857378%29.jpg/500px-Strawberry_short_cake%EF%BC%88%E3%82%B9%E3%83%88%E3%83%AD%E3%83%99%E3%83%AA%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%BC%E3%83%88%E3%82%B1%E3%83%BC%E3%82%AD%EF%BC%89_%282874857378%29.jpg', 'Strawberry short cake（ストロベリーショートケーキ） (2874857378).jpg', 'CC BY 2.0', 'Yusuke Kawasaki'),
    details: 'Soft sponge with fresh strawberries and whipped cream.',
    ingredients: 'Cream, strawberries, sugar, wheat flour, eggs.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'lemon-cake', name: 'Lemon Chiffon Cake', p7: 13.49, p10: 19.99, rating: 4.5, reviews: 298,
    img: W('c/c6/Food_on_Mallorca_07.jpg/500px-Food_on_Mallorca_07.jpg', 'Food on Mallorca 07.jpg', 'CC BY-SA 4.0', 'Kritzolina'),
    details: 'Light lemon chiffon with lemon curd and meringue.',
    ingredients: 'Sugar, eggs, wheat flour, lemons, butter.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'tiramisu-cake', name: 'Tiramisu Celebration Cake', p7: 16.49, p10: 24.99, rating: 4.7, reviews: 412,
    img: W('4/47/Tiramisu_birthday_cake_-_20200124.jpg/500px-Tiramisu_birthday_cake_-_20200124.jpg', 'Tiramisu birthday cake - 20200124.jpg', 'CC BY-SA 4.0', 'Sikander Iqbal'),
    details: 'Coffee-soaked sponge layered with mascarpone cream and cocoa.',
    ingredients: 'Mascarpone, cream, sugar, eggs, wheat flour, coffee, cocoa.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'carrot-cake', name: 'Carrot Walnut Cake', p7: 14.49, p10: 21.49, rating: 4.6, reviews: 377,
    img: W('a/ab/Easter_cake_I.jpg/500px-Easter_cake_I.jpg', 'Easter cake I.jpg', 'CC BY-SA 2.0', 'Till Westermayer'),
    details: 'Spiced carrot cake with cream cheese frosting.',
    ingredients: 'Carrots, sugar, wheat flour, walnuts, eggs, cream cheese, oil, cinnamon.', contains: ['wheat', 'milk', 'eggs'], nuts: 'walnuts' }),
  cake({ id: 'coconut-cake', name: 'Coconut Cream Cake', p7: 14.99, p10: 22.99, rating: 4.4, reviews: 201,
    img: W('8/8e/Coconut_cake_garnished_with_Peeps_candy.jpg/500px-Coconut_cake_garnished_with_Peeps_candy.jpg', 'Coconut cake garnished with Peeps candy.jpg', 'CC BY-SA 2.0', 'heymrleej'),
    details: 'White cake with coconut cream frosting and toasted coconut.',
    ingredients: 'Sugar, wheat flour, coconut, cream, eggs, butter.', contains: ['wheat', 'milk', 'eggs', 'coconut'] }),
  cake({ id: 'pistachio-cake', name: 'Pistachio Crumble Cake', p7: 16.99, p10: 25.49, rating: 4.5, reviews: 164,
    img: W('1/10/Double_crumble_pistachio_cake_%281%29.jpg/500px-Double_crumble_pistachio_cake_%281%29.jpg', 'Double crumble pistachio cake (1).jpg', 'CC0', 'Fumikas Sagisavas'),
    details: 'Pistachio sponge with a buttery pistachio crumble.',
    ingredients: 'Pistachios, sugar, wheat flour, butter, eggs.', contains: ['wheat', 'milk', 'eggs'], nuts: 'pistachios' }),
  cake({ id: 'lane-cake', name: 'Southern Lane Cake', p7: 15.99, p10: 23.99, rating: 4.3, reviews: 96,
    img: W('9/97/Slice_of_lane_cake.jpg/500px-Slice_of_lane_cake.jpg', 'Slice of lane cake.jpg', 'CC BY-SA 2.0', 'Eunice'),
    details: 'Vanilla layers with a raisin, coconut and pecan filling.',
    ingredients: 'Sugar, wheat flour, butter, eggs, pecans, raisins, coconut.', contains: ['wheat', 'milk', 'eggs', 'coconut'], nuts: 'pecans' }),
  cake({ id: 'matcha-cake', name: 'Matcha Sponge Cake', p7: 15.49, p10: 22.99, rating: 4.4, reviews: 143,
    img: W('9/97/Making_matcha_sponge_cake_at_home_04.jpg/500px-Making_matcha_sponge_cake_at_home_04.jpg', 'Making matcha sponge cake at home 04.jpg', 'CC BY-SA 4.0', 'Peacearth'),
    details: 'Soft green tea sponge with light cream.',
    ingredients: 'Eggs, sugar, wheat flour, matcha, cream.', contains: ['wheat', 'milk', 'eggs'] }),
  cake({ id: 'oreo-cake', name: 'Cookies & Cream Ice Cream Cake', sub: 'ice-cream', p7: 17.99, p10: 26.99, rating: 4.7, reviews: 690,
    img: W('a/a3/Oreo_Ice-cream_Cake_-_Homemade_-_Trivandum%2C_Kerala_DSC_0027.jpg/500px-Oreo_Ice-cream_Cake_-_Homemade_-_Trivandum%2C_Kerala_DSC_0027.jpg', 'Oreo Ice-cream Cake - Homemade - Trivandum, Kerala DSC 0027.jpg', 'CC BY-SA 4.0', 'Silpa11'),
    details: 'Cookies and cream ice cream on a chocolate cookie crust. Keep frozen.',
    ingredients: 'Cream, milk, sugar, chocolate cookies (wheat flour, cocoa, soy), eggs.', contains: ['wheat', 'milk', 'eggs', 'soy'] }),
  cake({ id: 'ice-cream-cake', name: 'Birthday Ice Cream Cake', sub: 'ice-cream', p7: 18.99, p10: 27.99, rating: 4.6, reviews: 520,
    img: W('6/65/Cookies_n_cream_ice_cream_cake%21.jpg/500px-Cookies_n_cream_ice_cream_cake%21.jpg', 'Cookies n cream ice cream cake!.jpg', 'CC BY-SA 2.0', 'ynnil'),
    details: 'Vanilla and chocolate ice cream with fudge and crunchies. Keep frozen.',
    ingredients: 'Cream, milk, sugar, chocolate, wheat crunchies, eggs.', contains: ['wheat', 'milk', 'eggs', 'soy'] }),

  // ── Bakery: other ──
  { id: 'almond-pound-cake', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Almond Pound Cake', size: '16 oz loaf', bulkSize: '2 loaves', price: 7.99, bulkPrice: 11.99, contains: ['wheat', 'milk', 'eggs', 'tree nuts'], nuts: 'almonds',
    img: W('9/94/Almond_pound_cake%2C_angled_profile.jpg/500px-Almond_pound_cake%2C_angled_profile.jpg', 'Almond pound cake, angled profile.jpg', 'CC BY 2.0', 'Kimberly Vardeman') },
  { id: 'fruit-tart', aisle: 'bakery', sub: 'pies', brand: 'Bakery Fresh', name: 'Fresh Fruit Tart', size: '9 inch', bulkSize: '11 inch', price: 16.99, bulkPrice: 19.99, contains: ['wheat', 'milk', 'eggs'],
    img: W('6/6e/Fruit_tart.png/500px-Fruit_tart.png', 'Fruit tart.png', 'CC0', 'kartynas') },
  { id: 'cheesecake', aisle: 'bakery', sub: 'pies', brand: 'Summit Signature', name: 'New York Style Cheesecake', size: '10 inch', bulkSize: '10 inch, 4.5 lb', contains: ['wheat', 'milk', 'eggs'], price: 17.99, bulkPrice: 18.99,
    img: wm('5/59/Souffl%C3%A9-style_cheesecake_001.jpg/500px-Souffl%C3%A9-style_cheesecake_001.jpg', 'Soufflé-style cheesecake 001.jpg', 'CC0', 'Ocdp') },
  { id: 'cupcakes', aisle: 'bakery', sub: 'cupcakes', brand: 'Bakery Fresh', name: 'Assorted Frosted Cupcakes', size: '6 ct', bulkSize: '12 ct', contains: ['wheat', 'milk', 'eggs', 'soy'], price: 7.99, bulkPrice: 11.99,
    img: wm('b/b7/Cheshire_cupcakes.jpg/500px-Cheshire_cupcakes.jpg', 'Cheshire cupcakes.jpg', 'CC BY 3.0', 'Katja Seaton'), stores: ['summit', 'greenway', 'confetti'] },
  { id: 'apple-pie', aisle: 'bakery', sub: 'pies', brand: 'Bakery Fresh', name: 'Homestyle Apple Pie', size: '9 inch', bulkSize: '12 inch', contains: ['wheat', 'milk'], price: 8.99, bulkPrice: 12.99,
    img: wm('e/e8/Apple_pie_and_custard_Newgate_Street_Hatfield_Hertfordshire_England.jpg/500px-Apple_pie_and_custard_Newgate_Street_Hatfield_Hertfordshire_England.jpg', 'Apple pie and custard Newgate Street Hatfield Hertfordshire England.jpg', 'CC BY-SA 4.0', 'Acabashi') },
  { id: 'pumpkin-pie', aisle: 'bakery', sub: 'pies', brand: 'Bakery Fresh', name: 'Pumpkin Pie', size: '9 inch', bulkSize: '12 inch, 58 oz', contains: ['wheat', 'milk', 'eggs'], price: 7.49, bulkPrice: 6.99, badge: 'Seasonal',
    img: wm('e/e8/Pumpkin-Pie-Whole-Slice.jpg/500px-Pumpkin-Pie-Whole-Slice.jpg', 'Pumpkin-Pie-Whole-Slice.jpg', 'CC BY-SA 3.0', 'Evan-Amos') },
  { id: 'tiramisu', aisle: 'bakery', sub: 'pies', brand: 'Bakery Fresh', name: 'Tiramisu Slice', size: '5 oz', bulkSize: '2 ct', contains: ['wheat', 'milk', 'eggs'], price: 4.99, bulkPrice: 8.49,
    img: wm('5/56/Ambrosia_Italian_Restaurant_-_June_2022_-_Sarah_Stierch_13.jpg/500px-Ambrosia_Italian_Restaurant_-_June_2022_-_Sarah_Stierch_13.jpg', 'Ambrosia Italian Restaurant - June 2022 - Sarah Stierch 13.jpg', 'CC BY 4.0', 'Missvain') },
  { id: 'croissants', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Butter Croissants', size: '4 ct', bulkSize: '12 ct', contains: ['wheat', 'milk', 'eggs'], price: 5.49, bulkPrice: 7.99, badge: 'Best seller',
    img: wm('2/2a/Croissant-Petr_Kratochvil.jpg/500px-Croissant-Petr_Kratochvil.jpg', 'Croissant-Petr Kratochvil.jpg', 'CC0', 'Petr Kratochvil'), stores: ['summit', 'greenway', 'fairfield'] },
  { id: 'muffins', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Blueberry Muffins', size: '4 ct', bulkSize: '12 ct', contains: ['wheat', 'milk', 'eggs', 'soy'], price: 5.99, bulkPrice: 10.99,
    img: wm('b/b7/Muffin_-_NCI_Visuals_Online.jpg/500px-Muffin_-_NCI_Visuals_Online.jpg', 'Muffin - NCI Visuals Online.jpg', 'Public domain', 'Renee Comet') },
  { id: 'cinnamon-rolls', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Iced Cinnamon Rolls', size: '4 ct', bulkSize: '12 ct', contains: ['wheat', 'milk', 'eggs', 'soy'], price: 6.49, bulkPrice: 9.99,
    img: wm('6/6b/Cinnamon-Roll-US-Bakery.jpg/500px-Cinnamon-Roll-US-Bakery.jpg', 'Cinnamon-Roll-US-Bakery.jpg', 'Public domain', 'Evan-Amos') },
  { id: 'cookies', aisle: 'bakery', sub: 'cupcakes', brand: 'Bakery Fresh', name: 'Chocolate Chip Cookies', size: '12 ct', bulkSize: '24 ct', contains: ['wheat', 'milk', 'eggs', 'soy'], price: 4.99, bulkPrice: 8.99,
    img: wm('1/16/Choc-Chip-Cookie.jpg/500px-Choc-Chip-Cookie.jpg', 'Choc-Chip-Cookie.jpg', 'Public domain', 'Evan-Amos') },
  { id: 'bagels', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Plain Bagels', size: '6 ct', bulkSize: '12 ct', contains: ['wheat'], price: 4.49, bulkPrice: 6.99,
    img: wm('1/1d/Bagel-Plain-Alt.jpg/500px-Bagel-Plain-Alt.jpg', 'Bagel-Plain-Alt.jpg', 'Public domain', 'Evan-Amos') },
  { id: 'sourdough', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Artisan Sourdough Loaf', size: '24 oz', bulkSize: '2 x 24 oz', contains: ['wheat'], price: 5.99, bulkPrice: 8.99,
    img: wm('3/3b/Home_made_sour_dough_bread.jpg/500px-Home_made_sour_dough_bread.jpg', 'Home made sour dough bread.jpg', 'CC BY-SA 4.0', 'Tomascastelazo'), stores: ['summit', 'greenway', 'fairfield'] },
  { id: 'rolls', aisle: 'bakery', sub: 'breads', brand: 'Bakery Fresh', name: 'Soft Dinner Rolls', size: '12 ct', bulkSize: '36 ct', contains: ['wheat', 'milk'], price: 3.99, bulkPrice: 6.49,
    img: wm('a/ad/Japanese_bread_rolls_Rollpan.jpg/500px-Japanese_bread_rolls_Rollpan.jpg', 'Japanese bread rolls Rollpan.jpg', 'CC BY-SA 4.0', 'Yæba') },

  // ── Produce ──
  { id: 'bananas', aisle: 'produce', name: 'Bananas', size: 'About 0.4 lb each', bulkSize: '3 lb bag', price: 0.29, bulkPrice: 1.49, unit: 'each', badge: 'Best seller',
    img: wm('b/bb/Banana_on_whitebackground.jpg/500px-Banana_on_whitebackground.jpg', 'Banana on whitebackground.jpg', 'CC BY-SA 4.0', "Filo gèn'") },
  { id: 'strawberries', aisle: 'produce', name: 'Strawberries', size: '1 lb', bulkSize: '2 lb', price: 3.99, bulkPrice: 5.99,
    img: { src: 'https://upload.wikimedia.org/wikipedia/commons/d/de/FraiseFruitPhoto.jpg', credit: { title: 'FraiseFruitPhoto.jpg', license: 'CC BY-SA 3.0', author: 'FoeNyx', site: 'Wikimedia Commons', page: 'https://commons.wikimedia.org/wiki/File:FraiseFruitPhoto.jpg' } } },
  { id: 'blueberries', aisle: 'produce', name: 'Blueberries', size: '6 oz', bulkSize: '18 oz', price: 3.49, bulkPrice: 5.99,
    img: wm('7/7d/Dish_of_blueberries.jpg/500px-Dish_of_blueberries.jpg', 'Dish of blueberries.jpg', 'CC BY-SA 4.0', 'Petar Milošević') },
  { id: 'avocados', aisle: 'produce', name: 'Hass Avocados', size: '1 ct', bulkSize: '5 ct', price: 1.25, bulkPrice: 5.99, unit: 'each',
    img: wm('5/5d/Avocado_with_cross_section_edit.jpg/500px-Avocado_with_cross_section_edit.jpg', 'Avocado with cross section edit.jpg', 'GFDL 1.2', 'Muhammad Mahdi Karim') },
  { id: 'apples', aisle: 'produce', name: 'Honeycrisp Apples', size: 'About 0.5 lb each', bulkSize: '5 lb bag', price: 1.49, bulkPrice: 7.99,
    img: wm('1/15/Red_Apple.jpg/500px-Red_Apple.jpg', 'Red Apple.jpg', 'CC BY 2.0', 'Abhijit Tembhekar') },
  { id: 'mandarins', aisle: 'produce', name: 'Mandarin Oranges', size: '2 lb bag', bulkSize: '5 lb bag', price: 4.49, bulkPrice: 7.49,
    img: wm('4/49/Mandarin_Oranges_%28Citrus_Reticulata%29.jpg/500px-Mandarin_Oranges_%28Citrus_Reticulata%29.jpg', 'Mandarin Oranges (Citrus Reticulata).jpg', 'CC BY-SA 3.0', 'Joe Ravi') },
  { id: 'lemons', aisle: 'produce', name: 'Lemons', size: '1 ct', bulkSize: '4 lb bag', price: 0.69, bulkPrice: 5.49, unit: 'each',
    img: wm('e/e4/Lemon.jpg/500px-Lemon.jpg', 'Lemon.jpg', 'CC BY-SA 2.5', 'André Karwath') },
  { id: 'mango', aisle: 'produce', name: 'Mangoes', size: '1 ct', bulkSize: '6 ct', price: 1.29, bulkPrice: 6.99, unit: 'each',
    img: wm('a/a5/Mango_and_cross_sections.jpg/500px-Mango_and_cross_sections.jpg', 'Mango and cross sections.jpg', 'GFDL 1.2', 'Fir0002') },
  { id: 'pineapple', aisle: 'produce', name: 'Golden Pineapple', size: '1 ct', bulkSize: '1 ct', price: 3.49, bulkPrice: 2.99, unit: 'each',
    img: wm('7/7a/Ananas~May_2008-1.jpg/500px-Ananas~May_2008-1.jpg', 'Ananas~May 2008-1.jpg', 'CC BY-SA 3.0', 'Alvesgaspar') },
  { id: 'kiwi', aisle: 'produce', name: 'Kiwifruit', size: '1 lb', bulkSize: '3 lb', price: 2.99, bulkPrice: 6.49,
    img: wm('b/b8/Kiwi_%28Actinidia_chinensis%29_1_Luc_Viatour.jpg/500px-Kiwi_%28Actinidia_chinensis%29_1_Luc_Viatour.jpg', 'Kiwi (Actinidia chinensis) 1 Luc Viatour.jpg', 'CC BY-SA 2.5', 'Luc Viatour') },
  { id: 'cherries', aisle: 'produce', name: 'Dark Sweet Cherries', size: '1 lb', bulkSize: '4 lb', price: 5.99, bulkPrice: 14.99, badge: 'Seasonal',
    img: wm('b/bb/Cherry_Stella444.jpg/500px-Cherry_Stella444.jpg', 'Cherry Stella444.jpg', 'CC BY-SA 3.0', 'Benjamint444') },
  { id: 'watermelon', aisle: 'produce', name: 'Seedless Watermelon', size: '1 ct', bulkSize: '1 ct', price: 6.99, bulkPrice: 5.99, unit: 'each',
    img: wm('b/b9/Watermelon.jpg/500px-Watermelon.jpg', 'Watermelon.jpg', 'Public domain', 'Scott Bauer, USDA') },
  { id: 'bell-peppers', aisle: 'produce', name: 'Red Bell Peppers', size: '1 ct', bulkSize: '6 ct', price: 1.49, bulkPrice: 6.99, unit: 'each',
    img: wm('d/da/Red_capsicum_and_cross_section.jpg/500px-Red_capsicum_and_cross_section.jpg', 'Red capsicum and cross section.jpg', 'GFDL 1.2', 'Fir0002') },
  { id: 'broccoli', aisle: 'produce', name: 'Broccoli Crowns', size: 'About 1 lb', bulkSize: '3 lb', price: 2.49, bulkPrice: 4.99,
    img: wm('0/03/Broccoli_and_cross_section_edit.jpg/500px-Broccoli_and_cross_section_edit.jpg', 'Broccoli and cross section edit.jpg', 'GFDL 1.2', 'Fir0002') },
  { id: 'carrots', aisle: 'produce', name: 'Carrots', size: '2 lb bag', bulkSize: '5 lb bag', price: 1.99, bulkPrice: 3.99,
    img: wm('0/05/Big_Carrot-2356.jpg/500px-Big_Carrot-2356.jpg', 'Big Carrot-2356.jpg', 'CC BY-SA 4.0', 'Raimond Spekking') },
  { id: 'tomatoes', aisle: 'produce', name: 'Vine-Ripened Tomatoes', size: 'About 0.4 lb each', bulkSize: '3 lb', price: 0.89, bulkPrice: 5.49,
    img: wm('8/89/Tomato_je.jpg/500px-Tomato_je.jpg', 'Tomato je.jpg', 'CC BY-SA 3.0', 'Softeis') },
  { id: 'onions', aisle: 'produce', name: 'Yellow Onions', size: '3 lb bag', bulkSize: '10 lb bag', price: 2.99, bulkPrice: 6.99,
    img: wm('2/25/Onion_on_White.JPG/500px-Onion_on_White.JPG', 'Onion on White.JPG', 'CC BY-SA 3.0', 'Colin') },
  { id: 'spinach', aisle: 'produce', name: 'Baby Spinach', size: '5 oz', bulkSize: '1 lb', price: 3.49, bulkPrice: 4.99,
    img: wm('5/5e/Spinach_leaves.png/500px-Spinach_leaves.png', 'Spinach leaves.png', 'CC BY-SA 4.0', 'Tiia Monto') },

  // ── Dairy & Eggs ──
  { id: 'eggs', aisle: 'dairy', brand: 'Farm Fresh', name: 'Large Brown Eggs', size: '6 ct', bulkSize: '24 ct', price: 2.99, bulkPrice: 7.99,
    img: wm('1/12/6-Pack-Chicken-Eggs.jpg/500px-6-Pack-Chicken-Eggs.jpg', '6-Pack-Chicken-Eggs.jpg', 'Public domain', 'Evan-Amos') },
  { id: 'butter', aisle: 'dairy', brand: 'Summit Signature', name: 'Salted Butter', size: '1 lb', bulkSize: '4 x 1 lb', price: 4.99, bulkPrice: 12.99,
    img: wm('f/f9/Stick-of-butter-salted.jpg/500px-Stick-of-butter-salted.jpg', 'Stick-of-butter-salted.jpg', 'CC0', 'photos-public-domain.com') },
  { id: 'brie', aisle: 'dairy', brand: 'Fromagerie', name: 'Double Crème Brie', size: '8 oz', bulkSize: '2 lb', price: 6.99, bulkPrice: 13.99,
    img: wm('f/f6/Brie_1.jpg/500px-Brie_1.jpg', 'Brie 1.jpg', 'CC BY-SA 4.0', 'Guy Waterval') },
  { id: 'parmesan', aisle: 'dairy', brand: 'Fromagerie', name: 'Parmigiano Reggiano Wedge', size: '8 oz', bulkSize: '2 lb', price: 8.99, bulkPrice: 22.99,
    img: wm('f/f2/Parmigiano_Reggiano.jpg/500px-Parmigiano_Reggiano.jpg', 'Parmigiano Reggiano.jpg', 'CC BY-SA 4.0', 'Tiia Monto') },
  { id: 'mozzarella', aisle: 'dairy', brand: 'Fromagerie', name: 'Fresh Mozzarella', size: '8 oz', bulkSize: '2 x 16 oz', price: 4.49, bulkPrice: 10.99,
    img: wm('5/50/Mozzarella_cheese.jpg/500px-Mozzarella_cheese.jpg', 'Mozzarella cheese.jpg', 'Public domain', 'Jon Sullivan') },
  { id: 'yoplait', aisle: 'dairy', brand: 'Yoplait', name: 'Original Mountain Blueberry Yogurt', size: '6 oz', bulkSize: '18 x 6 oz', price: 0.89, bulkPrice: 11.99,
    img: off('007/047/000/3023/front_en.49.400.jpg', '0070470003023') },
  { id: 'silk', aisle: 'dairy', brand: 'Silk', name: 'Organic Unsweetened Soymilk', size: '64 fl oz', bulkSize: '3 x 64 fl oz', price: 4.29, bulkPrice: 9.99,
    img: off('002/529/360/0232/front_en.190.400.jpg', '0025293600232') },

  // ── Meat, Seafood, Deli ──
  { id: 'chicken-breast', aisle: 'meat', brand: 'Summit Signature', name: 'Boneless Skinless Chicken Breasts', size: '1.5 lb', bulkSize: '6 lb', price: 7.49, bulkPrice: 21.99,
    img: wm('b/b8/Raw_chicken_slices.jpg/500px-Raw_chicken_slices.jpg', 'Raw chicken slices.jpg', 'CC0', 'kakyusei') },
  { id: 'salmon', aisle: 'meat', brand: 'Summit Signature', name: 'Atlantic Salmon Fillet', size: '1 lb', bulkSize: '3 lb', price: 11.99, bulkPrice: 29.99,
    img: wm('9/98/Salmon2.jpg/500px-Salmon2.jpg', 'Salmon2.jpg', 'CC BY-SA 3.0', 'Tiia Monto') },
  { id: 'rotisserie', aisle: 'deli', brand: 'Summit Signature', name: 'Rotisserie Chicken', size: '3 lb', bulkSize: '3 lb', price: 7.99, bulkPrice: 4.99, badge: 'Best seller',
    img: wm('d/d0/Roast_Chicken_Legs_and_Thighs_%2831196736704%29.jpg/500px-Roast_Chicken_Legs_and_Thighs_%2831196736704%29.jpg', 'Roast Chicken Legs and Thighs (31196736704).jpg', 'CC BY-SA 2.0', 'Willis Lam') },
  { id: 'pizza', aisle: 'deli', brand: 'Deli Kitchen', name: 'Take & Bake Pepperoni Pizza', size: '16 inch', bulkSize: '18 inch', price: 11.99, bulkPrice: 14.99,
    img: wm('9/92/D%27Oro_Pizza_Bar_%28Miami%29_Pepperoni_pizza_en_janvier_2022.jpg/500px-D%27Oro_Pizza_Bar_%28Miami%29_Pepperoni_pizza_en_janvier_2022.jpg', "D'Oro Pizza Bar (Miami) Pepperoni pizza en janvier 2022.jpg", 'CC0', 'Benoît Prieur') },

  // ── Frozen ──
  { id: 'ben-jerrys', aisle: 'frozen', brand: "Ben & Jerry's", name: 'Chunky Monkey Ice Cream', size: '16 oz', bulkSize: '4 x 16 oz', price: 5.99, bulkPrice: 17.99,
    img: off('007/684/010/0354/front_es.32.400.jpg', '0076840100354') },

  // ── Snacks ──
  { id: 'doritos', aisle: 'snacks', brand: 'Doritos', name: 'Nacho Cheese Tortilla Chips', size: '9.25 oz', bulkSize: '30 ct variety', price: 5.29, bulkPrice: 16.99,
    img: off('002/840/007/0560/front_en.87.400.jpg', '0028400070560') },
  { id: 'cheetos', aisle: 'snacks', brand: 'Cheetos', name: 'Crunchy Cheese Snacks', size: '8.5 oz', bulkSize: '30 ct', price: 4.99, bulkPrice: 15.99,
    img: off('002/840/004/0112/front_en.292.400.jpg', '0028400040112') },
  { id: 'pringles', aisle: 'snacks', brand: 'Pringles', name: 'Original Potato Crisps', size: '5.2 oz', bulkSize: '14 x 5.2 oz', price: 2.79, bulkPrice: 17.49,
    img: off('003/800/013/8416/front_en.140.400.jpg', '0038000138416') },
  { id: 'goldfish', aisle: 'snacks', brand: 'Goldfish', name: 'Cheddar Crackers', size: '6.6 oz', bulkSize: '58 oz carton', price: 2.99, bulkPrice: 11.99, badge: 'Best seller',
    img: off('001/410/008/5478/front_en.48.400.jpg', '0014100085478') },
  { id: 'oreo', aisle: 'snacks', brand: 'Oreo', name: 'Chocolate Sandwich Cookies', size: '14.3 oz', bulkSize: '4 x 14.3 oz', price: 4.79, bulkPrice: 13.99,
    img: off('004/400/003/2029/front_en.7.400.jpg', '0044000032029') },
  { id: 'cashews', aisle: 'snacks', brand: 'Summit Signature', name: 'Whole Roasted Cashews', size: '8 oz', bulkSize: '2.5 lb', price: 5.99, bulkPrice: 17.99,
    img: wm('e/ed/2013-12-21_15-39-39_noix-cajou-15f.jpg/500px-2013-12-21_15-39-39_noix-cajou-15f.jpg', '2013-12-21 15-39-39 noix-cajou-15f.jpg', 'CC BY 3.0', 'Thomas Bresson') },
  { id: 'mixed-nuts', aisle: 'snacks', brand: 'Summit Signature', name: 'Deluxe Mixed Nuts', size: '10 oz', bulkSize: '2.5 lb', price: 7.49, bulkPrice: 19.99,
    img: wm('5/54/Pecans%2C_hazelnuts%2C_walnuts%2C_almonds%2C_Brazil_nuts_on_a_table_with_logs_5.jpg/500px-Pecans%2C_hazelnuts%2C_walnuts%2C_almonds%2C_Brazil_nuts_on_a_table_with_logs_5.jpg', 'Pecans, hazelnuts, walnuts, almonds, Brazil nuts on a table with logs 5.jpg', 'CC0', 'Baileynorwood') },
  { id: 'trail-mix', aisle: 'snacks', brand: 'Planters', name: 'Trail Mix', size: '6 oz', bulkSize: '4 lb', price: 3.99, bulkPrice: 15.99,
    img: wm('7/71/Planters-Trail-Mix.jpg/500px-Planters-Trail-Mix.jpg', 'Planters-Trail-Mix.jpg', 'CC0', 'Evan-Amos') },
  { id: 'pretzel-crisps', aisle: 'snacks', brand: 'Snack Factory', name: 'Pretzel Crisps', size: '7.2 oz', bulkSize: '28 oz', price: 3.99, bulkPrice: 8.99,
    img: wm('c/c6/Pretzel-Crisps.jpg/500px-Pretzel-Crisps.jpg', 'Pretzel-Crisps.jpg', 'Public domain', 'Evan-Amos') },
  { id: 'kind', aisle: 'snacks', brand: 'KIND', name: 'Peanut Butter Whole Grain Clusters', size: '11 oz', bulkSize: '2 x 11 oz', price: 5.49, bulkPrice: 9.99,
    img: off('060/265/217/1826/front_en.58.400.jpg', '0602652171826') },
  { id: 'clif', aisle: 'snacks', brand: 'CLIF', name: 'Chocolate Chip Energy Bar', size: '2.4 oz', bulkSize: '24 ct', price: 1.79, bulkPrice: 22.99,
    img: off('072/225/210/0900/front_en.171.400.jpg', '0722252100900') },
  { id: 'nature-valley', aisle: 'snacks', brand: 'Nature Valley', name: "Oats 'N Honey Granola Bars", size: '6 ct', bulkSize: '49 ct', price: 4.29, bulkPrice: 14.99,
    img: off('001/600/026/4694/front_en.319.400.jpg', '0016000264694') },

  // ── Candy & Chocolate ──
  { id: 'hersheys', aisle: 'candy', brand: "Hershey's", name: 'Milk Chocolate Bar', size: '1.55 oz', bulkSize: '36 ct', price: 1.49, bulkPrice: 29.99,
    img: off('003/400/000/2405/front_en.13.400.jpg', '0034000002405'), stores: ['summit', 'greenway', 'bloom', 'maple', 'confetti'] },
  { id: 'mms', aisle: 'candy', brand: "M&M's", name: 'Milk Chocolate Candies', size: '1.69 oz', bulkSize: '48 ct', price: 1.69, bulkPrice: 34.99,
    img: off('004/000/000/0310/front_en.46.400.jpg', '0040000000310'), stores: ['summit', 'greenway', 'bloom', 'maple', 'confetti'] },
  { id: 'nutella', aisle: 'pantry', brand: 'Nutella', name: 'Hazelnut Spread with Cocoa', size: '13 oz', bulkSize: '2 x 33.5 oz', price: 4.99, bulkPrice: 17.99,
    img: off('301/762/042/2003/front_en.879.400.jpg', '3017620422003') },

  // ── Beverages ──
  { id: 'diet-coke', aisle: 'beverages', brand: 'Diet Coke', name: 'Diet Coke Soda', size: '12 x 12 fl oz', bulkSize: '35 x 12 fl oz', price: 8.49, bulkPrice: 17.99,
    img: off('004/900/002/8911/front_en.24.400.jpg', '0049000028911') },
  { id: 'coke-zero', aisle: 'beverages', brand: 'Coca-Cola', name: 'Coca-Cola Zero Sugar', size: '12 fl oz can', bulkSize: '35 x 12 fl oz', price: 1.29, bulkPrice: 17.99,
    img: off('004/900/004/2566/front_en.108.400.jpg', '0049000042566') },
  { id: 'sprite', aisle: 'beverages', brand: 'Sprite', name: 'Lemon-Lime Soda', size: '12 x 12 fl oz', bulkSize: '35 x 12 fl oz', price: 8.49, bulkPrice: 17.99,
    img: off('004/900/002/8928/front_en.23.400.jpg', '0049000028928') },
  { id: 'red-bull', aisle: 'beverages', brand: 'Red Bull', name: 'Energy Drink', size: '8.4 fl oz', bulkSize: '24 x 8.4 fl oz', price: 2.49, bulkPrice: 39.99,
    img: off('061/126/999/1000/front_en.108.400.jpg', '0611269991000') },
  { id: 'tropicana', aisle: 'beverages', brand: 'Tropicana', name: 'Pure Premium Orange Juice', size: '52 fl oz', bulkSize: '2 x 89 fl oz', price: 4.99, bulkPrice: 11.99,
    img: off('004/850/020/2913/front_en.18.400.jpg', '0048500202913') },
  { id: 'coffee', aisle: 'beverages', brand: 'Summit Signature', name: 'House Blend Whole Bean Coffee', size: '12 oz', bulkSize: '2.5 lb', price: 8.99, bulkPrice: 16.99,
    img: wm('0/06/Coffee_Beans_Photographed_in_Macro.jpg/500px-Coffee_Beans_Photographed_in_Macro.jpg', 'Coffee Beans Photographed in Macro.jpg', 'CC BY-SA 3.0', 'Robert Knapp') },

  // ── Breakfast ──
  { id: 'cheerios', aisle: 'breakfast', brand: 'Cheerios', name: 'Cheerios Whole Grain Oat Cereal', size: '18 oz', bulkSize: '2 x 20.35 oz', price: 5.29, bulkPrice: 8.99,
    img: off('001/600/027/5287/front_en.8.400.jpg', '0016000275287') },
  { id: 'froot-loops', aisle: 'breakfast', brand: "Kellogg's", name: 'Froot Loops Cereal', size: '10.1 oz', bulkSize: '2 x 21.7 oz', price: 4.99, bulkPrice: 9.49,
    img: off('003/800/019/9011/front_en.4.400.jpg', '0038000199011') },
  { id: 'oats', aisle: 'breakfast', brand: 'Summit Signature', name: 'Old Fashioned Rolled Oats', size: '42 oz', bulkSize: '10 lb', price: 4.49, bulkPrice: 9.99,
    img: wm('b/b1/Rolled_oats_2.jpg/500px-Rolled_oats_2.jpg', 'Rolled oats 2.jpg', 'CC BY-SA 4.0', 'Yonygg') },

  // ── Pantry ──
  { id: 'jif', aisle: 'pantry', brand: 'Jif', name: 'Creamy Peanut Butter', size: '16 oz', bulkSize: '2 x 48 oz', price: 3.49, bulkPrice: 13.99,
    img: off('005/150/025/5162/front_en.197.400.jpg', '0051500255162') },
  { id: 'skippy', aisle: 'pantry', brand: 'Skippy', name: 'Creamy Peanut Butter', size: '16.3 oz', bulkSize: '2 x 48 oz', price: 3.29, bulkPrice: 12.99,
    img: off('003/760/011/0754/front_en.105.400.jpg', '0037600110754') },
  { id: 'kraft-mac', aisle: 'pantry', brand: 'Kraft', name: 'Original Macaroni & Cheese Dinner', size: '7.25 oz', bulkSize: '18 x 7.25 oz', price: 1.49, bulkPrice: 16.99,
    img: off('002/100/065/8831/front_en.250.400.jpg', '0021000658831') },
  { id: 'barilla', aisle: 'pantry', brand: 'Barilla', name: 'Penne Pasta', size: '16 oz', bulkSize: '8 x 16 oz', price: 1.99, bulkPrice: 10.99,
    img: off('007/680/828/0739/front_en.137.400.jpg', '0076808280739') },
  { id: 'hellmanns', aisle: 'pantry', brand: "Hellmann's", name: 'Real Mayonnaise', size: '30 fl oz', bulkSize: '2 x 30 fl oz', price: 6.49, bulkPrice: 10.99,
    img: off('004/800/121/3487/front_en.105.400.jpg', '0048001213487') },
  { id: 'campbells', aisle: 'pantry', brand: "Campbell's", name: 'Chicken Noodle Condensed Soup', size: '10.75 oz', bulkSize: '12 x 10.75 oz', price: 1.79, bulkPrice: 12.99,
    img: off('005/100/001/2517/front_en.66.400.jpg', '0051000012517') },
  { id: 'progresso', aisle: 'pantry', brand: 'Progresso', name: 'Beef & Vegetable Soup', size: '18.5 oz', bulkSize: '8 x 18.5 oz', price: 2.99, bulkPrice: 15.99,
    img: off('004/119/691/0759/front_en.25.400.jpg', '0041196910759') },
  { id: 'del-monte-corn', aisle: 'pantry', brand: 'Del Monte', name: 'Whole Kernel Corn', size: '15.25 oz', bulkSize: '12 x 15.25 oz', price: 1.29, bulkPrice: 9.99,
    img: off('002/400/016/3022/front_en.124.400.jpg', '0024000163022') },
  { id: 'cup-noodles', aisle: 'pantry', brand: 'Nissin', name: 'Cup Noodles Teriyaki Chicken Stir Fry', size: '3 oz', bulkSize: '12 ct', price: 1.39, bulkPrice: 12.49,
    img: off('007/066/240/4058/front_en.18.400.jpg', '0070662404058'), stores: ['summit', 'greenway', 'lotus', 'maple'] },
  { id: 'olive-oil', aisle: 'pantry', brand: 'Iliada', name: 'Extra Virgin Olive Oil', size: '17 fl oz', bulkSize: '2 L', price: 9.99, bulkPrice: 19.99,
    img: wm('d/d2/2023_Oliwa_z_oliwek_Iliada_%281%29.jpg/500px-2023_Oliwa_z_oliwek_Iliada_%281%29.jpg', '2023 Oliwa z oliwek Iliada (1).jpg', 'CC BY-SA 4.0', 'Jacek Halicki') },
  { id: 'flour', aisle: 'pantry', brand: 'Summit Signature', name: 'All-Purpose Flour', size: '5 lb', bulkSize: '25 lb', price: 3.99, bulkPrice: 9.99,
    img: wm('6/64/All-Purpose_Flour_%284107895947%29.jpg/500px-All-Purpose_Flour_%284107895947%29.jpg', 'All-Purpose Flour (4107895947).jpg', 'CC BY-SA 2.0', 'Veganbaking.net') },

  // ── Household ──
  { id: 'paper-towels', aisle: 'household', brand: 'Summit Signature', name: 'Premium Paper Towels', size: '6 rolls', bulkSize: '12 rolls', price: 9.99, bulkPrice: 21.99,
    img: wm('9/9d/Paper_towel.png/500px-Paper_towel.png', 'Paper towel.png', 'CC BY-SA 3.0', 'Mets501') },
  { id: 'toilet-paper', aisle: 'household', brand: 'Summit Signature', name: 'Bath Tissue, 2-Ply', size: '12 rolls', bulkSize: '30 rolls', price: 12.99, bulkPrice: 24.99,
    img: wm('c/cd/Toilet_paper_roll.jpg/500px-Toilet_paper_roll.jpg', 'Toilet paper roll.jpg', 'CC BY-SA 4.0', 'Cmann999') },

  // ── Flowers ──
  { id: 'roses', aisle: 'flowers', brand: 'Floral', name: 'Red & Yellow Rose Bouquet', size: '24 stems', bulkSize: '24 stems', price: 24.99, bulkPrice: 19.99, badge: 'Gift',
    img: wm('8/84/Bouquet_of_red_and_yellow_roses.jpg/500px-Bouquet_of_red_and_yellow_roses.jpg', 'Bouquet of red and yellow roses.jpg', 'CC0', 'Karthika Manikandan'), stores: ['summit', 'greenway', 'bloom'] },
  { id: 'tulips', aisle: 'flowers', brand: 'Floral', name: 'Tulip Bouquet', size: '10 stems', bulkSize: '20 stems', price: 12.99, bulkPrice: 16.99,
    img: wm('4/4f/Tulip_Bouquet_%28141139731%29.jpeg/500px-Tulip_Bouquet_%28141139731%29.jpeg', 'Tulip Bouquet (141139731).jpeg', 'CC0', 'Marta Borowiecka'), stores: ['summit', 'greenway', 'bloom'] },
];

// Allergen facts. Cakes and bakery items list what they contain; nuts are
// tree nuts or peanuts (from the facts, or from the product's name).
const NUT_WORDS = /\b(nuts?|almonds?|pecans?|walnuts?|peanuts?|hazelnuts?|cashews?|pistachios?|nutella)\b/i;
export const hasNuts = (p) => !!(p && (p.nuts || (p.contains || []).some((a) => a === 'tree nuts' || a === 'peanuts') || NUT_WORDS.test(`${p.name} ${p.brand || ''}`)));
export const isCake = (p) => !!(p && p.options);
export const glutenFree = (p) => !!(p && p.contains && !p.contains.includes('wheat'));
export function allergenText(p) {
  if (!p) return '';
  if (p.allergens) return p.allergens;
  if (!p.contains) return hasNuts(p) ? 'Contains nuts. Check the package for full allergen details.' : 'Allergen details are on the package.';
  const names = { wheat: 'Wheat', milk: 'Milk', eggs: 'Eggs', soy: 'Soy', 'tree nuts': 'Tree nuts', peanuts: 'Peanuts', coconut: 'Coconut' };
  return `Contains: ${p.contains.map((a) => names[a] || a).join(', ')}${p.nuts ? ` (${p.nuts})` : ''}.${hasNuts(p) ? '' : ' Made in a kitchen that also handles nuts.'}`;
}

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const product = (id) => byId.get(id) || null;
export const store = (id) => STORES.find((s) => s.id === id) || null;

/** Does this store carry this product? */
export function carries(s, p) {
  if (!s || !p) return false;
  if (p.stores) return p.stores.includes(s.id);
  return s.carries === 'all' || s.carries.includes(p.aisle);
}

/** The product as sold at a given store (Summit sells bulk packs). */
export function offer(s, p) {
  const bulk = s && s.bulk && p.bulkSize;
  return { size: bulk ? p.bulkSize : p.size, price: bulk ? p.bulkPrice : p.price };
}

export const storeProducts = (s) => PRODUCTS.filter((p) => carries(s, p));

/** Words a person might search with for each aisle. */
const SYNONYMS = { bakery: 'cake cakes dessert pie bread pastry', produce: 'fruit fruits vegetable vegetables veggies', dairy: 'cheese milk', meat: 'chicken fish seafood', snacks: 'chips crackers nuts', candy: 'chocolate sweets', beverages: 'drink drinks soda juice', breakfast: 'cereal', flowers: 'flower bouquet gift' };
export function matches(p, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/(ies)$/, 'y').replace(/s$/, ''));
  if (!words.length) return 0;
  const hay = `${p.name} ${p.brand || ''} ${p.aisle} ${SYNONYMS[p.aisle] || ''}`.toLowerCase();
  const name = `${p.name} ${p.brand || ''}`.toLowerCase();
  let score = 0;
  for (const w of words) { if (name.includes(w)) score += 3; else if (hay.includes(w)) score += 1; else return 0; }
  return score;
}

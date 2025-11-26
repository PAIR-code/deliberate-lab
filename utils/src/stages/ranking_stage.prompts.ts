/** Prompt constants and utils for interacting with ranking stage. */
import {
  StructuredOutputDataType,
  createStructuredOutputConfig,
} from '../structured_output';

/** Structured output config for ranking stage agent participant query. */
export const RANKING_STRUCTURED_OUTPUT_CONFIG = createStructuredOutputConfig({
  schema: {
    type: StructuredOutputDataType.ARRAY,
    description:
      'An ordered list of IDs ranked from most preferred to least preferred',
    arrayItems: {
      type: StructuredOutputDataType.STRING,
      description: 'The ID of the participant being ranked',
    },
  },
});

// TODO: Use example participants in fake prompt data input
// This is currently a shuffle list of participants (one for each letter A-Z)
export const EXAMPLE_PARTICIPANTS: {name: string; publicId: string}[] = [
  {name: 'Strawberry Shortcake', publicId: 'strawberry-red-192'},
  {name: 'Onion Rings', publicId: 'onion-white-158'},
  {name: 'Zucchini Bread', publicId: 'zucchini-green-269'},
  {name: 'Lasagna', publicId: 'lasagna-red-125'},
  {name: 'Hamburger', publicId: 'hamburger-brown-896'},
  {name: 'Vanilla Pudding', publicId: 'vanilla-white-225'},
  {name: 'Apple Pie', publicId: 'apple-red-134'},
  {name: 'Kale Salad', publicId: 'kale-green-114'},
  {name: 'Udon Noodles', publicId: 'udon-white-214'},
  {name: 'Raspberry Tart', publicId: 'raspberry-red-181'},
  {name: 'Nachos', publicId: 'nachos-orange-147'},
  {name: 'Ice Cream Sundae', publicId: 'icecream-pink-912'},
  {name: 'Quiche Lorraine', publicId: 'quiche-yellow-170'},
  {name: 'Tacos', publicId: 'tacos-yellow-203'},
  {name: 'Eggplant Parmesan', publicId: 'eggplant-purple-538'},
  {name: 'Yorkshire Pudding', publicId: 'yorkshire-brown-258'},
  {name: 'Chocolate Cake', publicId: 'chocolate-brown-396'},
  {name: 'Waffles', publicId: 'waffles-golden-236'},
  {name: 'Donut Holes', publicId: 'donut-yellow-412'},
  {name: 'Xigua (Watermelon)', publicId: 'xigua-red-247'},
  {name: 'French Fries', publicId: 'frenchfries-golden-674'},
  {name: 'Garlic Bread', publicId: 'garlic-white-785'},
  {name: 'Macaroni and Cheese', publicId: 'macaroni-yellow-136'},
  {name: 'Jalapeno Poppers', publicId: 'jalapeno-green-103'},
  {name: 'Blueberry Muffins', publicId: 'blueberry-blue-265'},
  {name: 'Pizza', publicId: 'pizza-red-169'},
];

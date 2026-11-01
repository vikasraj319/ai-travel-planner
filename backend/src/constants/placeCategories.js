/**
 * Category definitions for nearby place discovery.
 *
 * Each category maps to:
 *  - `osm`: Overpass tag filters, e.g. ['amenity=restaurant', 'amenity=cafe'].
 *  - `googleTypes`: Google Places (New) includedTypes.
 *  - `label`: human-readable label for the UI.
 *
 * Only categories supported by both providers' schemas are defined here. OSM
 * carries no customer ratings, so rating fields are simply absent for OSM
 * results; Google results include them when the API key is configured.
 */
const PLACE_CATEGORIES = {
  stay: {
    label: 'Stay',
    osm: [
      'tourism=hotel',
      'tourism=resort',
      'tourism=hostel',
      'tourism=guest_house',
      'tourism=apartment',
      'tourism=chalet',
      'tourism=motel'
    ],
    googleTypes: ['hotel', 'resort_hotel', 'lodging', 'motel']
  },
  eat: {
    label: 'Eat',
    osm: [
      'amenity=restaurant',
      'amenity=cafe',
      'amenity=fast_food',
      'amenity=food_court',
      'amenity=ice_cream'
    ],
    googleTypes: ['restaurant', 'cafe', 'meal_takeaway', 'food_court']
  },
  facilities: {
    label: 'Facilities',
    osm: [
      'amenity=hospital',
      'amenity=clinic',
      'amenity=pharmacy',
      'amenity=atm',
      'amenity=bank',
      'amenity=police',
      'amenity=fuel',
      'amenity=charging_station',
      'amenity=parking',
      'amenity=toilets',
      'amenity=post_office',
      'amenity=bus_station',
      'railway=station',
      'amenity=taxi',
      'information=tourist'
    ],
    googleTypes: [
      'hospital',
      'pharmacy',
      'atm',
      'bank',
      'police',
      'gas_station',
      'electric_vehicle_charging_station',
      'parking',
      'bus_station',
      'train_station',
      'tourist_information_center'
    ]
  },
  explore: {
    label: 'Explore',
    osm: [
      'tourism=attraction',
      'tourism=museum',
      'tourism=viewpoint',
      'tourism=artwork',
      'tourism=gallery',
      'leisure=park',
      'leisure=garden',
      'historic=monument',
      'historic=castle',
      'shop=mall',
      'shop=department_store'
    ],
    googleTypes: [
      'tourist_attraction',
      'museum',
      'park',
      'shopping_mall',
      'art_gallery',
      'historical_landmark'
    ]
  }
};

const DEFAULT_CATEGORY = 'eat';

function isValidCategory(category) {
  return Object.prototype.hasOwnProperty.call(PLACE_CATEGORIES, category);
}

function getCategory(category) {
  return PLACE_CATEGORIES[category] || PLACE_CATEGORIES[DEFAULT_CATEGORY];
}

module.exports = {
  PLACE_CATEGORIES,
  DEFAULT_CATEGORY,
  isValidCategory,
  getCategory
};

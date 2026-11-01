/**
 * A small gazetteer for pinning Sikh and Punjab news on a map: Punjab's
 * districts and historic towns, the Takhts, Sikh sites in Pakistan, and the
 * main diaspora cities. Coordinates are city centres, to about 0.01°.
 */

export type PlaceRegion = "Punjab" | "India" | "Pakistan" | "Canada" | "United Kingdom" | "United States" | "Australia" | "New Zealand" | "Europe" | "Asia" | "Africa" | "Middle East";

export interface Place {
  name: string;
  region: PlaceRegion;
  lat: number;
  lng: number;
  /** 3 = city or town, 2 = state or province, 1 = country. More specific places win ties. */
  level: 1 | 2 | 3;
  /** Spellings to look for, in English and Gurmukhi. */
  match: string[];
}

const P = (name: string, region: PlaceRegion, lat: number, lng: number, level: 1 | 2 | 3, match: string[] = []): Place => ({
  name,
  region,
  lat,
  lng,
  level,
  match: [name, ...match],
});

export const PLACES: Place[] = [
  // Punjab: districts, cities and historic towns
  P("Amritsar", "Punjab", 31.634, 74.872, 3, ["Golden Temple", "Harmandir Sahib", "Darbar Sahib", "Akal Takht", "SGPC", "ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ", "ਅੰਮ੍ਰਿਤਸਰ", "ਦਰਬਾਰ ਸਾਹਿਬ", "ਅਕਾਲ ਤਖ਼ਤ", "ਅਕਾਲ ਤਖਤ"]),
  P("Ludhiana", "Punjab", 30.901, 75.857, 3, ["ਲੁਧਿਆਣਾ", "ਲੁਧਿਆਣੇ"]),
  P("Jalandhar", "Punjab", 31.326, 75.576, 3, ["Jullundur", "ਜਲੰਧਰ"]),
  P("Patiala", "Punjab", 30.34, 76.386, 3, ["ਪਟਿਆਲਾ"]),
  P("Bathinda", "Punjab", 30.211, 74.945, 3, ["Bhatinda", "ਬਠਿੰਡਾ"]),
  P("Mohali", "Punjab", 30.704, 76.717, 3, ["SAS Nagar", "ਮੋਹਾਲੀ"]),
  P("Chandigarh", "Punjab", 30.733, 76.779, 3, ["ਚੰਡੀਗੜ੍ਹ"]),
  P("Hoshiarpur", "Punjab", 31.532, 75.912, 3, ["ਹੁਸ਼ਿਆਰਪੁਰ"]),
  P("Gurdaspur", "Punjab", 32.041, 75.405, 3, ["ਗੁਰਦਾਸਪੁਰ"]),
  P("Pathankot", "Punjab", 32.274, 75.652, 3, ["ਪਠਾਨਕੋਟ"]),
  P("Ferozepur", "Punjab", 30.925, 74.613, 3, ["Firozpur", "ਫਿਰੋਜ਼ਪੁਰ"]),
  P("Moga", "Punjab", 30.817, 75.174, 3, ["ਮੋਗਾ"]),
  P("Sangrur", "Punjab", 30.245, 75.844, 3, ["ਸੰਗਰੂਰ"]),
  P("Faridkot", "Punjab", 30.676, 74.756, 3, ["ਫਰੀਦਕੋਟ"]),
  P("Sri Muktsar Sahib", "Punjab", 30.474, 74.516, 3, ["Muktsar", "ਮੁਕਤਸਰ"]),
  P("Kapurthala", "Punjab", 31.38, 75.384, 3, ["ਕਪੂਰਥਲਾ"]),
  P("Tarn Taran", "Punjab", 31.451, 74.928, 3, ["Taran Taran", "ਤਰਨ ਤਾਰਨ"]),
  P("Fazilka", "Punjab", 30.403, 74.028, 3, ["ਫਾਜ਼ਿਲਕਾ"]),
  P("Barnala", "Punjab", 30.378, 75.546, 3, ["ਬਰਨਾਲਾ"]),
  P("Mansa", "Punjab", 29.998, 75.393, 3, ["ਮਾਨਸਾ"]),
  P("Rupnagar", "Punjab", 30.966, 76.533, 3, ["Ropar", "ਰੋਪੜ"]),
  P("Nawanshahr", "Punjab", 31.125, 76.116, 3, ["Shaheed Bhagat Singh Nagar"]),
  P("Fatehgarh Sahib", "Punjab", 30.649, 76.393, 3, ["Sirhind", "ਫ਼ਤਹਿਗੜ੍ਹ ਸਾਹਿਬ", "ਸਰਹਿੰਦ"]),
  P("Anandpur Sahib", "Punjab", 31.239, 76.502, 3, ["Takht Sri Kesgarh Sahib", "Kesgarh Sahib", "ਅਨੰਦਪੁਰ ਸਾਹਿਬ"]),
  P("Talwandi Sabo", "Punjab", 29.987, 75.083, 3, ["Damdama Sahib", "ਤਲਵੰਡੀ ਸਾਬੋ", "ਦਮਦਮਾ ਸਾਹਿਬ"]),
  P("Abohar", "Punjab", 30.144, 74.199, 3, ["ਅਬੋਹਰ"]),
  P("Khanna", "Punjab", 30.705, 76.222, 3),
  P("Rajpura", "Punjab", 30.484, 76.594, 3),
  P("Malerkotla", "Punjab", 30.531, 75.879, 3, ["ਮਾਲੇਰਕੋਟਲਾ"]),
  P("Batala", "Punjab", 31.819, 75.203, 3, ["ਬਟਾਲਾ"]),
  P("Phagwara", "Punjab", 31.224, 75.77, 3, ["ਫਗਵਾੜਾ"]),
  P("Zirakpur", "Punjab", 30.643, 76.817, 3),
  P("Punjab", "Punjab", 30.9, 75.4, 2, ["ਪੰਜਾਬ"]),

  // Elsewhere in India
  P("Delhi", "India", 28.614, 77.209, 3, ["New Delhi", "ਦਿੱਲੀ"]),
  P("Hazur Sahib", "India", 19.153, 77.305, 3, ["Nanded", "Takht Sachkhand", "ਹਜ਼ੂਰ ਸਾਹਿਬ"]),
  P("Patna Sahib", "India", 25.594, 85.137, 3, ["Patna", "ਪਟਨਾ"]),
  P("Mumbai", "India", 19.076, 72.878, 3),
  P("Sri Ganganagar", "India", 29.904, 73.877, 3, ["Ganganagar"]),
  P("Jammu", "India", 32.727, 74.857, 3, ["ਜੰਮੂ"]),
  P("Haryana", "India", 29.06, 76.09, 2, ["ਹਰਿਆਣਾ"]),
  P("Himachal Pradesh", "India", 31.1, 77.17, 2, ["Himachal"]),
  P("Uttarakhand", "India", 30.07, 79.02, 2),
  P("Rajasthan", "India", 27.02, 74.22, 2),

  // Pakistan
  P("Nankana Sahib", "Pakistan", 31.45, 73.706, 3, ["ਨਨਕਾਣਾ ਸਾਹਿਬ"]),
  P("Kartarpur Sahib", "Pakistan", 32.084, 75.016, 3, ["Kartarpur Corridor", "Kartarpur corridor", "ਕਰਤਾਰਪੁਰ"]),
  P("Panja Sahib", "Pakistan", 33.818, 72.689, 3, ["Hasan Abdal", "ਪੰਜਾ ਸਾਹਿਬ"]),
  P("Lahore", "Pakistan", 31.52, 74.359, 3, ["ਲਾਹੌਰ"]),
  P("Peshawar", "Pakistan", 34.015, 71.524, 3),
  P("Pakistan", "Pakistan", 30.375, 69.345, 1, ["ਪਾਕਿਸਤਾਨ"]),

  // Canada
  P("Surrey", "Canada", 49.191, -122.849, 3, ["Surrey, B.C.", "Surrey, BC"]),
  P("Brampton", "Canada", 43.731, -79.762, 3, ["ਬਰੈਂਪਟਨ"]),
  P("Toronto", "Canada", 43.653, -79.383, 3, ["ਟੋਰਾਂਟੋ"]),
  P("Vancouver", "Canada", 49.283, -123.121, 3),
  P("Ottawa", "Canada", 45.421, -75.697, 3),
  P("Winnipeg", "Canada", 49.895, -97.138, 3),
  P("Calgary", "Canada", 51.045, -114.072, 3),
  P("Edmonton", "Canada", 53.546, -113.494, 3),
  P("Montreal", "Canada", 45.502, -73.567, 3),
  P("Abbotsford", "Canada", 49.05, -122.329, 3),
  P("British Columbia", "Canada", 50.5, -122.5, 2, ["B.C."]),
  P("Ontario", "Canada", 44.5, -79.5, 2),
  P("Alberta", "Canada", 52.5, -114.5, 2),
  P("Canada", "Canada", 50.0, -96.0, 1, ["Canadian", "ਕੈਨੇਡਾ"]),

  // United Kingdom
  P("Southall", "United Kingdom", 51.511, -0.376, 3),
  P("London", "United Kingdom", 51.507, -0.128, 3, ["ਲੰਡਨ"]),
  P("Birmingham", "United Kingdom", 52.486, -1.89, 3),
  P("Smethwick", "United Kingdom", 52.493, -1.968, 3),
  P("Leicester", "United Kingdom", 52.637, -1.14, 3),
  P("Wolverhampton", "United Kingdom", 52.587, -2.129, 3),
  P("Coventry", "United Kingdom", 52.407, -1.508, 3),
  P("Gravesend", "United Kingdom", 51.442, 0.368, 3),
  P("Slough", "United Kingdom", 51.51, -0.595, 3),
  P("Derby", "United Kingdom", 52.912, -1.473, 3),
  P("Leeds", "United Kingdom", 53.801, -1.549, 3),
  P("Manchester", "United Kingdom", 53.481, -2.243, 3),
  P("Glasgow", "United Kingdom", 55.864, -4.252, 3),
  P("United Kingdom", "United Kingdom", 52.6, -1.6, 1, ["UK", "U.K.", "Britain", "British", "England", "ਬ੍ਰਿਟੇਨ", "ਯੂਕੇ"]),

  // United States
  P("Yuba City", "United States", 39.14, -121.617, 3),
  P("Fresno", "United States", 36.737, -119.787, 3),
  P("Sacramento", "United States", 38.582, -121.494, 3),
  P("San Francisco", "United States", 37.775, -122.419, 3, ["Bay Area"]),
  P("Los Angeles", "United States", 34.052, -118.244, 3),
  P("New York", "United States", 40.713, -74.006, 3, ["Queens", "Richmond Hill"]),
  P("New Jersey", "United States", 40.06, -74.41, 2),
  P("Indianapolis", "United States", 39.768, -86.158, 3),
  P("Seattle", "United States", 47.606, -122.332, 3),
  P("Chicago", "United States", 41.878, -87.63, 3),
  P("Houston", "United States", 29.76, -95.37, 3),
  P("Washington, D.C.", "United States", 38.907, -77.037, 3, ["Washington DC", "Capitol Hill", "White House"]),
  P("Elk Grove", "United States", 38.409, -121.372, 3),
  P("Vallejo", "United States", 38.104, -122.257, 3),
  P("Tracy", "United States", 37.74, -121.425, 3),
  P("Stockton", "United States", 37.958, -121.291, 3),
  P("Manteca", "United States", 37.797, -121.216, 3),
  P("Lodi", "United States", 38.13, -121.272, 3),
  P("Turlock", "United States", 37.495, -120.847, 3),
  P("Modesto", "United States", 37.639, -120.997, 3),
  P("Selma", "United States", 36.571, -119.612, 3),
  P("Bakersfield", "United States", 35.373, -119.019, 3),
  P("Fremont", "United States", 37.548, -121.989, 3),
  P("San Jose", "United States", 37.338, -121.886, 3),
  P("Hayward", "United States", 37.669, -122.081, 3),
  P("Cerritos", "United States", 33.858, -118.065, 3),
  P("Riverside", "United States", 33.953, -117.396, 3),
  P("Kent, Washington", "United States", 47.38, -122.235, 3, ["Kent, Wash", "Kent, WA"]),
  P("Renton", "United States", 47.483, -122.217, 3),
  P("Oak Creek", "United States", 42.886, -87.863, 3),
  P("Milwaukee", "United States", 43.039, -87.906, 3),
  P("Detroit", "United States", 42.331, -83.046, 3),
  P("Cleveland", "United States", 41.499, -81.694, 3),
  P("Columbus", "United States", 39.961, -82.999, 3),
  P("Philadelphia", "United States", 39.953, -75.165, 3),
  P("Boston", "United States", 42.36, -71.059, 3),
  P("Long Island", "United States", 40.79, -73.135, 3, ["Hicksville", "Cedarhurst"]),
  P("Carteret", "United States", 40.577, -74.228, 3),
  P("Hoboken", "United States", 40.744, -74.032, 3),
  P("Germantown", "United States", 39.173, -77.272, 3),
  P("Fairfax", "United States", 38.846, -77.306, 3),
  P("Atlanta", "United States", 33.749, -84.388, 3),
  P("Dallas", "United States", 32.777, -96.797, 3),
  P("Phoenix", "United States", 33.448, -112.074, 3),
  P("Las Vegas", "United States", 36.17, -115.14, 3),
  P("Denver", "United States", 39.739, -104.99, 3),
  P("Texas", "United States", 31.0, -99.0, 2),
  P("Indiana", "United States", 39.9, -86.3, 2),
  P("Ohio", "United States", 40.4, -82.8, 2),
  P("Michigan", "United States", 43.3, -84.5, 2),
  P("Wisconsin", "United States", 44.5, -89.5, 2),
  P("Virginia", "United States", 37.5, -78.7, 2),
  P("Maryland", "United States", 39.0, -76.7, 2),
  P("California", "United States", 36.78, -119.42, 2),
  P("United States", "United States", 39.8, -98.6, 1, ["U.S.", "US", "USA", "America", "American", "ਅਮਰੀਕਾ"]),

  // Australia and New Zealand
  P("Melbourne", "Australia", -37.814, 144.963, 3),
  P("Sydney", "Australia", -33.869, 151.209, 3),
  P("Brisbane", "Australia", -27.47, 153.026, 3),
  P("Perth", "Australia", -31.953, 115.857, 3),
  P("Australia", "Australia", -25.27, 133.78, 1, ["Australian", "ਆਸਟ੍ਰੇਲੀਆ"]),
  P("Auckland", "New Zealand", -36.848, 174.763, 3),
  P("New Zealand", "New Zealand", -40.9, 174.89, 1, ["ਨਿਊਜ਼ੀਲੈਂਡ"]),

  // Europe, Asia, Africa, Middle East
  P("Sint-Truiden", "Europe", 50.816, 5.186, 3),
  P("Belgium", "Europe", 50.5, 4.47, 1, ["Belgian"]),
  P("Italy", "Europe", 41.87, 12.57, 1, ["Italian", "ਇਟਲੀ"]),
  P("Germany", "Europe", 51.17, 10.45, 1, ["German"]),
  P("France", "Europe", 46.2, 2.2, 1, ["French"]),
  P("Netherlands", "Europe", 52.13, 5.29, 1, ["Dutch"]),
  P("Kabul", "Asia", 34.555, 69.207, 3),
  P("Afghanistan", "Asia", 33.94, 67.71, 1, ["Afghan"]),
  P("Malaysia", "Asia", 4.21, 101.97, 1, ["Kuala Lumpur"]),
  P("Singapore", "Asia", 1.352, 103.82, 1),
  P("Nairobi", "Africa", -1.292, 36.822, 3),
  P("Kenya", "Africa", -0.02, 37.9, 1),
  P("Dubai", "Middle East", 25.205, 55.271, 3, ["UAE", "United Arab Emirates"]),
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matchers built once: English names as whole words, case-sensitive for short abbreviations (US, UK). */
const MATCHERS = PLACES.map((p) => ({
  place: p,
  res: p.match.map((m) => {
    if (/[਀-੿]/.test(m)) return new RegExp(escapeRe(m));
    const caseSensitive = m.length <= 4 && m === m.toUpperCase();
    return new RegExp(`(^|[^A-Za-z])${escapeRe(m)}(?![A-Za-z])`, caseSensitive ? "" : "i");
  }),
}));

/**
 * The place a story is about. Places named in the headline beat places only in
 * the snippet; among those, the most specific wins (a town over its country),
 * then the one mentioned first.
 */
export function placeFor(title: string, snippet: string): Place | null {
  return bestIn(title) ?? bestIn(snippet);
}

function bestIn(text: string): Place | null {
  let best: { place: Place; index: number } | null = null;
  for (const { place, res } of MATCHERS) {
    for (const re of res) {
      const m = re.exec(text);
      if (!m) continue;
      const index = m.index + (m[1]?.length ?? 0);
      if (!best || place.level > best.place.level || (place.level === best.place.level && index < best.index)) best = { place, index };
    }
  }
  return best?.place ?? null;
}

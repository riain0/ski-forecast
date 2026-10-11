import type { Destination } from './types';

/**
 * Ikon Pass destinations for the 2026/27 season (ikonpass.com/en/destinations, checked Oct 2026).
 * Multi-mountain pass entries (Aspen Snowmass, SkiBig3, Killington-Pico, Valle d'Aosta, NZ) are split into
 * one forecast point per mountain, linked by `group`. Elevations are lift-served base/summit in metres.
 */
export const PASS_SEASON = '2026/27';

// prettier-ignore
export const DESTINATIONS: readonly Destination[] = [
  // Colorado
  { id: 'snowmass', name: 'Snowmass', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.2084, lon: -106.949, base: 2473, summit: 3813, url: 'https://www.aspensnowmass.com' },
  { id: 'aspen-mountain', name: 'Aspen Mountain', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.1866, lon: -106.8182, base: 2422, summit: 3418, url: 'https://www.aspensnowmass.com' },
  { id: 'aspen-highlands', name: 'Aspen Highlands', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.182, lon: -106.8556, base: 2451, summit: 3559, url: 'https://www.aspensnowmass.com' },
  { id: 'buttermilk', name: 'Buttermilk', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.2056, lon: -106.8608, base: 2399, summit: 3018, url: 'https://www.aspensnowmass.com' },
  { id: 'steamboat', name: 'Steamboat', region: 'Colorado', country: 'US', admin: 'CO', lat: 40.4572, lon: -106.8045, base: 2103, summit: 3221, url: 'https://www.steamboat.com' },
  { id: 'winter-park', name: 'Winter Park', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.8868, lon: -105.7625, base: 2743, summit: 3676, url: 'https://www.winterparkresort.com' },
  { id: 'copper-mountain', name: 'Copper Mountain', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.5022, lon: -106.1511, base: 2926, summit: 3753, url: 'https://www.coppercolorado.com' },
  { id: 'arapahoe-basin', name: 'Arapahoe Basin', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.6425, lon: -105.8719, base: 3286, summit: 3978, url: 'https://www.arapahoebasin.com' },
  { id: 'eldora', name: 'Eldora', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.9372, lon: -105.5827, base: 2805, summit: 3231, url: 'https://www.eldora.com' },

  // Utah
  { id: 'alta', name: 'Alta', region: 'Utah', country: 'US', admin: 'UT', lat: 40.5884, lon: -111.6386, base: 2600, summit: 3216, url: 'https://www.alta.com' },
  { id: 'snowbird', name: 'Snowbird', region: 'Utah', country: 'US', admin: 'UT', lat: 40.583, lon: -111.6508, base: 2365, summit: 3353, url: 'https://www.snowbird.com' },
  { id: 'brighton', name: 'Brighton', region: 'Utah', country: 'US', admin: 'UT', lat: 40.598, lon: -111.5832, base: 2670, summit: 3200, url: 'https://www.brightonresort.com' },
  { id: 'solitude', name: 'Solitude', region: 'Utah', country: 'US', admin: 'UT', lat: 40.6199, lon: -111.5919, base: 2438, summit: 3200, url: 'https://www.solitudemountain.com' },
  { id: 'deer-valley', name: 'Deer Valley', region: 'Utah', country: 'US', admin: 'UT', lat: 40.6374, lon: -111.4783, base: 2003, summit: 2917, url: 'https://www.deervalley.com' },
  { id: 'snowbasin', name: 'Snowbasin', region: 'Utah', country: 'US', admin: 'UT', lat: 41.216, lon: -111.8569, base: 1950, summit: 2850, url: 'https://www.snowbasin.com' },

  // Northern Rockies
  { id: 'jackson-hole', name: 'Jackson Hole', region: 'Northern Rockies', country: 'US', admin: 'WY', lat: 43.5875, lon: -110.8279, base: 1924, summit: 3185, url: 'https://www.jacksonhole.com' },
  { id: 'big-sky', name: 'Big Sky', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 45.2857, lon: -111.4012, base: 2072, summit: 3403, url: 'https://bigskyresort.com' },
  { id: 'sun-valley', name: 'Sun Valley', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 43.66, lon: -114.405, base: 1752, summit: 2789, url: 'https://www.sunvalley.com' },
  { id: 'schweitzer', name: 'Schweitzer', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 48.3678, lon: -116.6227, base: 1219, summit: 1950, url: 'https://www.schweitzer.com' },

  // California
  { id: 'mammoth', name: 'Mammoth Mountain', region: 'California', country: 'US', admin: 'CA', lat: 37.6308, lon: -119.0326, base: 2424, summit: 3369, url: 'https://www.mammothmountain.com' },
  { id: 'june-mountain', name: 'June Mountain', region: 'California', country: 'US', admin: 'CA', lat: 37.7678, lon: -119.0904, base: 2294, summit: 3101, url: 'https://www.junemountain.com' },
  { id: 'palisades-tahoe', name: 'Palisades Tahoe', region: 'California', country: 'US', admin: 'CA', lat: 39.197, lon: -120.2357, base: 1890, summit: 2750, url: 'https://www.palisadestahoe.com' },
  { id: 'sierra-at-tahoe', name: 'Sierra-at-Tahoe', region: 'California', country: 'US', admin: 'CA', lat: 38.7996, lon: -120.0806, base: 2023, summit: 2700, url: 'https://www.sierraattahoe.com' },
  { id: 'big-bear', name: 'Big Bear Mountain Resort', region: 'California', country: 'US', admin: 'CA', lat: 34.2367, lon: -116.8899, base: 2134, summit: 2685, url: 'https://www.bigbearmountainresort.com' },
  { id: 'snow-valley', name: 'Snow Valley', region: 'California', country: 'US', admin: 'CA', lat: 34.2247, lon: -117.0365, base: 2042, summit: 2390, url: 'https://www.snow-valley.com' },

  // Pacific Northwest
  { id: 'crystal-mountain', name: 'Crystal Mountain', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 46.9282, lon: -121.5045, base: 1341, summit: 2135, url: 'https://www.crystalmountainresort.com' },
  { id: 'snoqualmie', name: 'The Summit at Snoqualmie', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 47.4245, lon: -121.4138, base: 916, summit: 1650, url: 'https://summitatsnoqualmie.com' },
  { id: 'mt-bachelor', name: 'Mt. Bachelor', region: 'Pacific Northwest', country: 'US', admin: 'OR', lat: 43.9792, lon: -121.6886, base: 1920, summit: 2763, url: 'https://www.mtbachelor.com' },

  // Southwest
  { id: 'taos', name: 'Taos Ski Valley', region: 'Southwest', country: 'US', admin: 'NM', lat: 36.596, lon: -105.4545, base: 2804, summit: 3804, url: 'https://www.skitaos.com' },

  // Alaska
  { id: 'alyeska', name: 'Alyeska', region: 'Alaska', country: 'US', admin: 'AK', lat: 60.9705, lon: -149.0981, base: 76, summit: 838, url: 'https://alyeskaresort.com' },

  // Northeast
  { id: 'stratton', name: 'Stratton', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.1134, lon: -72.908, base: 579, summit: 1181, url: 'https://www.stratton.com' },
  { id: 'sugarbush', name: 'Sugarbush', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.1359, lon: -72.8944, base: 451, summit: 1244, url: 'https://www.sugarbush.com' },
  { id: 'killington', name: 'Killington', group: 'Killington-Pico', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.6045, lon: -72.8201, base: 610, summit: 1293, url: 'https://www.killington.com' },
  { id: 'pico', name: 'Pico', group: 'Killington-Pico', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.6619, lon: -72.8434, base: 610, summit: 1209, url: 'https://www.picomountain.com' },
  { id: 'sugarloaf', name: 'Sugarloaf', region: 'Northeast', country: 'US', admin: 'ME', lat: 45.0314, lon: -70.3131, base: 427, summit: 1291, url: 'https://www.sugarloaf.com' },
  { id: 'sunday-river', name: 'Sunday River', region: 'Northeast', country: 'US', admin: 'ME', lat: 44.4734, lon: -70.8564, base: 244, summit: 950, url: 'https://www.sundayriver.com' },
  { id: 'loon', name: 'Loon Mountain', region: 'Northeast', country: 'US', admin: 'NH', lat: 44.0364, lon: -71.6214, base: 290, summit: 930, url: 'https://www.loonmtn.com' },

  // Mid-Atlantic
  { id: 'snowshoe', name: 'Snowshoe', region: 'Mid-Atlantic', country: 'US', admin: 'WV', lat: 38.4089, lon: -79.9939, base: 1012, summit: 1484, url: 'https://www.snowshoemtn.com' },
  { id: 'blue-mountain-pa', name: 'Blue Mountain', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 40.8106, lon: -75.5137, base: 140, summit: 476, url: 'https://www.skibluemt.com' },
  { id: 'camelback', name: 'Camelback', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 41.0516, lon: -75.3557, base: 366, summit: 650, url: 'https://www.camelbackresort.com' },

  // Midwest
  { id: 'boyne-mountain', name: 'Boyne Mountain', region: 'Midwest', country: 'US', admin: 'MI', lat: 45.1638, lon: -84.9314, base: 197, summit: 372, url: 'https://www.boynemountain.com' },
  { id: 'the-highlands', name: 'The Highlands', region: 'Midwest', country: 'US', admin: 'MI', lat: 45.4703, lon: -84.9206, base: 220, summit: 400, url: 'https://www.highlandsharborsprings.com' },
  { id: 'snowriver', name: 'Snowriver', region: 'Midwest', country: 'US', admin: 'MI', lat: 46.4813, lon: -89.9677, base: 410, summit: 610, url: 'https://www.snowriver.com' },
  { id: 'lutsen', name: 'Lutsen Mountains', region: 'Midwest', country: 'US', admin: 'MN', lat: 47.6633, lon: -90.7175, base: 240, summit: 572, url: 'https://www.lutsen.com' },
  { id: 'granite-peak', name: 'Granite Peak', region: 'Midwest', country: 'US', admin: 'WI', lat: 44.9255, lon: -89.6896, base: 380, summit: 580, url: 'https://www.skigranitepeak.com' },

  // Western Canada
  { id: 'revelstoke', name: 'Revelstoke', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.9585, lon: -118.1636, base: 512, summit: 2225, url: 'https://www.revelstokemountainresort.com' },
  { id: 'red-mountain', name: 'RED Mountain', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 49.1047, lon: -117.8461, base: 1185, summit: 2075, url: 'https://www.redresort.com' },
  { id: 'panorama', name: 'Panorama', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.46, lon: -116.2383, base: 1150, summit: 2365, url: 'https://www.panoramaresort.com' },
  { id: 'sun-peaks', name: 'Sun Peaks', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.8836, lon: -119.8822, base: 1255, summit: 2080, url: 'https://www.sunpeaksresort.com' },
  { id: 'silverstar', name: 'SilverStar', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.3594, lon: -119.0611, base: 1155, summit: 1915, url: 'https://www.skisilverstar.com' },
  { id: 'cypress', name: 'Cypress Mountain', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 49.3961, lon: -123.2042, base: 910, summit: 1440, url: 'https://cypressmountain.com' },
  { id: 'lake-louise', name: 'Lake Louise', group: 'SkiBig3', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 51.4419, lon: -116.1622, base: 1646, summit: 2637, url: 'https://www.skilouise.com' },
  { id: 'banff-sunshine', name: 'Banff Sunshine', group: 'SkiBig3', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 51.115, lon: -115.7631, base: 1658, summit: 2730, url: 'https://www.skibanff.com' },
  { id: 'norquay', name: 'Mt. Norquay', group: 'SkiBig3', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 51.2034, lon: -115.6006, base: 1636, summit: 2133, url: 'https://banffnorquay.com' },

  // Eastern Canada
  { id: 'tremblant', name: 'Tremblant', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 46.2097, lon: -74.585, base: 265, summit: 875, url: 'https://www.tremblant.ca' },
  { id: 'le-massif', name: 'Le Massif de Charlevoix', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 47.2838, lon: -70.5739, base: 36, summit: 806, url: 'https://www.lemassif.com' },
  { id: 'blue-mountain-on', name: 'Blue Mountain', region: 'Eastern Canada', country: 'CA', admin: 'ON', lat: 44.5014, lon: -80.3164, base: 225, summit: 445, url: 'https://www.bluemountain.ca' },

  // Alps
  { id: 'zermatt', name: 'Zermatt Matterhorn', region: 'Alps', country: 'CH', lat: 46.0207, lon: 7.7491, base: 1620, summit: 3883, url: 'https://www.matterhornparadise.ch' },
  { id: 'st-moritz', name: 'St. Moritz', region: 'Alps', country: 'CH', lat: 46.498, lon: 9.818, base: 1822, summit: 3057, url: 'https://www.mountains.ch' },
  { id: 'chamonix', name: 'Chamonix Mont-Blanc', region: 'Alps', country: 'FR', lat: 45.9237, lon: 6.8694, base: 1035, summit: 3300, url: 'https://www.montblancnaturalresort.com' },
  { id: 'megeve', name: 'Megève', region: 'Alps', country: 'FR', lat: 45.8567, lon: 6.6175, base: 1113, summit: 2350, url: 'https://www.megeve.com' },
  { id: 'courmayeur', name: 'Courmayeur', group: "Valle d'Aosta", region: 'Alps', country: 'IT', lat: 45.792, lon: 6.969, base: 1224, summit: 2755 },
  { id: 'cervinia', name: 'Cervinia', group: "Valle d'Aosta", region: 'Alps', country: 'IT', lat: 45.9336, lon: 7.6297, base: 2050, summit: 3480 },
  { id: 'kitzbuehel', name: 'Kitzbühel', region: 'Alps', country: 'AT', lat: 47.4469, lon: 12.392, base: 800, summit: 2000, url: 'https://www.kitzski.at' },
  { id: 'ischgl', name: 'Ischgl', region: 'Alps', country: 'AT', lat: 47.0127, lon: 10.2925, base: 1377, summit: 2872, url: 'https://www.ischgl.com' },
  { id: 'dolomiti-superski', name: 'Dolomiti Superski', region: 'Alps', country: 'IT', lat: 46.555, lon: 11.76, base: 1563, summit: 2518, url: 'https://www.dolomitisuperski.com' },

  // Pyrenees
  { id: 'grandvalira', name: 'Grandvalira', region: 'Pyrenees', country: 'AD', lat: 42.556, lon: 1.7, base: 1710, summit: 2640, url: 'https://www.grandvalira.com' },

  // Japan
  { id: 'niseko', name: 'Niseko United', region: 'Japan', country: 'JP', admin: 'Hokkaido', lat: 42.8625, lon: 140.6987, base: 260, summit: 1200, url: 'https://www.niseko.ne.jp' },
  { id: 'furano', name: 'Furano', region: 'Japan', country: 'JP', admin: 'Hokkaido', lat: 43.329, lon: 142.356, base: 245, summit: 1074 },
  { id: 'appi', name: 'APPI', region: 'Japan', country: 'JP', admin: 'Iwate', lat: 40.0003, lon: 140.9686, base: 500, summit: 1328, url: 'https://www.appi.co.jp' },
  { id: 'zao-onsen', name: 'Zao Onsen', region: 'Japan', country: 'JP', admin: 'Yamagata', lat: 38.1667, lon: 140.3967, base: 780, summit: 1661 },
  { id: 'nekoma', name: 'NEKOMA Mountain', region: 'Japan', country: 'JP', admin: 'Fukushima', lat: 37.6143, lon: 140.09, base: 780, summit: 1404 },
  { id: 'mt-t', name: 'Mt.T', region: 'Japan', country: 'JP', admin: 'Gunma', lat: 36.829, lon: 138.93, base: 750, summit: 1500, url: 'https://tanigawadake-joch.com/en/mt-t/' },
  { id: 'arai', name: 'Arai', region: 'Japan', country: 'JP', admin: 'Niigata', lat: 37.0245, lon: 138.1762, base: 330, summit: 1280 },
  { id: 'myoko-suginohara', name: 'Myoko Suginohara', region: 'Japan', country: 'JP', admin: 'Niigata', lat: 36.867, lon: 138.156, base: 731, summit: 1855 },
  { id: 'madarao', name: 'Madarao', region: 'Japan', country: 'JP', admin: 'Nagano', lat: 36.8625, lon: 138.2933, base: 870, summit: 1382 },
  { id: 'shiga-kogen', name: 'Shiga Kogen', region: 'Japan', country: 'JP', admin: 'Nagano', lat: 36.702, lon: 138.504, base: 1340, summit: 2307 },

  // Korea & China
  { id: 'yongpyong', name: 'Mona Yongpyong', region: 'Korea & China', country: 'KR', lat: 37.6455, lon: 128.6806, base: 750, summit: 1458, url: 'https://www.yongpyong.co.kr' },
  { id: 'beidahu', name: 'Beidahu', region: 'Korea & China', country: 'CN', admin: 'Jilin', lat: 43.431, lon: 126.556, base: 530, summit: 1408 },
  { id: 'lake-songhua', name: 'Lake Songhua', region: 'Korea & China', country: 'CN', admin: 'Jilin', lat: 43.69, lon: 126.7, base: 400, summit: 935 },
  { id: 'yunding', name: 'Yunding Snow Park', region: 'Korea & China', country: 'CN', admin: 'Hebei', lat: 40.9583, lon: 115.4636, base: 1650, summit: 2100 },

  // Australia & NZ
  { id: 'thredbo', name: 'Thredbo', region: 'Australia & NZ', country: 'AU', admin: 'NSW', lat: -36.505, lon: 148.3068, base: 1365, summit: 2037, url: 'https://www.thredbo.com.au' },
  { id: 'mt-buller', name: 'Mt Buller', region: 'Australia & NZ', country: 'AU', admin: 'VIC', lat: -37.1459, lon: 146.4383, base: 1390, summit: 1805, url: 'https://www.mtbuller.com.au' },
  { id: 'coronet-peak', name: 'Coronet Peak', group: 'NZSki', region: 'Australia & NZ', country: 'NZ', lat: -44.9265, lon: 168.7357, base: 1168, summit: 1649, url: 'https://www.coronetpeak.co.nz' },
  { id: 'the-remarkables', name: 'The Remarkables', group: 'NZSki', region: 'Australia & NZ', country: 'NZ', lat: -45.0546, lon: 168.8143, base: 1610, summit: 1943, url: 'https://www.theremarkables.co.nz' },
  { id: 'mt-hutt', name: 'Mt Hutt', group: 'NZSki', region: 'Australia & NZ', country: 'NZ', lat: -43.4706, lon: 171.529, base: 1585, summit: 2086, url: 'https://www.mthutt.co.nz' },

  // South America
  { id: 'valle-nevado', name: 'Valle Nevado', region: 'South America', country: 'CL', lat: -33.357, lon: -70.249, base: 2860, summit: 3670, url: 'https://www.vallenevado.com' },
];

export const REGIONS = [...new Set(DESTINATIONS.map(d => d.region))];

export const findDestination = (id: string): Destination | undefined => DESTINATIONS.find(d => d.id === id);

export function elevationFor(
  d: Pick<Destination, 'base' | 'summit'>,
  band: 'base' | 'mid' | 'summit',
): number {
  if (band === 'base') return d.base;
  if (band === 'summit') return d.summit;
  return Math.round((d.base + d.summit) / 2);
}

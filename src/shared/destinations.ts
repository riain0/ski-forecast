import type { Destination, Pass } from './types';

/**
 * Ski areas for the 2026/27 season: every Ikon Pass destination (ikonpass.com, checked Oct 2026), the Epic
 * Pass (epicpass.com), Mountain Collective partners, and notable independent US mountains, each tagged with
 * the passes that include it. Multi-mountain pass entries (Aspen Snowmass, SkiBig3, Killington-Pico,
 * Valle d'Aosta, NZ) are split into one forecast point per mountain, linked by `group`. Elevations are
 * lift-served base/summit in metres.
 */
export const PASS_SEASON = '2026/27';

export const PASSES: readonly { id: Pass; name: string }[] = [
  { id: 'ikon', name: 'Ikon' },
  { id: 'epic', name: 'Epic' },
  { id: 'mountain-collective', name: 'Mountain Collective' },
  { id: 'indy', name: 'Indy' },
];

export const passName = (p: Pass): string => PASSES.find(x => x.id === p)?.name ?? p;

/** Not owned by or on either of the two big conglomerate passes. */
export const isIndependent = (d: Pick<Destination, 'passes'>): boolean =>
  !d.passes.includes('ikon') && !d.passes.includes('epic');

// prettier-ignore
export const DESTINATIONS: readonly Destination[] = [
  // Colorado
  { id: 'snowmass', name: 'Snowmass', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.2084, lon: -106.949, base: 2473, summit: 3813, url: 'https://www.aspensnowmass.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'aspen-mountain', name: 'Aspen Mountain', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.1866, lon: -106.8182, base: 2422, summit: 3418, url: 'https://www.aspensnowmass.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'aspen-highlands', name: 'Aspen Highlands', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.182, lon: -106.8556, base: 2451, summit: 3559, url: 'https://www.aspensnowmass.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'buttermilk', name: 'Buttermilk', group: 'Aspen Snowmass', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.2056, lon: -106.8608, base: 2399, summit: 3018, url: 'https://www.aspensnowmass.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'steamboat', name: 'Steamboat', region: 'Colorado', country: 'US', admin: 'CO', lat: 40.4572, lon: -106.8045, base: 2103, summit: 3221, url: 'https://www.steamboat.com', passes: ['ikon'] },
  { id: 'winter-park', name: 'Winter Park', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.8868, lon: -105.7625, base: 2743, summit: 3676, url: 'https://www.winterparkresort.com', passes: ['ikon'] },
  { id: 'copper-mountain', name: 'Copper Mountain', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.5022, lon: -106.1511, base: 2926, summit: 3753, url: 'https://www.coppercolorado.com', passes: ['ikon'] },
  { id: 'arapahoe-basin', name: 'Arapahoe Basin', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.6425, lon: -105.8719, base: 3286, summit: 3978, url: 'https://www.arapahoebasin.com', passes: ['ikon'] },
  { id: 'eldora', name: 'Eldora', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.9372, lon: -105.5827, base: 2805, summit: 3231, url: 'https://www.eldora.com', passes: ['ikon'] },

  // Utah
  { id: 'alta', name: 'Alta', region: 'Utah', country: 'US', admin: 'UT', lat: 40.5884, lon: -111.6386, base: 2600, summit: 3216, url: 'https://www.alta.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'snowbird', name: 'Snowbird', region: 'Utah', country: 'US', admin: 'UT', lat: 40.583, lon: -111.6508, base: 2365, summit: 3353, url: 'https://www.snowbird.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'brighton', name: 'Brighton', region: 'Utah', country: 'US', admin: 'UT', lat: 40.598, lon: -111.5832, base: 2670, summit: 3200, url: 'https://www.brightonresort.com', passes: ['ikon'] },
  { id: 'solitude', name: 'Solitude', region: 'Utah', country: 'US', admin: 'UT', lat: 40.6199, lon: -111.5919, base: 2438, summit: 3200, url: 'https://www.solitudemountain.com', passes: ['ikon'] },
  { id: 'deer-valley', name: 'Deer Valley', region: 'Utah', country: 'US', admin: 'UT', lat: 40.6374, lon: -111.4783, base: 2003, summit: 2917, url: 'https://www.deervalley.com', passes: ['ikon'] },
  { id: 'snowbasin', name: 'Snowbasin', region: 'Utah', country: 'US', admin: 'UT', lat: 41.216, lon: -111.8569, base: 1950, summit: 2850, url: 'https://www.snowbasin.com', passes: ['ikon', 'mountain-collective'] },

  // Northern Rockies
  { id: 'jackson-hole', name: 'Jackson Hole', region: 'Northern Rockies', country: 'US', admin: 'WY', lat: 43.5875, lon: -110.8279, base: 1924, summit: 3185, url: 'https://www.jacksonhole.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'big-sky', name: 'Big Sky', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 45.2857, lon: -111.4012, base: 2072, summit: 3403, url: 'https://bigskyresort.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'sun-valley', name: 'Sun Valley', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 43.66, lon: -114.405, base: 1752, summit: 2789, url: 'https://www.sunvalley.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'schweitzer', name: 'Schweitzer', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 48.3678, lon: -116.6227, base: 1219, summit: 1950, url: 'https://www.schweitzer.com', passes: ['ikon'] },

  // California
  { id: 'mammoth', name: 'Mammoth Mountain', region: 'California', country: 'US', admin: 'CA', lat: 37.6308, lon: -119.0326, base: 2424, summit: 3369, url: 'https://www.mammothmountain.com', passes: ['ikon'] },
  { id: 'june-mountain', name: 'June Mountain', region: 'California', country: 'US', admin: 'CA', lat: 37.7678, lon: -119.0904, base: 2294, summit: 3101, url: 'https://www.junemountain.com', passes: ['ikon'] },
  { id: 'palisades-tahoe', name: 'Palisades Tahoe', region: 'California', country: 'US', admin: 'CA', lat: 39.197, lon: -120.2357, base: 1890, summit: 2750, url: 'https://www.palisadestahoe.com', passes: ['ikon'] },
  { id: 'sierra-at-tahoe', name: 'Sierra-at-Tahoe', region: 'California', country: 'US', admin: 'CA', lat: 38.7996, lon: -120.0806, base: 2023, summit: 2700, url: 'https://www.sierraattahoe.com', passes: ['ikon'] },
  { id: 'big-bear', name: 'Big Bear Mountain Resort', region: 'California', country: 'US', admin: 'CA', lat: 34.2367, lon: -116.8899, base: 2134, summit: 2685, url: 'https://www.bigbearmountainresort.com', passes: ['ikon'] },
  { id: 'snow-valley', name: 'Snow Valley', region: 'California', country: 'US', admin: 'CA', lat: 34.2247, lon: -117.0365, base: 2042, summit: 2390, url: 'https://www.snow-valley.com', passes: ['ikon'] },

  // Pacific Northwest
  { id: 'crystal-mountain', name: 'Crystal Mountain', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 46.9282, lon: -121.5045, base: 1341, summit: 2135, url: 'https://www.crystalmountainresort.com', passes: ['ikon'] },
  { id: 'snoqualmie', name: 'The Summit at Snoqualmie', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 47.4245, lon: -121.4138, base: 916, summit: 1650, url: 'https://summitatsnoqualmie.com', passes: ['ikon'] },
  { id: 'mt-bachelor', name: 'Mt. Bachelor', region: 'Pacific Northwest', country: 'US', admin: 'OR', lat: 43.9792, lon: -121.6886, base: 1920, summit: 2763, url: 'https://www.mtbachelor.com', passes: ['ikon'] },

  // Southwest
  { id: 'taos', name: 'Taos Ski Valley', region: 'Southwest', country: 'US', admin: 'NM', lat: 36.596, lon: -105.4545, base: 2804, summit: 3804, url: 'https://www.skitaos.com', passes: ['ikon', 'mountain-collective'] },

  // Alaska
  { id: 'alyeska', name: 'Alyeska', region: 'Alaska', country: 'US', admin: 'AK', lat: 60.9705, lon: -149.0981, base: 76, summit: 838, url: 'https://alyeskaresort.com', passes: ['ikon'] },

  // Northeast
  { id: 'stratton', name: 'Stratton', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.1134, lon: -72.908, base: 579, summit: 1181, url: 'https://www.stratton.com', passes: ['ikon'] },
  { id: 'sugarbush', name: 'Sugarbush', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.1359, lon: -72.8944, base: 451, summit: 1244, url: 'https://www.sugarbush.com', passes: ['ikon'] },
  { id: 'killington', name: 'Killington', group: 'Killington-Pico', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.6045, lon: -72.8201, base: 610, summit: 1293, url: 'https://www.killington.com', passes: ['ikon'] },
  { id: 'pico', name: 'Pico', group: 'Killington-Pico', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.6619, lon: -72.8434, base: 610, summit: 1209, url: 'https://www.picomountain.com', passes: ['ikon'] },
  { id: 'sugarloaf', name: 'Sugarloaf', region: 'Northeast', country: 'US', admin: 'ME', lat: 45.0314, lon: -70.3131, base: 427, summit: 1291, url: 'https://www.sugarloaf.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'sunday-river', name: 'Sunday River', region: 'Northeast', country: 'US', admin: 'ME', lat: 44.4734, lon: -70.8564, base: 244, summit: 950, url: 'https://www.sundayriver.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'loon', name: 'Loon Mountain', region: 'Northeast', country: 'US', admin: 'NH', lat: 44.0364, lon: -71.6214, base: 290, summit: 930, url: 'https://www.loonmtn.com', passes: ['ikon'] },

  // Mid-Atlantic
  { id: 'snowshoe', name: 'Snowshoe', region: 'Mid-Atlantic', country: 'US', admin: 'WV', lat: 38.4089, lon: -79.9939, base: 1012, summit: 1484, url: 'https://www.snowshoemtn.com', passes: ['ikon'] },
  { id: 'blue-mountain-pa', name: 'Blue Mountain', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 40.8106, lon: -75.5137, base: 140, summit: 476, url: 'https://www.skibluemt.com', passes: ['ikon'] },
  { id: 'camelback', name: 'Camelback', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 41.0516, lon: -75.3557, base: 366, summit: 650, url: 'https://www.camelbackresort.com', passes: ['ikon'] },

  // Midwest
  { id: 'boyne-mountain', name: 'Boyne Mountain', region: 'Midwest', country: 'US', admin: 'MI', lat: 45.1638, lon: -84.9314, base: 197, summit: 372, url: 'https://www.boynemountain.com', passes: ['ikon'] },
  { id: 'the-highlands', name: 'The Highlands', region: 'Midwest', country: 'US', admin: 'MI', lat: 45.4703, lon: -84.9206, base: 220, summit: 400, url: 'https://www.highlandsharborsprings.com', passes: ['ikon'] },
  { id: 'snowriver', name: 'Snowriver', region: 'Midwest', country: 'US', admin: 'MI', lat: 46.4813, lon: -89.9677, base: 410, summit: 610, url: 'https://www.snowriver.com', passes: ['ikon', 'indy'] },
  { id: 'lutsen', name: 'Lutsen Mountains', region: 'Midwest', country: 'US', admin: 'MN', lat: 47.6633, lon: -90.7175, base: 240, summit: 572, url: 'https://www.lutsen.com', passes: ['ikon', 'indy'] },
  { id: 'granite-peak', name: 'Granite Peak', region: 'Midwest', country: 'US', admin: 'WI', lat: 44.9255, lon: -89.6896, base: 380, summit: 580, url: 'https://www.skigranitepeak.com', passes: ['ikon', 'indy'] },

  // Western Canada
  { id: 'revelstoke', name: 'Revelstoke', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.9585, lon: -118.1636, base: 512, summit: 2225, url: 'https://www.revelstokemountainresort.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'red-mountain', name: 'RED Mountain', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 49.1047, lon: -117.8461, base: 1185, summit: 2075, url: 'https://www.redresort.com', passes: ['ikon'] },
  { id: 'panorama', name: 'Panorama', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.46, lon: -116.2383, base: 1150, summit: 2365, url: 'https://www.panoramaresort.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'sun-peaks', name: 'Sun Peaks', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.8836, lon: -119.8822, base: 1255, summit: 2080, url: 'https://www.sunpeaksresort.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'silverstar', name: 'SilverStar', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.3594, lon: -119.0611, base: 1155, summit: 1915, url: 'https://www.skisilverstar.com', passes: ['ikon'] },
  { id: 'cypress', name: 'Cypress Mountain', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 49.3961, lon: -123.2042, base: 910, summit: 1440, url: 'https://cypressmountain.com', passes: ['ikon'] },
  { id: 'lake-louise', name: 'Lake Louise', group: 'SkiBig3', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 51.4419, lon: -116.1622, base: 1646, summit: 2637, url: 'https://www.skilouise.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'banff-sunshine', name: 'Banff Sunshine', group: 'SkiBig3', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 51.115, lon: -115.7631, base: 1658, summit: 2730, url: 'https://www.skibanff.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'norquay', name: 'Mt. Norquay', group: 'SkiBig3', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 51.2034, lon: -115.6006, base: 1636, summit: 2133, url: 'https://banffnorquay.com', passes: ['ikon'] },

  // Eastern Canada
  { id: 'tremblant', name: 'Tremblant', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 46.2097, lon: -74.585, base: 265, summit: 875, url: 'https://www.tremblant.ca', passes: ['ikon'] },
  { id: 'le-massif', name: 'Le Massif de Charlevoix', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 47.2838, lon: -70.5739, base: 36, summit: 806, url: 'https://www.lemassif.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'blue-mountain-on', name: 'Blue Mountain', region: 'Eastern Canada', country: 'CA', admin: 'ON', lat: 44.5014, lon: -80.3164, base: 225, summit: 445, url: 'https://www.bluemountain.ca', passes: ['ikon'] },

  // Alps
  { id: 'zermatt', name: 'Zermatt Matterhorn', region: 'Alps', country: 'CH', lat: 46.0207, lon: 7.7491, base: 1620, summit: 3883, url: 'https://www.matterhornparadise.ch', passes: ['ikon'] },
  { id: 'st-moritz', name: 'St. Moritz', region: 'Alps', country: 'CH', lat: 46.498, lon: 9.818, base: 1822, summit: 3057, url: 'https://www.mountains.ch', passes: ['ikon'] },
  { id: 'chamonix', name: 'Chamonix Mont-Blanc', region: 'Alps', country: 'FR', lat: 45.9237, lon: 6.8694, base: 1035, summit: 3300, url: 'https://www.montblancnaturalresort.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'megeve', name: 'Megève', region: 'Alps', country: 'FR', lat: 45.8567, lon: 6.6175, base: 1113, summit: 2350, url: 'https://www.megeve.com', passes: ['ikon', 'mountain-collective'] },
  { id: 'courmayeur', name: 'Courmayeur', group: "Valle d'Aosta", region: 'Alps', country: 'IT', lat: 45.792, lon: 6.969, base: 1224, summit: 2755, passes: ['ikon'] },
  { id: 'cervinia', name: 'Cervinia', group: "Valle d'Aosta", region: 'Alps', country: 'IT', lat: 45.9336, lon: 7.6297, base: 2050, summit: 3480, passes: ['ikon'] },
  { id: 'kitzbuehel', name: 'Kitzbühel', region: 'Alps', country: 'AT', lat: 47.4469, lon: 12.392, base: 800, summit: 2000, url: 'https://www.kitzski.at', passes: ['ikon'] },
  { id: 'ischgl', name: 'Ischgl', region: 'Alps', country: 'AT', lat: 47.0127, lon: 10.2925, base: 1377, summit: 2872, url: 'https://www.ischgl.com', passes: ['ikon'] },
  { id: 'dolomiti-superski', name: 'Dolomiti Superski', region: 'Alps', country: 'IT', lat: 46.555, lon: 11.76, base: 1563, summit: 2518, url: 'https://www.dolomitisuperski.com', passes: ['ikon'] },

  // Pyrenees
  { id: 'grandvalira', name: 'Grandvalira', region: 'Pyrenees', country: 'AD', lat: 42.556, lon: 1.7, base: 1710, summit: 2640, url: 'https://www.grandvalira.com', passes: ['ikon'] },

  // Japan
  { id: 'niseko', name: 'Niseko United', region: 'Japan', country: 'JP', admin: 'Hokkaido', lat: 42.8625, lon: 140.6987, base: 260, summit: 1200, url: 'https://www.niseko.ne.jp', passes: ['ikon', 'mountain-collective'] },
  { id: 'furano', name: 'Furano', region: 'Japan', country: 'JP', admin: 'Hokkaido', lat: 43.329, lon: 142.356, base: 245, summit: 1074, passes: ['ikon'] },
  { id: 'appi', name: 'APPI', region: 'Japan', country: 'JP', admin: 'Iwate', lat: 40.0003, lon: 140.9686, base: 500, summit: 1328, url: 'https://www.appi.co.jp', passes: ['ikon'] },
  { id: 'zao-onsen', name: 'Zao Onsen', region: 'Japan', country: 'JP', admin: 'Yamagata', lat: 38.1667, lon: 140.3967, base: 780, summit: 1661, passes: ['ikon'] },
  { id: 'nekoma', name: 'NEKOMA Mountain', region: 'Japan', country: 'JP', admin: 'Fukushima', lat: 37.6143, lon: 140.09, base: 780, summit: 1404, passes: ['ikon'] },
  { id: 'mt-t', name: 'Mt.T', region: 'Japan', country: 'JP', admin: 'Gunma', lat: 36.829, lon: 138.93, base: 750, summit: 1500, url: 'https://tanigawadake-joch.com/en/mt-t/', passes: ['ikon'] },
  { id: 'arai', name: 'Arai', region: 'Japan', country: 'JP', admin: 'Niigata', lat: 37.0245, lon: 138.1762, base: 330, summit: 1280, passes: ['ikon'] },
  { id: 'myoko-suginohara', name: 'Myoko Suginohara', region: 'Japan', country: 'JP', admin: 'Niigata', lat: 36.867, lon: 138.156, base: 731, summit: 1855, passes: ['ikon'] },
  { id: 'madarao', name: 'Madarao', region: 'Japan', country: 'JP', admin: 'Nagano', lat: 36.8625, lon: 138.2933, base: 870, summit: 1382, passes: ['ikon'] },
  { id: 'shiga-kogen', name: 'Shiga Kogen', region: 'Japan', country: 'JP', admin: 'Nagano', lat: 36.702, lon: 138.504, base: 1340, summit: 2307, passes: ['ikon'] },

  // Korea & China
  { id: 'yongpyong', name: 'Mona Yongpyong', region: 'Korea & China', country: 'KR', lat: 37.6455, lon: 128.6806, base: 750, summit: 1458, url: 'https://www.yongpyong.co.kr', passes: ['ikon'] },
  { id: 'beidahu', name: 'Beidahu', region: 'Korea & China', country: 'CN', admin: 'Jilin', lat: 43.431, lon: 126.556, base: 530, summit: 1408, passes: ['ikon'] },
  { id: 'lake-songhua', name: 'Lake Songhua', region: 'Korea & China', country: 'CN', admin: 'Jilin', lat: 43.69, lon: 126.7, base: 400, summit: 935, passes: ['ikon'] },
  { id: 'yunding', name: 'Yunding Snow Park', region: 'Korea & China', country: 'CN', admin: 'Hebei', lat: 40.9583, lon: 115.4636, base: 1650, summit: 2100, passes: ['ikon'] },

  // Australia & NZ
  { id: 'thredbo', name: 'Thredbo', region: 'Australia & NZ', country: 'AU', admin: 'NSW', lat: -36.505, lon: 148.3068, base: 1365, summit: 2037, url: 'https://www.thredbo.com.au', passes: ['ikon'] },
  { id: 'mt-buller', name: 'Mt Buller', region: 'Australia & NZ', country: 'AU', admin: 'VIC', lat: -37.1459, lon: 146.4383, base: 1390, summit: 1805, url: 'https://www.mtbuller.com.au', passes: ['ikon', 'mountain-collective'] },
  { id: 'coronet-peak', name: 'Coronet Peak', group: 'NZSki', region: 'Australia & NZ', country: 'NZ', lat: -44.9265, lon: 168.7357, base: 1168, summit: 1649, url: 'https://www.coronetpeak.co.nz', passes: ['ikon', 'mountain-collective'] },
  { id: 'the-remarkables', name: 'The Remarkables', group: 'NZSki', region: 'Australia & NZ', country: 'NZ', lat: -45.0546, lon: 168.8143, base: 1610, summit: 1943, url: 'https://www.theremarkables.co.nz', passes: ['ikon', 'mountain-collective'] },
  { id: 'mt-hutt', name: 'Mt Hutt', group: 'NZSki', region: 'Australia & NZ', country: 'NZ', lat: -43.4706, lon: 171.529, base: 1585, summit: 2086, url: 'https://www.mthutt.co.nz', passes: ['ikon'] },

  // South America
  { id: 'valle-nevado', name: 'Valle Nevado', region: 'South America', country: 'CL', lat: -33.357, lon: -70.249, base: 2860, summit: 3670, url: 'https://www.vallenevado.com', passes: ['ikon', 'mountain-collective'] },

  // ---------------------------------------------------------------------------------------------------
  // Epic Pass 2026/27 (epicpass.com): Vail Resorts mountains and partners. Multi-resort partner networks
  // (Hakuba Valley, Les 3 Vallées, Ski Arlberg…) are one forecast point at their main area.

  // Colorado & Utah
  { id: 'vail', name: 'Vail', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.6061, lon: -106.355, base: 2475, summit: 3527, url: 'https://www.vail.com', passes: ['epic'] },
  { id: 'beaver-creek', name: 'Beaver Creek', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.6042, lon: -106.5165, base: 2255, summit: 3488, url: 'https://www.beavercreek.com', passes: ['epic'] },
  { id: 'breckenridge', name: 'Breckenridge', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.4817, lon: -106.0384, base: 2926, summit: 3914, url: 'https://www.breckenridge.com', passes: ['epic'] },
  { id: 'keystone', name: 'Keystone', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.6045, lon: -105.9545, base: 2829, summit: 3651, url: 'https://www.keystoneresort.com', passes: ['epic'] },
  { id: 'crested-butte', name: 'Crested Butte', region: 'Colorado', country: 'US', admin: 'CO', lat: 38.8986, lon: -106.9653, base: 2775, summit: 3707, url: 'https://www.skicb.com', passes: ['epic'] },
  { id: 'telluride', name: 'Telluride', region: 'Colorado', country: 'US', admin: 'CO', lat: 37.9375, lon: -107.8123, base: 2659, summit: 3831, url: 'https://tellurideskiresort.com', passes: ['epic'] },
  { id: 'park-city', name: 'Park City', region: 'Utah', country: 'US', admin: 'UT', lat: 40.6514, lon: -111.508, base: 2080, summit: 3049, url: 'https://www.parkcitymountain.com', passes: ['epic'] },

  // Tahoe & Pacific Northwest
  { id: 'heavenly', name: 'Heavenly', region: 'California', country: 'US', admin: 'CA', lat: 38.9353, lon: -119.94, base: 1998, summit: 3068, url: 'https://www.skiheavenly.com', passes: ['epic'] },
  { id: 'northstar', name: 'Northstar', region: 'California', country: 'US', admin: 'CA', lat: 39.2746, lon: -120.121, base: 1929, summit: 2624, url: 'https://www.northstarcalifornia.com', passes: ['epic'] },
  { id: 'kirkwood', name: 'Kirkwood', region: 'California', country: 'US', admin: 'CA', lat: 38.6847, lon: -120.0654, base: 2377, summit: 2987, url: 'https://www.kirkwood.com', passes: ['epic'] },
  { id: 'stevens-pass', name: 'Stevens Pass', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 47.7448, lon: -121.089, base: 1241, summit: 1784, url: 'https://www.stevenspass.com', passes: ['epic'] },

  // Northeast
  { id: 'stowe', name: 'Stowe', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.5303, lon: -72.7814, base: 390, summit: 1116, url: 'https://www.stowe.com', passes: ['epic'] },
  { id: 'okemo', name: 'Okemo', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.4017, lon: -72.717, base: 351, summit: 1020, url: 'https://www.okemo.com', passes: ['epic'] },
  { id: 'mount-snow', name: 'Mount Snow', region: 'Northeast', country: 'US', admin: 'VT', lat: 42.9602, lon: -72.9204, base: 579, summit: 1097, url: 'https://www.mountsnow.com', passes: ['epic'] },
  { id: 'hunter', name: 'Hunter Mountain', region: 'Northeast', country: 'US', admin: 'NY', lat: 42.2024, lon: -74.2257, base: 490, summit: 975, url: 'https://www.huntermtn.com', passes: ['epic'] },
  { id: 'attitash', name: 'Attitash', region: 'Northeast', country: 'US', admin: 'NH', lat: 44.0828, lon: -71.2294, base: 183, summit: 716, url: 'https://www.attitash.com', passes: ['epic'] },
  { id: 'wildcat', name: 'Wildcat', region: 'Northeast', country: 'US', admin: 'NH', lat: 44.2643, lon: -71.2392, base: 591, summit: 1248, url: 'https://www.skiwildcat.com', passes: ['epic'] },
  { id: 'mt-sunapee', name: 'Mount Sunapee', region: 'Northeast', country: 'US', admin: 'NH', lat: 43.3319, lon: -72.0805, base: 375, summit: 838, url: 'https://www.mountsunapee.com', passes: ['epic'] },
  { id: 'crotched', name: 'Crotched Mountain', region: 'Northeast', country: 'US', admin: 'NH', lat: 42.9984, lon: -71.8735, base: 290, summit: 625, url: 'https://www.crotchedmtn.com', passes: ['epic'] },

  // Mid-Atlantic
  { id: 'seven-springs', name: 'Seven Springs', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 40.0229, lon: -79.2978, base: 732, summit: 899, url: 'https://www.7springs.com', passes: ['epic'] },
  { id: 'hidden-valley-pa', name: 'Hidden Valley', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 40.0525, lon: -79.2526, base: 732, summit: 884, url: 'https://www.hiddenvalleyresort.com', passes: ['epic'] },
  { id: 'laurel-mountain', name: 'Laurel Mountain', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 40.1586, lon: -79.1626, base: 640, summit: 853, url: 'https://www.laurelmountainski.com', passes: ['epic'] },
  { id: 'liberty', name: 'Liberty Mountain', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 39.7628, lon: -77.3758, base: 177, summit: 360, url: 'https://www.libertymountainresort.com', passes: ['epic'] },
  { id: 'roundtop', name: 'Roundtop', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 40.1104, lon: -76.9277, base: 230, summit: 365, url: 'https://www.skiroundtop.com', passes: ['epic'] },
  { id: 'whitetail', name: 'Whitetail', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 39.7414, lon: -77.9336, base: 260, summit: 530, url: 'https://www.skiwhitetail.com', passes: ['epic'] },
  { id: 'jack-frost', name: 'Jack Frost', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 41.1059, lon: -75.6544, base: 520, summit: 610, url: 'https://www.jfbb.com', passes: ['epic'] },
  { id: 'big-boulder', name: 'Big Boulder', region: 'Mid-Atlantic', country: 'US', admin: 'PA', lat: 41.0453, lon: -75.6071, base: 500, summit: 640, url: 'https://www.jfbb.com', passes: ['epic'] },

  // Midwest
  { id: 'afton-alps', name: 'Afton Alps', region: 'Midwest', country: 'US', admin: 'MN', lat: 44.8573, lon: -92.7865, base: 210, summit: 320, url: 'https://www.aftonalps.com', passes: ['epic'] },
  { id: 'mt-brighton', name: 'Mt. Brighton', region: 'Midwest', country: 'US', admin: 'MI', lat: 42.5432, lon: -83.8071, base: 290, summit: 365, url: 'https://www.mtbrighton.com', passes: ['epic'] },
  { id: 'wilmot', name: 'Wilmot Mountain', region: 'Midwest', country: 'US', admin: 'WI', lat: 42.5079, lon: -88.1838, base: 245, summit: 320, url: 'https://www.wilmotmountain.com', passes: ['epic'] },
  { id: 'alpine-valley-oh', name: 'Alpine Valley', region: 'Midwest', country: 'US', admin: 'OH', lat: 41.5281, lon: -81.2481, base: 340, summit: 410, url: 'https://www.alpinevalleyohio.com', passes: ['epic'] },
  { id: 'boston-mills', name: 'Boston Mills', region: 'Midwest', country: 'US', admin: 'OH', lat: 41.2639, lon: -81.5594, base: 220, summit: 295, url: 'https://www.bmbw.com', passes: ['epic'] },
  { id: 'brandywine', name: 'Brandywine', region: 'Midwest', country: 'US', admin: 'OH', lat: 41.2614, lon: -81.5414, base: 220, summit: 295, url: 'https://www.bmbw.com', passes: ['epic'] },
  { id: 'mad-river-oh', name: 'Mad River Mountain', region: 'Midwest', country: 'US', admin: 'OH', lat: 40.3172, lon: -83.6869, base: 340, summit: 440, url: 'https://www.skimadriver.com', passes: ['epic'] },
  { id: 'paoli-peaks', name: 'Paoli Peaks', region: 'Midwest', country: 'US', admin: 'IN', lat: 38.5733, lon: -86.4886, base: 200, summit: 290, url: 'https://www.paolipeaks.com', passes: ['epic'] },
  { id: 'snow-creek', name: 'Snow Creek', region: 'Midwest', country: 'US', admin: 'MO', lat: 39.3828, lon: -94.8856, base: 250, summit: 340, url: 'https://www.skisnowcreek.com', passes: ['epic'] },
  { id: 'hidden-valley-mo', name: 'Hidden Valley', region: 'Midwest', country: 'US', admin: 'MO', lat: 38.5544, lon: -90.6683, base: 160, summit: 250, url: 'https://www.hiddenvalleyski.com', passes: ['epic'] },

  // Canada
  { id: 'whistler-blackcomb', name: 'Whistler Blackcomb', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 50.1163, lon: -122.9574, base: 675, summit: 2284, url: 'https://www.whistlerblackcomb.com', passes: ['epic'] },
  { id: 'fernie', name: 'Fernie', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 49.4627, lon: -115.0873, base: 1068, summit: 2134, url: 'https://skifernie.com', passes: ['epic'] },
  { id: 'kicking-horse', name: 'Kicking Horse', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 51.2975, lon: -117.0478, base: 1190, summit: 2450, url: 'https://kickinghorseresort.com', passes: ['epic'] },
  { id: 'kimberley', name: 'Kimberley', region: 'Western Canada', country: 'CA', admin: 'BC', lat: 49.6833, lon: -115.9986, base: 1280, summit: 1982, url: 'https://skikimberley.com', passes: ['epic'] },
  { id: 'nakiska', name: 'Nakiska', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 50.9425, lon: -115.1508, base: 1525, summit: 2258, url: 'https://skinakiska.com', passes: ['epic'] },
  { id: 'mont-sainte-anne', name: 'Mont-Sainte-Anne', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 47.0753, lon: -70.9047, base: 175, summit: 800, url: 'https://mont-sainte-anne.com', passes: ['epic'] },
  { id: 'stoneham', name: 'Stoneham', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 47.0225, lon: -71.3786, base: 210, summit: 630, url: 'https://ski-stoneham.com', passes: ['epic'] },

  // Europe
  { id: 'verbier', name: 'Verbier 4 Vallées', region: 'Alps', country: 'CH', lat: 46.0964, lon: 7.2286, base: 1500, summit: 3330, url: 'https://www.verbier4vallees.ch', passes: ['epic'] },
  { id: 'crans-montana', name: 'Crans-Montana', region: 'Alps', country: 'CH', lat: 46.3125, lon: 7.4814, base: 1500, summit: 2927, url: 'https://www.mycransmontana.ch', passes: ['epic'] },
  { id: 'andermatt', name: 'Andermatt-Sedrun', region: 'Alps', country: 'CH', lat: 46.6356, lon: 8.5939, base: 1444, summit: 2961, url: 'https://www.andermatt-sedrun-disentis.ch', passes: ['epic'] },
  { id: 'les-3-vallees', name: 'Les 3 Vallées', region: 'Alps', country: 'FR', lat: 45.3966, lon: 6.5655, base: 1450, summit: 3230, url: 'https://www.les3vallees.com', passes: ['epic'] },
  { id: 'ski-arlberg', name: 'Ski Arlberg', region: 'Alps', country: 'AT', lat: 47.1287, lon: 10.2635, base: 1304, summit: 2811, url: 'https://www.skiarlberg.at', passes: ['epic'] },
  { id: 'saalbach', name: 'Skicircus Saalbach', region: 'Alps', country: 'AT', lat: 47.3913, lon: 12.6366, base: 1003, summit: 2096, url: 'https://www.saalbach.com', passes: ['epic'] },
  { id: 'zell-kaprun', name: 'Zell am See-Kaprun', region: 'Alps', country: 'AT', lat: 47.2583, lon: 12.73, base: 757, summit: 3029, url: 'https://www.zellamsee-kaprun.com', passes: ['epic'] },
  { id: 'solden', name: 'Sölden', region: 'Alps', country: 'AT', lat: 46.9655, lon: 11.0076, base: 1350, summit: 3340, url: 'https://www.soelden.com', passes: ['epic'] },
  { id: 'mayrhofen', name: 'Mayrhofen', region: 'Alps', country: 'AT', lat: 47.1667, lon: 11.8667, base: 630, summit: 2500, url: 'https://www.mayrhofner-bergbahnen.com', passes: ['epic'] },
  { id: 'hintertux', name: 'Hintertux Glacier', region: 'Alps', country: 'AT', lat: 47.0725, lon: 11.6778, base: 1500, summit: 3250, url: 'https://www.hintertuxergletscher.at', passes: ['epic'] },
  { id: 'silvretta-montafon', name: 'Silvretta Montafon', region: 'Alps', country: 'AT', lat: 47.08, lon: 9.92, base: 700, summit: 2430, url: 'https://www.silvretta-montafon.at', passes: ['epic'] },
  { id: 'madonna-di-campiglio', name: 'Madonna di Campiglio', region: 'Alps', country: 'IT', lat: 46.2297, lon: 10.8264, base: 850, summit: 2504, url: 'https://www.campigliodolomiti.it', passes: ['epic'] },

  // Japan & Australia
  { id: 'hakuba', name: 'Hakuba Valley', region: 'Japan', country: 'JP', admin: 'Nagano', lat: 36.6978, lon: 137.8325, base: 760, summit: 1831, url: 'https://www.hakubavalley.com', passes: ['epic'] },
  { id: 'rusutsu', name: 'Rusutsu', region: 'Japan', country: 'JP', admin: 'Hokkaido', lat: 42.7483, lon: 140.9036, base: 400, summit: 994, url: 'https://rusutsu.com', passes: ['epic'] },
  { id: 'perisher', name: 'Perisher', region: 'Australia & NZ', country: 'AU', admin: 'NSW', lat: -36.4061, lon: 148.4114, base: 1605, summit: 2034, url: 'https://www.perisher.com.au', passes: ['epic'] },
  { id: 'falls-creek', name: 'Falls Creek', region: 'Australia & NZ', country: 'AU', admin: 'VIC', lat: -36.8653, lon: 147.2781, base: 1500, summit: 1780, url: 'https://www.fallscreek.com.au', passes: ['epic'] },
  { id: 'mt-hotham', name: 'Mt Hotham', region: 'Australia & NZ', country: 'AU', admin: 'VIC', lat: -36.9772, lon: 147.1347, base: 1450, summit: 1845, url: 'https://www.mthotham.com.au', passes: ['epic'] },

  // ---------------------------------------------------------------------------------------------------
  // Mountain Collective 2026/27 partners that are on neither Ikon nor Epic.
  { id: 'grand-targhee', name: 'Grand Targhee', region: 'Northern Rockies', country: 'US', admin: 'WY', lat: 43.7895, lon: -110.958, base: 2300, summit: 3048, url: 'https://www.grandtarghee.com', passes: ['mountain-collective'] },
  { id: 'sugar-bowl', name: 'Sugar Bowl', region: 'California', country: 'US', admin: 'CA', lat: 39.3046, lon: -120.3339, base: 2100, summit: 2555, url: 'https://www.sugarbowl.com', passes: ['mountain-collective'] },
  { id: 'whiteface', name: 'Whiteface', region: 'Northeast', country: 'US', admin: 'NY', lat: 44.3659, lon: -73.9026, base: 375, summit: 1341, url: 'https://whiteface.com', passes: ['mountain-collective'] },
  { id: 'marmot-basin', name: 'Marmot Basin', region: 'Western Canada', country: 'CA', admin: 'AB', lat: 52.8003, lon: -118.0839, base: 1698, summit: 2612, url: 'https://www.skimarmot.com', passes: ['mountain-collective'] },
  { id: 'bromont', name: 'Bromont', region: 'Eastern Canada', country: 'CA', admin: 'QC', lat: 45.3083, lon: -72.6464, base: 175, summit: 565, url: 'https://www.bromontmontagne.com', passes: ['mountain-collective'] },

  // ---------------------------------------------------------------------------------------------------
  // Independent US mountains (on neither Ikon nor Epic). Tagged 'indy' where they're on the Indy Pass.

  // Pacific Northwest
  { id: 'mt-baker', name: 'Mt. Baker', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 48.8573, lon: -121.6648, base: 1067, summit: 1540, url: 'https://www.mtbaker.us', passes: [] },
  { id: 'mission-ridge', name: 'Mission Ridge', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 47.2925, lon: -120.3995, base: 1390, summit: 2066, url: 'https://www.missionridge.com', passes: ['indy'] },
  { id: 'forty-nine-north', name: '49 Degrees North', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 48.2967, lon: -117.5658, base: 1189, summit: 1754, url: 'https://www.ski49n.com', passes: ['indy'] },
  { id: 'white-pass', name: 'White Pass', region: 'Pacific Northwest', country: 'US', admin: 'WA', lat: 46.6371, lon: -121.3913, base: 1371, summit: 1830, url: 'https://skiwhitepass.com', passes: ['indy'] },
  { id: 'mt-hood-meadows', name: 'Mt. Hood Meadows', region: 'Pacific Northwest', country: 'US', admin: 'OR', lat: 45.3311, lon: -121.665, base: 1600, summit: 2225, url: 'https://www.skihood.com', passes: ['indy'] },
  { id: 'timberline', name: 'Timberline', region: 'Pacific Northwest', country: 'US', admin: 'OR', lat: 45.3311, lon: -121.7113, base: 1500, summit: 2600, url: 'https://www.timberlinelodge.com', passes: [] },
  { id: 'hoodoo', name: 'Hoodoo', region: 'Pacific Northwest', country: 'US', admin: 'OR', lat: 44.4083, lon: -121.8697, base: 1400, summit: 1740, url: 'https://skihoodoo.com', passes: ['indy'] },
  { id: 'mt-ashland', name: 'Mt. Ashland', region: 'Pacific Northwest', country: 'US', admin: 'OR', lat: 42.0814, lon: -122.7069, base: 1935, summit: 2296, url: 'https://www.mtashland.com', passes: [] },

  // Northern Rockies
  { id: 'bogus-basin', name: 'Bogus Basin', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 43.7643, lon: -116.1028, base: 1758, summit: 2316, url: 'https://bogusbasin.org', passes: [] },
  { id: 'brundage', name: 'Brundage', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 45.0047, lon: -116.1564, base: 1760, summit: 2320, url: 'https://brundage.com', passes: ['indy'] },
  { id: 'tamarack', name: 'Tamarack', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 44.6711, lon: -116.1235, base: 1490, summit: 2330, url: 'https://tamarackidaho.com', passes: ['indy'] },
  { id: 'silver-mountain', name: 'Silver Mountain', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 47.5406, lon: -116.1197, base: 1220, summit: 1910, url: 'https://silvermt.com', passes: ['indy'] },
  { id: 'lookout-pass', name: 'Lookout Pass', region: 'Northern Rockies', country: 'US', admin: 'ID', lat: 47.4558, lon: -115.6967, base: 1390, summit: 1720, url: 'https://skilookout.com', passes: [] },
  { id: 'whitefish', name: 'Whitefish Mountain', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 48.4806, lon: -114.3558, base: 1360, summit: 2078, url: 'https://skiwhitefish.com', passes: [] },
  { id: 'bridger-bowl', name: 'Bridger Bowl', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 45.8172, lon: -110.8964, base: 1859, summit: 2652, url: 'https://bridgerbowl.com', passes: [] },
  { id: 'red-lodge', name: 'Red Lodge Mountain', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 45.1897, lon: -109.3361, base: 2138, summit: 2870, url: 'https://www.redlodgemountain.com', passes: ['indy'] },
  { id: 'montana-snowbowl', name: 'Montana Snowbowl', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 47.0144, lon: -113.9925, base: 1520, summit: 2330, url: 'https://montanasnowbowl.com', passes: ['indy'] },
  { id: 'discovery', name: 'Discovery', region: 'Northern Rockies', country: 'US', admin: 'MT', lat: 46.2483, lon: -113.2386, base: 2215, summit: 2610, url: 'https://skidiscovery.com', passes: [] },
  { id: 'snow-king', name: 'Snow King', region: 'Northern Rockies', country: 'US', admin: 'WY', lat: 43.4664, lon: -110.7611, base: 1900, summit: 2382, url: 'https://snowkingmountain.com', passes: ['indy'] },

  // Colorado
  { id: 'wolf-creek', name: 'Wolf Creek', region: 'Colorado', country: 'US', admin: 'CO', lat: 37.4722, lon: -106.7933, base: 3155, summit: 3640, url: 'https://wolfcreekski.com', passes: [] },
  { id: 'loveland', name: 'Loveland', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.68, lon: -105.8978, base: 3230, summit: 3871, url: 'https://skiloveland.com', passes: ['indy'] },
  { id: 'monarch', name: 'Monarch', region: 'Colorado', country: 'US', admin: 'CO', lat: 38.5122, lon: -106.3322, base: 3290, summit: 3640, url: 'https://skimonarch.com', passes: [] },
  { id: 'powderhorn', name: 'Powderhorn', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.0694, lon: -108.1508, base: 2490, summit: 2990, url: 'https://powderhorn.com', passes: ['indy'] },
  { id: 'sunlight', name: 'Sunlight', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.3997, lon: -107.3381, base: 2400, summit: 3000, url: 'https://sunlightmtn.com', passes: ['indy'] },
  { id: 'purgatory', name: 'Purgatory', region: 'Colorado', country: 'US', admin: 'CO', lat: 37.6303, lon: -107.8139, base: 2682, summit: 3313, url: 'https://www.purgatory.ski', passes: [] },
  { id: 'silverton', name: 'Silverton Mountain', region: 'Colorado', country: 'US', admin: 'CO', lat: 37.8844, lon: -107.6658, base: 3140, summit: 3750, url: 'https://silvertonmountain.com', passes: [] },
  { id: 'ski-cooper', name: 'Ski Cooper', region: 'Colorado', country: 'US', admin: 'CO', lat: 39.3606, lon: -106.3017, base: 3200, summit: 3550, url: 'https://skicooper.com', passes: [] },

  // Utah
  { id: 'brian-head', name: 'Brian Head', region: 'Utah', country: 'US', admin: 'UT', lat: 37.7021, lon: -112.8499, base: 2925, summit: 3325, url: 'https://www.brianhead.com', passes: [] },
  { id: 'powder-mountain', name: 'Powder Mountain', region: 'Utah', country: 'US', admin: 'UT', lat: 41.3797, lon: -111.7808, base: 2100, summit: 2830, url: 'https://www.powdermountain.com', passes: [] },
  { id: 'beaver-mountain', name: 'Beaver Mountain', region: 'Utah', country: 'US', admin: 'UT', lat: 41.9686, lon: -111.5408, base: 2210, summit: 2700, url: 'https://www.skithebeav.com', passes: ['indy'] },
  { id: 'sundance', name: 'Sundance', region: 'Utah', country: 'US', admin: 'UT', lat: 40.3929, lon: -111.5888, base: 1860, summit: 2515, url: 'https://www.sundanceresort.com', passes: [] },

  // California & Nevada
  { id: 'mt-rose', name: 'Mt. Rose', region: 'California', country: 'US', admin: 'NV', lat: 39.3147, lon: -119.8853, base: 2508, summit: 2956, url: 'https://skirose.com', passes: [] },
  { id: 'diamond-peak', name: 'Diamond Peak', region: 'California', country: 'US', admin: 'NV', lat: 39.2544, lon: -119.9214, base: 2040, summit: 2600, url: 'https://www.diamondpeak.com', passes: [] },
  { id: 'bear-valley', name: 'Bear Valley', region: 'California', country: 'US', admin: 'CA', lat: 38.4925, lon: -120.0436, base: 2012, summit: 2591, url: 'https://www.bearvalley.com', passes: ['indy'] },
  { id: 'dodge-ridge', name: 'Dodge Ridge', region: 'California', country: 'US', admin: 'CA', lat: 38.1886, lon: -119.9564, base: 2012, summit: 2499, url: 'https://www.dodgeridge.com', passes: ['indy'] },
  { id: 'china-peak', name: 'China Peak', region: 'California', country: 'US', admin: 'CA', lat: 37.2367, lon: -119.1567, base: 2140, summit: 2600, url: 'https://www.skichinapeak.com', passes: ['indy'] },

  // Southwest
  { id: 'ski-santa-fe', name: 'Ski Santa Fe', region: 'Southwest', country: 'US', admin: 'NM', lat: 35.7958, lon: -105.8044, base: 3150, summit: 3680, url: 'https://skisantafe.com', passes: [] },
  { id: 'angel-fire', name: 'Angel Fire', region: 'Southwest', country: 'US', admin: 'NM', lat: 36.3931, lon: -105.2853, base: 2600, summit: 3260, url: 'https://www.angelfireresort.com', passes: [] },
  { id: 'red-river', name: 'Red River', region: 'Southwest', country: 'US', admin: 'NM', lat: 36.7083, lon: -105.4097, base: 2667, summit: 3150, url: 'https://redriverskiarea.com', passes: [] },
  { id: 'arizona-snowbowl', name: 'Arizona Snowbowl', region: 'Southwest', country: 'US', admin: 'AZ', lat: 35.3306, lon: -111.7111, base: 2804, summit: 3505, url: 'https://www.snowbowl.ski', passes: [] },
  { id: 'lee-canyon', name: 'Lee Canyon', region: 'Southwest', country: 'US', admin: 'NV', lat: 36.3036, lon: -115.6797, base: 2590, summit: 3350, url: 'https://www.leecanyonlv.com', passes: [] },

  // Northeast & Midwest
  { id: 'jay-peak', name: 'Jay Peak', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.9378, lon: -72.5047, base: 550, summit: 1209, url: 'https://jaypeakresort.com', passes: ['indy'] },
  { id: 'smugglers-notch', name: "Smugglers' Notch", region: 'Northeast', country: 'US', admin: 'VT', lat: 44.5883, lon: -72.79, base: 315, summit: 1110, url: 'https://www.smuggs.com', passes: ['indy'] },
  { id: 'mad-river-glen', name: 'Mad River Glen', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.2028, lon: -72.9178, base: 485, summit: 1112, url: 'https://www.madriverglen.com', passes: [] },
  { id: 'bolton-valley', name: 'Bolton Valley', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.4214, lon: -72.8497, base: 640, summit: 960, url: 'https://www.boltonvalley.com', passes: ['indy'] },
  { id: 'magic-mountain', name: 'Magic Mountain', region: 'Northeast', country: 'US', admin: 'VT', lat: 43.2014, lon: -72.7731, base: 410, summit: 865, url: 'https://magicmtn.com', passes: ['indy'] },
  { id: 'burke', name: 'Burke Mountain', region: 'Northeast', country: 'US', admin: 'VT', lat: 44.5708, lon: -71.8936, base: 365, summit: 990, url: 'https://skiburke.com', passes: ['indy'] },
  { id: 'saddleback', name: 'Saddleback', region: 'Northeast', country: 'US', admin: 'ME', lat: 44.9361, lon: -70.5069, base: 730, summit: 1256, url: 'https://www.saddlebackmaine.com', passes: ['indy'] },
  { id: 'cannon', name: 'Cannon Mountain', region: 'Northeast', country: 'US', admin: 'NH', lat: 44.1564, lon: -71.6983, base: 610, summit: 1250, url: 'https://www.cannonmt.com', passes: ['indy'] },
  { id: 'waterville-valley', name: 'Waterville Valley', region: 'Northeast', country: 'US', admin: 'NH', lat: 43.9658, lon: -71.5278, base: 600, summit: 1220, url: 'https://www.waterville.com', passes: ['indy'] },
  { id: 'bretton-woods', name: 'Bretton Woods', region: 'Northeast', country: 'US', admin: 'NH', lat: 44.2581, lon: -71.4417, base: 490, summit: 950, url: 'https://www.brettonwoods.com', passes: [] },
  { id: 'gore', name: 'Gore Mountain', region: 'Northeast', country: 'US', admin: 'NY', lat: 43.6728, lon: -74.0058, base: 300, summit: 1100, url: 'https://goremountain.com', passes: [] },
  { id: 'holiday-valley', name: 'Holiday Valley', region: 'Northeast', country: 'US', admin: 'NY', lat: 42.2639, lon: -78.6697, base: 400, summit: 690, url: 'https://www.holidayvalley.com', passes: [] },
  { id: 'mount-bohemia', name: 'Mount Bohemia', region: 'Midwest', country: 'US', admin: 'MI', lat: 47.3933, lon: -88.0122, base: 210, summit: 440, url: 'https://www.mtbohemia.com', passes: [] },
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

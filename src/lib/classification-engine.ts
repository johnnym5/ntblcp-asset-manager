/**
 * @fileOverview Post-Import Asset Classification Engine.
 * Automatically sorts imported assets into logical groups, subgroups, and types.
 * Phase 100: Rule-based keyword matching & normalization pulse.
 */

import type { Asset, AssetClassification, ValidationGroup } from '@/types/domain';

interface ClassificationRule {
  group: string;
  validationGroup: ValidationGroup;
  keywords: string[];
  subgroups: Record<string, string[]>;
  brands: string[];
}

const RULES: ClassificationRule[] = [
  {
    group: 'Laptops',
    validationGroup: 'electronics',
    keywords: ['laptop', 'notebook', 'ultrabook', 'computer', 'envy', 'latitude', 'thinkpad'],
    subgroups: {
      'HP': ['hp', 'envy', 'elitebook', 'probook'],
      'Dell': ['dell', 'latitude', 'precision', 'inspiron'],
      'Lenovo': ['lenovo', 'thinkpad', 'ideapad'],
      'MacBook': ['apple', 'macbook', 'mac']
    },
    brands: ['HP', 'Dell', 'Lenovo', 'Apple', 'Asus', 'Acer']
  },
  {
    group: 'Batteries',
    validationGroup: 'infrastructure',
    keywords: ['battery', 'batteries', 'ah'],
    subgroups: {
      'Inverter Batteries': ['inverter', 'solar', 'deep cycle'],
      'UPS Batteries': ['ups', 'backup'],
      'Dry Cell': ['lithium', 'dry cell']
    },
    brands: ['Luminous', 'Mercury', 'Prag', 'Genus', 'Quanta']
  },
  {
    group: 'Vehicles',
    validationGroup: 'vehicles',
    keywords: ['vehicle', 'motor', 'car', 'van', 'ambulance', 'motorcycle', 'truck', 'bike', 'bus'],
    subgroups: {
      'Motor Vehicles': ['car', 'toyota', 'hilux', 'prado', 'bus'],
      'Vans': ['van', 'xray van', 'transit'],
      'Motorcycles': ['motorcycle', 'bike', 'honda', 'bajaj', 'yamaha'],
      'Ambulances': ['ambulance', 'emergency']
    },
    brands: ['Toyota', 'Honda', 'Nissan', 'Bajaj', 'Yamaha', 'Suzuki']
  },
  {
    group: 'Inverters',
    validationGroup: 'electronics',
    keywords: ['inverter'],
    subgroups: {
      'Hybrid Inverters': ['hybrid'],
      'Pure Sine Wave': ['pure sine', 'sine wave'],
      'Solar Inverters': ['solar']
    },
    brands: ['Luminous', 'Mercury', 'Prag', 'Genus', 'Victron']
  },
  {
    group: 'Printers',
    validationGroup: 'electronics',
    keywords: ['printer', 'laserjet', 'inkjet', 'deskjet'],
    subgroups: {
      'Laser Printers': ['laserjet', 'laser'],
      'Inkjet Printers': ['inkjet', 'deskjet'],
      'Multifunction': ['mfc', 'aio', 'scanner']
    },
    brands: ['HP', 'Canon', 'Epson', 'Samsung', 'Brother']
  },
  {
    group: 'GeneXpert Machines',
    validationGroup: 'medical',
    keywords: ['gene xpert', 'genexpert', 'cepheid'],
    subgroups: {
      'GX-4': ['4 module', '4-module'],
      'GX-16': ['16 module', '16-module']
    },
    brands: ['Cepheid']
  },
  {
    group: 'Office Furniture',
    validationGroup: 'furniture',
    keywords: ['chair', 'table', 'cabinet', 'shelf', 'shelves', 'desk'],
    subgroups: {
      'Chairs': ['chair', 'swivel'],
      'Tables': ['table', 'desk'],
      'Cabinets': ['cabinet', 'filing'],
      'Shelves': ['shelf', 'shelves', 'metal shelf']
    },
    brands: []
  },
  {
    group: 'Air Conditioners',
    validationGroup: 'electronics',
    keywords: ['air conditioner', 'ac', 'split unit'],
    subgroups: {
      'Split Units': ['split'],
      'Window Units': ['window'],
      'Floor Standing': ['standing']
    },
    brands: ['LG', 'Panasonic', 'Samsung', 'Haier', 'Hisense']
  },
  {
    group: 'Generators',
    validationGroup: 'infrastructure',
    keywords: ['generator', 'genset', 'kva'],
    subgroups: {
      'Diesel': ['diesel', 'mikano'],
      'Petrol': ['petrol', 'gasoline']
    },
    brands: ['Mikano', 'Honda', 'Perkins', 'Cummins', 'Sumec']
  }
];

export const ClassificationEngine = {
  /**
   * Performs dynamic classification on an imported asset record.
   */
  classify(asset: Asset): AssetClassification {
    const desc = (asset.description || '').toLowerCase();
    const cat = (asset.category || '').toLowerCase();
    const text = `${desc} ${cat}`;

    let group = 'Uncategorized';
    let validationGroup: ValidationGroup = 'unknown';
    let subgroup = 'General';
    let brand = 'Unknown';
    let type = 'Standard';

    // 1. Find Matching Rule
    const rule = RULES.find(r => r.keywords.some(k => text.includes(k)));
    if (rule) {
      group = rule.group;
      validationGroup = rule.validationGroup;
      
      // Find Subgroup
      for (const [subName, subKeywords] of Object.entries(rule.subgroups)) {
        if (subKeywords.some(k => text.includes(k))) {
          subgroup = subName;
          break;
        }
      }

      // Find Brand
      const matchedBrand = rule.brands.find(b => text.includes(b.toLowerCase()));
      if (matchedBrand) brand = matchedBrand;
    }

    // 2. Detect Year Bucket
    const yearMatch = text.match(/\b(20\d{2})\b/);
    const yearBucket = yearMatch ? parseInt(yearMatch[1]) : null;

    // 3. Detect Transfer Group
    const isTransfer = text.includes('transfer') || text.includes('inherited');
    let transferSource = null;
    if (isTransfer) {
      if (text.includes('lsmoh')) transferSource = 'LSMOH';
      else if (text.includes('ihvn')) transferSource = 'IHVN';
      else if (text.includes('fhi360')) transferSource = 'FHI360';
      else transferSource = 'Other Partner';
    }

    // 4. Condition Bucket
    let conditionBucket = 'Standard';
    const cond = (asset.condition || '').toLowerCase();
    if (cond.includes('new')) conditionBucket = 'Optimal';
    else if (cond.includes('bad') || cond.includes('unsalvageable') || cond.includes('burnt')) conditionBucket = 'Critical';
    else if (cond.includes('stolen')) conditionBucket = 'Loss';

    return {
      group,
      validationGroup,
      subgroup,
      type,
      brand,
      normalizedLabel: this.normalize(group, subgroup, brand),
      conditionBucket,
      yearBucket,
      isTransfer,
      transferSource
    };
  },

  /**
   * Aggregates a list of assets into a hierarchical group tree.
   */
  getGroupTree(assets: Asset[]) {
    const tree: Record<string, {
      count: number;
      subgroups: Record<string, number>;
      conditions: Record<string, number>;
      years: Record<number, number>;
    }> = {};

    assets.forEach(asset => {
      const cls = asset.classification || this.classify(asset);
      
      if (!tree[cls.group]) {
        tree[cls.group] = { count: 0, subgroups: {}, conditions: {}, years: {} };
      }

      const node = tree[cls.group];
      node.count++;
      node.subgroups[cls.subgroup] = (node.subgroups[cls.subgroup] || 0) + 1;
      node.conditions[cls.conditionBucket] = (node.conditions[cls.conditionBucket] || 0) + 1;
      if (cls.yearBucket) {
        node.years[cls.yearBucket] = (node.years[cls.yearBucket] || 0) + 1;
      }
    });

    return tree;
  },

  normalize(group: string, subgroup: string, brand: string): string {
    if (brand !== 'Unknown') return `${brand} ${subgroup}`;
    if (subgroup !== 'General') return subgroup;
    return group;
  }
};

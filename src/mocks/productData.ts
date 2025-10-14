import { ObjectModel } from '../utils/constraints';

type ProductData = {
  [key: string]: {
    id: string;
    link: string;
    name: string;
    price: string;
    image: string;
    variants: ObjectModel[];
    variantType: string;
    features: string[];
  }[];
}

const productData: ProductData = {
  Furniture: [
    // Furniture Variant 1 (2 variants)
    {
      id: 'furniture_variant_1',
      link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-short-projection-basin-drawer-vanity-600mm-c76236',
      name: 'Corsica Gloss White Basin Drawer Vanity 600mm',
      price: '179.00',
      image: 'assets/productImages/furniture/C76237-1000-White-Basin-Drawer-Vanity-600mm_1.webp',
      variants: [
        {
          id: 'C76236',
          name: 'Wall Hung Slimline Basin Drawer Vanity 600mm',
          image: 'assets/productImages/furniture/C76236-1000-White-Wall-Hung-Basin-Drawer-Vanity-600mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-short-projection-basin-drawer-vanity-600mm-c76236',
          path: '../../models/furniture/basin/C76236.glb',
          dimensions: { width: 60.4, height: 55, depth: 34.7 },
          floorOffset: 25,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false,
            minHeight: 15,
          },
          sku: 'C76236',
          price: '179.00',
          title: 'Corsica Gloss White Wall Hung Slimline Basin Drawer Vanity 600mm'
        },
        {
          id: 'C76237',
          name: 'Slimline Basin Drawer Vanity 600mm',
          image: 'assets/productImages/furniture/C76237-1000-White-Basin-Drawer-Vanity-600mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-short-projection-basin-drawer-vanity-600mm-c76237',
          path: '../../models/furniture/basin/C76237.glb',
          dimensions: { width: 60.4, height: 85, depth: 34.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false,
            minHeight: 70,
            maxHeight: 120
          },
          sku: 'C76237',
          price: '219.00',
          title: 'Corsica Gloss White Slimline Basin Drawer Vanity 600mm'
        }
      ],
      variantType: 'Style Options',
      features: ['Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    // Furniture Variant 2 (4 variants)
    {
      id: 'furniture_variant_2',
      link: 'https://www.bathroommountain.co.uk/bali-gloss-white-basin-drawer-vanity-600mm',
      name: 'Bali Gloss White Wall Hung Basin Drawer Vanity',
      price: '319.00',
      image: 'assets/productImages/furniture/C77608-1000-Bali-Gloss-White-Wall-Hung-Basin-Drawer_1.webp',
      variants: [
        {
          id: 'C77605',
          name: '600mm Width',
          image: 'assets/productImages/furniture/C77605-1000-Bali-Gloss-White-Basin-Drawer_1.webp',
          link: 'https://www.bathroommountain.co.uk/bali-gloss-white-basin-drawer-vanity-600mm',
          path: '../../models/furniture/basin/C77605.glb',
          dimensions: { width: 61, height: 83, depth: 44 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C77605',
          price: '319.00',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 600mm'
        },
        {
          id: 'C77606',
          name: '800mm Width',
          sku: 'C77606',
          image: 'assets/productImages/furniture/C77606-1000-Bali-Gloss-White-Wall-Hung-Basin-Drawer-_1.webp',
          link: 'https://www.bathroommountain.co.uk/bali-gloss-white-wall-hung-basin-drawer-vanity-800mm',
          path: '../../models/furniture/basin/C77606.glb',
          dimensions: { width: 81.3, height: 53, depth: 44 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          price: '343.00',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 800mm'
        },
        {
          id: 'C77607',
          name: '900mm Width',
          sku: 'C77607',
          image: 'assets/productImages/furniture/C77607-1000-Bali-Gloss-White-Basin-Drawer-_1.webp',
          link: 'https://www.bathroommountain.co.uk/bali-gloss-white-basin-drawer-vanity-800mm',
          path: '../../models/furniture/basin/C77607.glb',
          dimensions: { width: 81.3, height: 83.4, depth: 44 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          price: '415.99',
          title: 'Bali Gloss White Basin Drawer Vanity 900mm'
        },
        {
          id: 'C77608',
          name: '1000mm Width',
          sku: 'C77608',
          image: 'assets/productImages/furniture/C77608-1000-Bali-Gloss-White-Wall-Hung-Basin-Drawer_1.webp',
          link: 'https://www.bathroommountain.co.uk/bali-gloss-white-wall-hung-basin-drawer-vanity-1000mm',
          path: '../../models/furniture/basin/C77608.glb',
          dimensions: { width: 100.08, height: 53, depth: 43.9 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          price: '431.99',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 1000mm'
        }
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_3',
      link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-basin-drawer-vanity-500mm-c76234',
      name: 'Corsica Gloss White Wall Hung Slimline Basin Drawer Vanity 500mm',
      price: '183.99',
      image: 'assets/productImages/furniture/c76234-1000-white-wall-hung-basin-drawer-vanity-500mm.webp',
      variants: [
        {
          id: 'C76234',
          name: '500mm Wall Hung',
          image: 'assets/productImages/furniture/c76234-1000-white-wall-hung-basin-drawer-vanity-500mm.webp',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-basin-drawer-vanity-500mm-c76234',
          path: '../../models/furniture/basin/C76234.glb',
          dimensions: { width: 50.4, height: 50.1, depth: 34.7 },
          floorOffset: 10,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
            movement: {
                snapToWall: true,
                allowVerticalMovement: false, // Vertical placement NOT allowed (fixed mount height)
                allowFreeRotation: false,
                minHeight: 10, // Minimum height from floor
                maxHeight: 10
            },
          sku: 'C76234',
          price: '183.99',
          title: 'Corsica Gloss White Wall Hung Slimline Basin Drawer Vanity 500mm'
        },
        {
          id: 'C76235',
          name: '500mm Floor Standing',
          image: 'assets/productImages/furniture/c76235-1000-white-basin-drawer-vanity-500mm.webp',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-short-projection-basin-drawer-vanity-500mm-c76235',
          path: '../../models/furniture/basin/C76235.glb',
          dimensions: { width: 50.4, height: 85, depth: 34.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
            movement: {
                snapToWall: true,
                allowVerticalMovement: false, // Vertical placement NOT allowed (fixed mount height)
                allowFreeRotation: false,
            },
          sku: 'C76235',
          price: '269.99',
          title: 'Corsica Gloss White Slimline Basin Drawer Vanity 500mm'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_4',
      link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-600mm-c76304',
      name: 'Bermuda Chalk White Basin Vanity 600mm',
      price: '231.99',
      image: 'assets/productImages/furniture/C76304-1000-Bermuda-Chalk-White-Basin-Vanity-600mm_1.webp',
      variants: [
        {
          id: 'C76304',
          name: '600mm Width',
          image: 'assets/productImages/furniture/C76304-1000-Bermuda-Chalk-White-Basin-Vanity-600mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-600mm-c76304',
          path: '../../models/furniture/basin/C76304.glb',
          dimensions: { width: 61.4, height: 84, depth: 41.5 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
            movement: {
                snapToWall: true,
                allowVerticalMovement: false, // Vertical placement allowed (0..ceiling)
                allowFreeRotation: false,
            },
          sku: 'C76304',
          price: '231.99',
          title: 'Bermuda Chalk White Basin Vanity 600mm'
        },
        {
          id: 'C76305',
          name: '800mm Width',
          image: 'assets/productImages/furniture/C76305-1000-Bermuda-Chalk-White-Basin-Vanity-800mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-800mm',
          path: '../../models/furniture/basin/C76305.glb',
          dimensions: { width: 81.3, height: 84, depth: 41.5 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76305',
          price: '287.00',
          title: 'Bermuda Chalk White Basin Vanity 800mm'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_5',
      link: 'https://www.bathroommountain.co.uk/avon-gloss-white-basin-vanity-600mm-c76473',
      name: 'Avon Gloss White Basin Vanity 600mm',
      price: '167.99',
      image: 'assets/productImages/furniture/c76473-1000-avon-gloss-white-basin-vanity-600mm.webp',
      variants: [
        {
          id: 'C76473',
          name: '600mm Cabinet',
          image: 'assets/productImages/furniture/c76473-1000-avon-gloss-white-basin-vanity-600mm.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-basin-vanity-600mm-c76473',
          path: '../../models/furniture/basin/C76473.glb',
          dimensions: { width: 61.4, height: 85, depth: 42.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76473',
          price: '167.99',
          title: 'Avon Gloss White Basin Vanity 600mm'
        },
        {
          id: 'C76472',
          name: '500mm Cabinet',
          image: 'assets/productImages/furniture/c76472-1000-avon-gloss-white-basin-vanity-500mm.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-basin-vanity-500mm-c76472',
          path: '../../models/furniture/basin/C76472.glb',
          dimensions: { width: 51.6, height: 85, depth: 42.9 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76472',
          price: '159.00',
          title: 'Avon Gloss White Basin Vanity 500mm'
        },
        {
          id: 'C76476',
          name: '800mm Cabinet',
          image: 'assets/productImages/furniture/c76476-1000-avon-gloss-white-basin-vanity-800mm.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-basin-vanity-800mm-c76476',
          path: '../../models/furniture/basin/C76476.glb',
          dimensions: { width: 81.6, height: 85, depth: 42.9 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76476',
          price: '199.99',
          title: 'Avon Gloss White Basin Vanity 800mm'
        },
        {
          id: 'C76475',
          name: '600mm Wall Hung',
          image: 'assets/productImages/furniture/C76475-1000-Avon-Gloss-White-Wall-Hung-Basin-Drawer-Vanity-600mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-wall-hung-basin-drawer-vanity-600mm',
          path: '../../models/furniture/basin/C76475.glb',
          dimensions: { width: 61.4, height: 45.3, depth: 42.3 },
          floorOffset: 39.7,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76475',
          price: '189.99',
          title: 'Avon Gloss White Wall Hung Basin Drawer Vanity 600mm'
        },
        {
          id: 'C76474',
          name: '600mm Drawer',
          image: 'assets/productImages/furniture/c76474-1000-avon-gloss-white-basin-drawer-vanity-600mm.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-basin-drawer-vanity-600mm-c76474',
          path: '../../models/furniture/basin/C76474.glb',
          dimensions: { width: 61.4, height: 85, depth: 42.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76474',
          price: '259.99',
          title: 'Avon Gloss White Basin Drawer Vanity 600mm'
        },
        {
          id: 'C77113',
          name: '450mm Cabinet',
          image: 'assets/productImages/furniture/c77113-1000-avon-gloss-white-basin-vanity-450mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-basin-vanity-450mm',
          path: '../../models/furniture/basin/C77113.glb',
          dimensions: { width: 45.8, height: 85.1, depth: 34 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C77113',
          price: '179.99',
          title: 'Avon Gloss White Basin Vanity 450mm'
        },
        {
          id: 'C76471',
          name: '400mm Cabinet',
          image: 'assets/productImages/furniture/c76471-1000-gloss-white-cloakroom-floor-standing-basin-vanity-400mm.webp',
          link: 'https://www.bathroommountain.co.uk/avon-gloss-white-cloakroom-floor-standing-basin-vanity-400mm',
          path: '../../models/furniture/basin/C76471.glb',
          dimensions: { width: 40.4, height: 85.1, depth: 26.4 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76471',
          price: '105.00',
          title: 'Avon Gloss White Cloakroom Floor Standing Basin Vanity 400mm'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_6',
      link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-basin-vanity-630mm-c76349',
      name: 'Lucia Chalk White Basin Vanity 630mm',
      price: '359.00',
      image: 'assets/productImages/furniture/c76349-1000-lucia-chalk-white-basin-vanity-630mm_1.webp',
      variants: [
        {
          id: 'C76349',
          name: 'Traditional Basin',
          image: 'assets/productImages/furniture/c76349-1000-lucia-chalk-white-basin-vanity-630mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-basin-vanity-630mm-c76349',
          path: '../../models/furniture/basin/C76349.glb',
          dimensions: { width: 63, height: 86.2, depth: 47.6 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76349',
          price: '359.00',
          title: 'Lucia Chalk White Basin Vanity 630mm'
        },
        {
          id: 'C76353',
          name: 'Curved Basin',
          image: 'assets/productImages/furniture/C76353-1000-Lucia-Chalk-White-Vanity-with-Oak-Top-and-Curved-Counter-Top-Basin-640mm_2.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-oak-top-curved-counter-top-basin-640mm-c76353',
          path: '../../models/furniture/basin/C76353.glb',
          dimensions: { width: 64, height: 95.5, depth: 47.4 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76353',
          price: '399.00',
          title: 'Lucia Chalk White Vanity With Oak Effect Top & Curved Counter Top Basin 640mm'
        },
        {
          id: 'C76448',
          name: 'No Basin',
          image: 'assets/productImages/furniture/c76448-1000-lucia-chalk-white-vanity-with-oak-top-640mm.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-cabinet-with-oak-top-640mm-excludes-counter-top-basin',
          path: '../../models/furniture/basin/C76448.glb',
          dimensions: { width: 64, height: 81.7, depth: 47.4 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76448',
          price: '479.99',
          title: 'Lucia Chalk White Cabinet with Oak Effect Top 640mm - Excludes Counter Top Basin'
        },
        {
          id: 'C76352',
          name: 'Oval Basin',
          image: 'assets/productImages/furniture/C76352-1000-Lucia-Chalk-White-Vanity-with-Oak-Top-and-Oval-Counter-Top-Basin-640mm_2.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-oak-top-oval-counter-top-basin-640mm-c76352',
          path: '../../models/furniture/basin/C76352.glb',
          dimensions: { width: 64, height: 98.7, depth: 47.5 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76352',
          price: '499.99',
          title: 'Lucia Chalk White Vanity With Oak Effect Top & Oval Counter Top Basin 640mm'
        },
        {
          id: 'C76351',
          name: 'Round Basin',
          image: 'assets/productImages/furniture/C76351-1000-Lucia-Chalk-White-Vanity-with-Oak-Top-and-Round-Counter-Top-Basin-640mm_2.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-oak-top-round-counter-top-basin-640mm-c76351',
          path: '../../models/furniture/basin/C76351.glb',
          dimensions: { width: 64, height: 97.2, depth: 47.4 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76351',
          price: '499.99',
          title: 'Lucia Chalk White Vanity With Oak Effect Top & Round Counter Top Basin 640mm'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_7',
      link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-vanity-with-marble-top-curved-counter-top-basin-600mm-c77096',
      name: 'Bermuda Chalk White Vanity with Marble Top & Curved Counter Top Basin 600mm',
      price: '285.00',
      image: 'assets/productImages/furniture/C77096-1000-Chalk-White-Vanity-with-Marble-Top-_-Counter-Top-Basin-600mm_1_1.webp',
      variants: [
        {
          id: 'C77096',
          name: 'Curved Basin',
          image: 'assets/productImages/furniture/C77096-1000-Chalk-White-Vanity-with-Marble-Top-_-Counter-Top-Basin-600mm_1_1.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-vanity-with-marble-top-curved-counter-top-basin-600mm-c77096',
          path: '../../models/furniture/basin/C77096.glb',
          dimensions: { width: 61, height: 95.3, depth: 41.2 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C77096',
          price: '285.00',
          title: 'Bermuda Chalk White Vanity with Marble Top & Curved Counter Top Basin 600mm'
        },
        {
          id: 'C77095',
          name: 'Oval Basin',
          image: 'assets/productImages/furniture/C77095-1000-Chalk-White-Vanity-with-Marble-Top-_-Counter-Top-Basin-600mm_1_1.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-vanity-with-marble-top-oval-counter-top-basin-600mm-c77095',
          path: '../../models/furniture/basin/C77095.glb',
          dimensions: { width: 61, height: 95.3, depth: 41.2 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C77095',
          price: '275.00',
          title: 'Bermuda Chalk White Vanity with Marble Top & Oval Counter Top Basin 600mm'
        },
        {
          id: 'C77634',
          name: 'No Basin',
          image: 'assets/productImages/furniture/c77634-1000-chalk-white-cabinet-with-marble-top-exclude-counter-top-basin.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-cabinet-with-marble-top-600mm-exclude-counter-top-basin-c77634',
          path: '../../models/furniture/basin/C77634.glb',
          dimensions: { width: 61, height: 95.3, depth: 41.2 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C77634',
          price: '349.99',
          title: 'Bermuda Chalk White Cabinet with Marble Top 600mm - Excludes Counter Top Basin'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_8',
      link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-600mm-brushed-brass-accents-c78594',
      name: 'Bermuda Chalk White Basin Vanity 600mm - Brushed Brass Accents',
      price: '247.00',
      image: 'assets/productImages/furniture/C78594-1000-Bermuda-Chalk-White-Basin-Vanity-600mm.webp',
      variants: [
        {
          id: 'C78594',
          name: '600mm',
          image: 'assets/productImages/furniture/C78594-1000-Bermuda-Chalk-White-Basin-Vanity-600mm.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-600mm-brushed-brass-accents-c78594',
          path: '../../models/furniture/basin/C78594.glb',
          dimensions: { width: 61.4, height: 84, depth: 41.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C78594',
          price: '247.00',
          title: 'Bermuda Chalk White Basin Vanity 600mm - Brushed Brass Accents'
        },
        {
          id: 'C78592',
          name: '400mm',
          image: 'assets/productImages/furniture/c78592-1000-bermuda-chalk-white-cloakroom-basin-vanity-400mm.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-cloakroom-basin-vanity-400mm-brushed-brass-accents-c78592',
          path: '../../models/furniture/basin/C78592.glb',
          dimensions: { width: 40.4, height: 85.1, depth: 25.6 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C78592',
          price: '199.99',
          title: 'Bermuda Chalk White Cloakroom Basin Vanity 400mm - Brushed Brass Accents'
        },
        {
          id: 'C78593',
          name: '500mm',
          image: 'assets/productImages/furniture/c78593-1000-bermuda-chalk-white-basin-vanity-500mm.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-500mm-brushed-brass-accents-c78593',
          path: '../../models/furniture/basin/C78593.glb',
          dimensions: { width: 51.3, height: 84, depth: 41.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C78593',
          price: '279.99',
          title: 'Bermuda Chalk White Basin Vanity 500mm - Brushed Brass Accents'
        },
        {
          id: 'C78595',
          name: '800mm',
          image: 'assets/productImages/furniture/C78595-1000-Bermuda-Chalk-White-Basin-Vanity-800mm.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-basin-vanity-800mm-brushed-brass-accents-c78595',
          path: '../../models/furniture/basin/C78595.glb',
          dimensions: { width: 81.3, height: 84, depth: 41.8 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C78595',
          price: '299.00',
          title: 'Bermuda Chalk White Basin Vanity 800mm - Brushed Brass Accents'
        },
        {
          id: 'C78596',
          name: '1200mm',
          image: 'assets/productImages/furniture/C78596-1000-Bermuda-Chalk-White-Double-Basin-Vanity-1200mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-double-basin-vanity-1200mm-brushed-brass-accents-c78596',
          path: '../../models/furniture/basin/C78596.glb',
          dimensions: { width: 121, height: 83.7, depth: 41.9 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C78596',
          price: '689.99',
          title: 'Bermuda Chalk White Double Basin Vanity 1200mm - Brushed Brass Accents'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_9',
      link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-basin-vanity-830mm',
      name: 'Lucia Chalk White Basin Vanity 830mm',
      price: '431.99',
      image: 'assets/productImages/furniture/C76354-1000-Lucia-Chalk-White-Basin-Vanity-830mm_2.webp',
      variants: [
        {
          id: 'C76354',
          name: 'Traditional Basin',
          image: 'assets/productImages/furniture/C76354-1000-Lucia-Chalk-White-Basin-Vanity-830mm_2.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-basin-vanity-830mm',
          path: '../../models/furniture/basin/C76354.glb',
          dimensions: { width: 82.9, height: 86.1, depth: 47.3 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76354',
          price: '431.99',
          title: 'Lucia Chalk White Basin Vanity 830mm'
        },
        {
          id: 'C76358',
          name: 'Curved Basin',
          image: 'assets/productImages/furniture/c76358-1000-lucia-chalk-white-vanity-with-oak-top-_-curved-counter-t.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-oak-top-curved-counter-top-basin-840mm',
          path: '../../models/furniture/basin/C76358.glb',
          dimensions: { width: 84, height: 95.6, depth: 47.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76358',
          price: '479.00',
          title: 'Lucia Chalk White Vanity With Oak Effect Top & Curved Counter Top Basin 840mm'
        },
        {
          id: 'C76449',
          name: 'No Basin',
          image: 'assets/productImages/furniture/c76449-1000-lucia-chalk-white-vanity-with-oak-top-840mm.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-cabinet-with-oak-top-840mm-excludes-counter-top-basin',
          path: '../../models/furniture/basin/C76449.glb',
          dimensions: { width: 84, height: 82, depth: 47.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76449',
          price: '569.99',
          title: 'Lucia Chalk White Cabinet with Oak Effect Top 840mm - Excludes Counter Top Basin'
        },
        {
          id: 'C76357',
          name: 'Oval Basin',
          image: 'assets/productImages/furniture/c76357-1000-lucia-chalk-white-vanity-with-oak-top-_-oval-counter-top.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-oak-top-oval-counter-top-basin-840mm',
          path: '../../models/furniture/basin/C76357.glb',
          dimensions: { width: 84, height: 99, depth: 47.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76357',
          price: '471.99',
          title: 'Lucia Chalk White Vanity With Oak Effect Top & Oval Counter Top Basin 840mm'
        },
        {
          id: 'C76356',
          name: 'Traditional Basin',
          image: 'assets/productImages/furniture/c76356-1000-lucia-chalk-white-vanity-with-oak-top-_-round-counter-to.webp',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-oak-top-round-counter-top-basin-840mm-c76356',
          path: '../../models/furniture/basin/C76356.glb',
          dimensions: { width: 84, height: 97.6, depth: 47.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76356',
          price: '589.99',
          title: 'Lucia Chalk White Vanity With Oak Top & Round Counter Top Basin 840mm'
        },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_10',
      link: 'https://www.bathroommountain.co.uk/bermuda-dove-grey-basin-vanity-600mm-c76285',
      name: 'Bermuda Dove Grey Basin Vanity 600mm',
      price: '225.00',
      image: 'assets/productImages/furniture/c76285-1000-bermuda-dove-grey-basin-vanity-600mm.webp',
      variants: [
        {
          id: 'C76285',
          name: '600mm Width',
          image: 'assets/productImages/furniture/c76285-1000-bermuda-dove-grey-basin-vanity-600mm.webp',
          link: 'https://www.bathroommountain.co.uk/bermuda-dove-grey-basin-vanity-600mm-c76285',
          path: '../../models/furniture/basin/C76285.glb',
          dimensions: { width: 61.4, height: 84, depth: 41.5 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C76285',
          price: '225.00',
          title: 'Bermuda Dove Grey Basin Vanity 600mm'
        },
          {
              id: 'C76286',
              name: '800mm Width',
              image: 'assets/productImages/furniture/C76286-1000-Bermuda-Dove-Grey-Basin-Vanity-800mm_3.webp',
              link: 'https://www.bathroommountain.co.uk/bermuda-dove-grey-basin-vanity-800mm',
              path: '../../models/furniture/basin/C76286.glb',
              dimensions: { width: 81.3, height: 84, depth: 41.5 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              sku: 'C76286',
              price: '285.00',
              title: 'Bermuda Dove Grey Basin Vanity 800mm'
          },
          {
              id: 'C76283',
              name: '400mm Width',
              image: 'assets/productImages/furniture/c76283-1000-bermuda-dove-grey-cloakroom-basin-vanity-400mm.webp',
              link: 'https://www.bathroommountain.co.uk/bermuda-dove-grey-cloakroom-basin-vanity-400mm-c76283',
              path: '../../models/furniture/basin/C76283.glb',
              dimensions: { width: 40.4, height: 85.1, depth: 25.2 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              sku: 'C76283',
              price: '189.99',
              title: 'Bermuda Dove Grey Cloakroom Basin Vanity 400mm'
          },
          {
              id: 'C76284',
              name: '500mm Width',
              image: 'assets/productImages/furniture/c76284-1000-bermuda-dove-grey-basin-vanity-500mm_1.webp',
              link: 'https://www.bathroommountain.co.uk/bermuda-dove-grey-basin-vanity-500mm-c76284',
              path: '../../models/furniture/basin/C76284.glb',
              dimensions: { width: 51.3, height: 84, depth: 41.4 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              sku: 'C76284',
              price: '269.99',
              title: 'Bermuda Dove Grey Basin Vanity 500mm'
          },
          {
              id: 'C76287',
              name: '1200mm Width',
              image: 'assets/productImages/furniture/c76287-1000-bermuda-dove-grey-double-basin-vanity-1200mm.webp',
              link: 'https://www.bathroommountain.co.uk/bermuda-dove-grey-basin-vanity-800mm',
              path: '../../models/furniture/basin/C76287.glb',
              dimensions: { width: 120.1, height: 83.7, depth: 41.6 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              sku: 'C76287',
              price: '649.99',
              title: 'Bermuda Dove Grey Double Basin Vanity 1200mm'
          },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
      id: 'furniture_variant_11',
      link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-600mm-chrome-handles-c81232',
      name: 'Milos Cotton White Basin Vanity 600mm - Chrome Handles',
      price: '207.00',
      image: 'assets/productImages/furniture/C81232-1000-Cotton-White-Basin-Vanity-600mm-Chrome-Handles_1.webp',
      variants: [
        {
          id: 'C81232',
          name: 'Built-in Basin',
          image: 'assets/productImages/furniture/C81232-1000-Cotton-White-Basin-Vanity-600mm-Chrome-Handles_1.webp',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-600mm-chrome-handles-c81232',
          path: '../../models/furniture/basin/C81232.glb',
          dimensions: { width: 61.5, height: 81.8, depth: 49.5 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C81232',
          price: '207.00',
          title: 'Milos Cotton White Basin Vanity 600mm - Chrome Handles'
        },
          {
              id: 'C81234',
              name: 'Oval Basin',
              image: 'assets/productImages/furniture/C81234-1000-Cotton-White-Vanity-Basin-600mm-Chrome-Handles_1.webp',
              link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-oval-basin-600mm-chrome-handles-c81234',
              path: '../../models/furniture/basin/C81234.glb',
              dimensions: { width: 60.9, height: 96.5, depth: 47.7 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              sku: 'C81234',
              price: '279.99',
              title: 'Milos Cotton White Vanity with Oval Basin 600mm - Chrome Handles'
          },
          {
              id: 'C81235',
              name: 'Troy Basin',
              image: 'assets/productImages/furniture/C81235-1000-Cotton-White-Vanity-Basin-600mm-Chrome-Handles_1.webp',
              link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-troy-basin-600mm-chrome-handles-c81235',
              path: '../../models/furniture/basin/C81235.glb',
              dimensions: { width: 60.9, height: 95.1, depth: 47.7 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              sku: 'C81235',
              price: '279.99',
              title: 'Milos Cotton White Vanity with Troy Basin 600mm - Chrome Handles'
          },
      ],
      variantType: 'Width Options',
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    {
          id: 'furniture_variant_12',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-oval-basin-500mm-brushed-handles-c81206',
          name: 'Milos Cotton White Vanity with Oval Basin 500mm - Brushed Handles',
          price: '191.00',
          image: 'assets/productImages/furniture/C81206-1000-Cotton-White-Vanity-Basin-500mm-Brushed-Handles_3.webp',
          variants: [
              {
                  id: 'C81206',
                  name: 'Oval Basin',
                  image: 'assets/productImages/furniture/C81206-1000-Cotton-White-Vanity-Basin-500mm-Brushed-Handles_3.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-oval-basin-500mm-brushed-handles-c81206',
                  path: '../../models/furniture/basin/C81206.glb',
                  dimensions: { width: 51, height: 96.5, depth: 42.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81206',
                  price: '191.00',
                  title: 'Milos Cotton White Vanity with Oval Basin 500mm - Brushed Handles'
              },
              {
                  id: 'C81207',
                  name: 'Mesa Basin',
                  image: 'assets/productImages/furniture/C81207-1000-Cotton-White-Vanity-Basin-500mm-Brushed-Handles_3.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-mesa-basin-500mm-brushed-handles-c81207',
                  path: '../../models/furniture/basin/C81207.glb',
                  dimensions: { width: 51, height: 97, depth: 46.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81207',
                  price: '239.99',
                  title: 'Milos Cotton White Vanity with Mesa Basin 500mm - Brushed Handles'
              },
              {
                  id: 'C81204',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C81204-1000-Cotton-White-Basin-Vanity-500mm-Brushed-Handles_3.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-500mm-brushed-handles-c81204',
                  path: '../../models/furniture/basin/C81204.glb',
                  dimensions: { width: 51.8, height: 81.8, depth: 42.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81204',
                  price: '219.99',
                  title: 'Milos Cotton White Basin Vanity 500mm - Brushed Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },

      {
          id: 'furniture_variant_13',
          link: 'https://www.bathroommountain.co.uk/bermuda-inky-blue-basin-vanity-600mm-c78439',
          name: 'Bermuda Inky Blue Basin Vanity 600mm',
          price: '225.00',
          image: 'assets/productImages/furniture/C78439-1000-Bermuda-Inky-Blue-Basin-Vanity-600mm.webp',
          variants: [
              {
                  id: 'C78439',
                  name: '600mm',
                  image: 'assets/productImages/furniture/C78439-1000-Bermuda-Inky-Blue-Basin-Vanity-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-inky-blue-basin-vanity-600mm-c78439',
                  path: '../../models/furniture/basin/C78439.glb',
                  dimensions: { width: 61.4, height: 84.1, depth: 51.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C78439',
                  price: '225',
                  title: 'Bermuda Inky Blue Basin Vanity 600mm'
              },
              {
                  id: 'C79848',
                  name: '400mm',
                  image: 'assets/productImages/furniture/c79848-1000-bermuda-inky-blue-cloakroom-basin-vanity-400mm.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-inky-blue-cloakroom-basin-vanity-400mm-c79848',
                  path: '../../models/furniture/basin/C79848.glb',
                  dimensions: { width: 40.4, height: 85.1, depth: 25.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C79848',
                  price: '189.99',
                  title: 'Bermuda Inky Blue Cloakroom Basin Vanity 400mm'
              },
              {
                  id: 'C79848',
                  name: '400mm',
                  image: 'assets/productImages/furniture/c79848-1000-bermuda-inky-blue-cloakroom-basin-vanity-400mm.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-inky-blue-cloakroom-basin-vanity-400mm-c79848',
                  path: '../../models/furniture/basin/C79848.glb',
                  dimensions: { width: 40.4, height: 85.1, depth: 25.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C79848',
                  price: '189.99',
                  title: 'Bermuda Inky Blue Cloakroom Basin Vanity 400mm'
              },
              {
                  id: 'C78620',
                  name: '800mm',
                  image: 'assets/productImages/furniture/c78620-1000-bermuda-inky-blue-basin-vanity-800mm.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-inky-blue-basin-vanity-800mm-c78620',
                  path: '../../models/furniture/basin/C78620.glb',
                  dimensions: { width: 80.5, height: 84.1, depth: 41 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C78620',
                  price: '287.00',
                  title: 'Bermuda Inky Blue Basin Vanity 800mm'
              },
              {
                  id: 'C78440',
                  name: '1200mm',
                  image: 'assets/productImages/furniture/C78440-1000-Bermuda-Inky-Blue-Double-Basin-Vanity-1200mm.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-inky-blue-double-basin-vanity-1200mm-c78440',
                  path: '../../models/furniture/basin/C78440.glb',
                  dimensions: { width: 121, height: 90.6, depth: 57.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C78440',
                  price: '499.00',
                  title: 'Bermuda Inky Blue Double Basin Vanity 1200mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },

      {
          id: 'furniture_variant_14',
          link: 'https://www.bathroommountain.co.uk/corsica-storm-grey-wall-hung-basin-drawer-vanity-600mm-c76246',
          name: 'Corsica Storm Grey Wall Hung Slimline Basin Drawer Vanity 600mm',
          price: '179.00',
          image: 'assets/productImages/furniture/c76246-1000-corsica-storm-grey-wall-hung-basin-drawer-vanity-600mm.webp',
          variants: [
              {
                  id: 'C76246',
                  name: '600mm Wall Hung',
                  image: 'assets/productImages/furniture/c76246-1000-corsica-storm-grey-wall-hung-basin-drawer-vanity-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-storm-grey-wall-hung-basin-drawer-vanity-600mm-c76246',
                  path: '../../models/furniture/basin/C76246.glb',
                  dimensions: { width: 60.4, height: 55, depth: 34.7 },
                  floorOffset: 30.1,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C76246',
                  price: '179',
                  title: 'Corsica Storm Grey Wall Hung Slimline Basin Drawer Vanity 600mm'
              },
              {
                  id: 'C76247',
                  name: '600mm Floorstanding',
                  image: 'assets/productImages/furniture/c76247-1000-corsica-storm-grey-basin-drawer-vanity-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-storm-grey-basin-drawer-vanity-600mm-c76247',
                  path: '../../models/furniture/basin/C76247.glb',
                  dimensions: { width: 60.4, height: 85, depth: 34.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C76247',
                  price: '219.00',
                  title: 'Corsica Storm Grey Slimline Basin Drawer Vanity 600mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },

      {
          id: 'furniture_variant_15',
          link: 'https://www.bathroommountain.co.uk/monaco-chalk-white-basin-vanity-600mm-c76328',
          name: 'Monaco Chalk White Basin Vanity 600mm',
          price: '299.99',
          image: 'assets/productImages/furniture/c76328-1000-chalk-white-basin-vanity-600mm.webp',
          variants: [
              {
                  id: 'C76328',
                  name: 'Chalk White',
                  image: 'assets/productImages/furniture/c76328-1000-chalk-white-basin-vanity-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-chalk-white-basin-vanity-600mm-c76328',
                  path: '../../models/furniture/basin/C76328.glb',
                  dimensions: { width: 60, height: 83.9, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76328',
                  price: '299.99',
                  title: 'Monaco Chalk White Basin Vanity 600mm'
              },
              {
                  id: 'C77683',
                  name: 'Dove Grey',
                  image: 'assets/productImages/furniture/c77683-1000-dove-grey-basin-vanity-600mm-gold-accents_1.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-dove-grey-basin-vanity-600mm-c77683',
                  path: '../../models/furniture/basin/C76283.glb',
                  dimensions: { width: 60, height: 83.9, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77683',
                  price: '299.99',
                  title: 'Monaco Dove Grey Basin Vanity 600mm'
              },
              {
                  id: 'C77732',
                  name: 'Graphite Grey',
                  image: 'assets/productImages/furniture/c77732-1000-graphite-grey-basin-vanity-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-graphite-grey-basin-vanity-600mm-c77732',
                  path: '../../models/furniture/basin/C77732.glb',
                  dimensions: { width: 60, height: 83.9, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77732',
                  price: '239.00',
                  title: 'Monaco Graphite Grey Basin Vanity 600mm'
              },
              {
                  id: 'C78377',
                  name: 'Inky Blue',
                  image: 'assets/productImages/furniture/c78377-1000-inky-blue-basin-vanity-600mm-accents.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-inky-blue-basin-vanity-600mm-c78377',
                  path: '../../models/furniture/basin/C78377.glb',
                  dimensions: { width: 60, height: 83.9, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78377',
                  price: '299.99',
                  title: 'Monaco Inky Blue Basin Vanity 600mm'
              },
              {
                  id: 'C78704',
                  name: 'Midnight Green',
                  image: 'assets/productImages/furniture/c78704-1000-monaco-topaz-green-basin-vanity-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-midnight-green-basin-vanity-600mm-c78704',
                  path: '../../models/furniture/basin/C78704.glb',
                  dimensions: { width: 60, height: 83.9, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78704',
                  price: '299.99',
                  title: 'Monaco Midnight Green Basin Vanity 600mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },

      {
          id: 'furniture_variant_16',
          link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-combination-vanity-basin-and-miami-toilet-1050mm-c79932',
          name: 'Quartz Gloss White Combination Vanity Basin and Denver Toilet 1050mm',
          price: '319.99',
          image: 'assets/productImages/furniture/C79932-1000-Gloss-White-Combination-Vanity-Basin-Toilet-1050mm_1.webp',
          variants: [
              {
                  id: 'C79932',
                  name: 'Denver Toilet',
                  image: 'assets/productImages/furniture/C79932-1000-Gloss-White-Combination-Vanity-Basin-Toilet-1050mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-combination-vanity-basin-and-miami-toilet-1050mm-c79932',
                  path: '../../models/furniture/basin/C79932.glb',
                  dimensions: { width: 103.3, height: 86.5, depth: 80.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79932',
                  price: '319.99',
                  title: 'Quartz Gloss White Combination Vanity Basin and Denver Toilet 1050mm'
              },
              {
                  id: 'C79930',
                  name: 'No Toilet & Cistern',
                  image: 'assets/productImages/furniture/C79930-1000-White-Basin-Vanity-Back-To-Wall-Toilet-Unit-1050mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-basin-vanity-and-back-to-wall-toilet-unit-1050mm-excludes-toilet-c79930',
                  path: '../../models/furniture/basin/C79930.glb',
                  dimensions: { width: 103.3, height: 86.2, depth: 42.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79930',
                  price: '219.99',
                  title: 'Quartz Gloss White Basin Vanity and Back To Wall Toilet Unit 1050mm - Excludes Toilet'
              },
              {
                  id: 'C79931',
                  name: 'Austin Toilet',
                  image: 'assets/productImages/furniture/C79931-1000-Gloss-White-Combination-Vanity-Basin-Toilet-1050mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-combination-vanity-basin-and-austin-toilet-1050mm-c79931',
                  path: '../../models/furniture/basin/C79931.glb',
                  dimensions: { width: 103.3, height: 86.4, depth: 82 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79931',
                  price: '289.99',
                  title: 'Quartz Gloss White Combination Vanity Basin and Austin Toilet 1050mm'
              },
              {
                  id: 'C79933',
                  name: 'Houston Toilet',
                  image: 'assets/productImages/furniture/c79933-1000-gloss-white-combination-vanity-basin-toilet-1050mm.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-combination-vanity-basin-and-houston-toilet-1050mm-c79933',
                  path: '../../models/furniture/basin/C79933.glb',
                  dimensions: { width: 103.3, height: 86.5, depth: 84.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79933',
                  price: '263.00',
                  title: 'Quartz Gloss White Combination Vanity Basin and Houston Toilet 1050mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },

      {
          id: 'furniture_variant_17',
          link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-cloakroom-floor-standing-basin-vanity-400mm-c79921',
          name: 'Quartz Gloss White Cloakroom Floor Standing Basin Vanity 400mm',
          price: '99.99',
          image: 'assets/productImages/furniture/C79921-1000-Gloss-White-Floor-Standing-Basin-Vanity-400mm_1.webp',
          variants: [
              {
                  id: 'C79921',
                  name: 'Floor Standing',
                  image: 'assets/productImages/furniture/C79921-1000-Gloss-White-Floor-Standing-Basin-Vanity-400mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-cloakroom-floor-standing-basin-vanity-400mm-c79921',
                  path: '../../models/furniture/basin/C79921.glb',
                  dimensions: { width: 40, height: 88, depth: 24.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79921',
                  price: '99.99',
                  title: 'Quartz Gloss White Cloakroom Floor Standing Basin Vanity 400mm'
              },
              {
                  id: 'C79920',
                  name: 'Wall Hung',
                  image: 'assets/productImages/furniture/C79920-1000-Gloss-White-Cloakroom-Wall-Hung-Basin-Vanity-400mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-cloakroom-wall-hung-basin-vanity-400mm-c79920',
                  path: '../../models/furniture/basin/C79920.glb',
                  dimensions: { width: 40, height: 57.8, depth: 24.2 },
                  floorOffset: 20,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79920',
                  price: '89.99',
                  title: 'Quartz Gloss White Cloakroom Wall Hung Basin Vanity 400mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_18',
          link: 'https://www.bathroommountain.co.uk/corsica-inky-blue-short-projection-basin-drawer-vanity-500mm-c79777',
          name: 'Corsica Inky Blue Slimline Basin Drawer Vanity 500mm',
          price: '269.99',
          image: 'assets/productImages/furniture/C79921-1000-Gloss-White-Floor-Standing-Basin-Vanity-400mm_1.webp',
          variants: [
              {
                  id: 'C79777',
                  name: 'Floor Standing',
                  image: 'assets/productImages/furniture/c79777-1000-inky-blue-basin-drawer-vanity-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-inky-blue-short-projection-basin-drawer-vanity-500mm-c79777',
                  path: '../../models/furniture/basin/C79777.glb',
                  dimensions: { width: 40, height: 57.8, depth: 24.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79777',
                  price: '269.99',
                  title: 'Corsica Inky Blue Slimline Basin Drawer Vanity 500mm'
              },
              {
                  id: 'C78548',
                  name: 'Wall Hung',
                  image: 'assets/productImages/furniture/c78548-1000-inky-blue-wall-hung-basin-drawer-vanity-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-inky-blue-wall-hung-short-projection-basin-drawer-vanity-500mm-c78548',
                  path: '../../models/furniture/basin/C78548.glb',
                  dimensions: { width: 50.4, height: 50.1, depth: 34.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78548',
                  price: '229.99',
                  title: 'Corsica Inky Blue Wall Hung Slimline Basin Drawer Vanity 500mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_19',
          link: 'https://www.bathroommountain.co.uk/avon-stone-grey-combination-vanity-basin-and-denver-toilet-1300mm',
          name: 'Avon Stone Grey Combination Vanity Basin and Miami Toilet 1300mm',
          price: '529.99',
          image: 'assets/productImages/furniture/C77185-1000-Stone-Grey-Combination-Vanity-Basin-Toilet-1300mm.webp',
          variants: [
              {
                  id: 'C77185',
                  name: 'Miami Toilet',
                  image: 'assets/productImages/furniture/C77185-1000-Stone-Grey-Combination-Vanity-Basin-Toilet-1300mm.webp',
                  link: 'https://www.bathroommountain.co.uk/avon-stone-grey-combination-vanity-basin-and-denver-toilet-1300mm',
                  path: '../../models/furniture/basin/C77185.glb',
                  dimensions: { width: 45.8, height: 85.1, depth: 34 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77185',
                  price: '529.99',
                  title: 'Avon Stone Grey Combination Vanity Basin and Miami Toilet 1300mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_20',
          link: 'https://www.bathroommountain.co.uk/austin-gloss-white-wall-hung-basin-drawer-vanity-600mm-c77065',
          name: 'Austin Gloss White Wall Hung Basin Drawer Vanity 600mm',
          price: '269.99',
          image: 'assets/productImages/furniture/C77065-1000-Gloss-White-Wall-Hung-Basin-Drawer_1.webp',
          variants: [
              {
                  id: 'C77065',
                  name: '600mm Width',
                  image: 'assets/productImages/furniture/C77065-1000-Gloss-White-Wall-Hung-Basin-Drawer_1.webp',
                  link: 'https://www.bathroommountain.co.uk/austin-gloss-white-wall-hung-basin-drawer-vanity-600mm-c77065',
                  path: '../../models/furniture/basin/C77065.glb',
                  dimensions: { width: 61.4, height: 60.4, depth: 39.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77065',
                  price: '269.99',
                  title: 'Austin Gloss White Wall Hung Basin Drawer Vanity 600mm'
              },
              {
                  id: 'C77064',
                  name: '500mm Width',
                  image: 'assets/productImages/furniture/C77064-1000-Gloss-White-Wall-Hung-Basin-Drawer_1.webp',
                  link: 'https://www.bathroommountain.co.uk/austin-gloss-white-wall-hung-basin-drawer-vanity-500mm-c77064',
                  path: '../../models/furniture/basin/C77064.glb',
                  dimensions: { width: 50.7, height: 60.4, depth: 39.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77064',
                  price: '185.00',
                  title: 'Austin Gloss White Wall Hung Basin Drawer Vanity 500mm'
              },
              {
                  id: 'C77066',
                  name: '800mm Width',
                  image: 'assets/productImages/furniture/C77066-1000-Gloss-White-Wall-Hung-Basin-Drawer-_1.webp',
                  link: 'https://www.bathroommountain.co.uk/austin-gloss-white-wall-hung-basin-drawer-vanity-800mm-c77066',
                  path: '../../models/furniture/basin/C77066.glb',
                  dimensions: { width: 80.9, height: 60.5, depth: 39.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77066',
                  price: '263.00',
                  title: 'Austin Gloss White Wall Hung Basin Drawer Vanity 800mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_21',
          link: 'https://www.bathroommountain.co.uk/avon-stone-grey-basin-vanity-600mm',
          name: 'Avon Stone Grey Basin Vanity 600mm',
          price: '209.99',
          image: 'assets/productImages/furniture/C76504-1000-Avon-Pebble-Grey-Basin-Vanity-600mm_1.webp',
          variants: [
              {
                  id: 'C76504',
                  name: '600mm Cabinet',
                  image: 'assets/productImages/furniture/C76504-1000-Avon-Pebble-Grey-Basin-Vanity-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/avon-stone-grey-basin-vanity-600mm',
                  path: '../../models/furniture/basin/C76504.glb',
                  dimensions: { width: 61.4, height: 85, depth: 42.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76504',
                  price: '209.99',
                  title: 'Avon Stone Grey Basin Vanity 600mm'
              },
              {
                  id: 'C76503',
                  name: '500mm Cabinet',
                  image: 'assets/productImages/furniture/C76503-1000-Avon-Pebble-Grey-Basin-Vanity-500mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/avon-stone-grey-basin-vanity-500mm',
                  path: '../../models/furniture/basin/C76503.glb',
                  dimensions: { width: 51.6, height: 85, depth: 42.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76503',
                  price: '159.00',
                  title: 'Avon Stone Grey Basin Vanity 500mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_22',
          link: 'https://www.bathroommountain.co.uk/quartz-pebble-grey-combination-vanity-basin-and-austin-toilet-1050mm-c76749',
          name: 'Quartz Stone Grey Combination Vanity Basin and Austin Toilet 1050mm',
          price: '339.99',
          image: 'assets/productImages/furniture/C76749-1000-Grey-Vanity-Basin-and-Austin-Toilet-1050mm_1.webp',
          variants: [
              {
                  id: 'C76749',
                  name: 'Austin Toilet',
                  image: 'assets/productImages/furniture/C76749-1000-Grey-Vanity-Basin-and-Austin-Toilet-1050mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-pebble-grey-combination-vanity-basin-and-austin-toilet-1050mm-c76749',
                  path: '../../models/furniture/basin/C76749.glb',
                  dimensions: { width: 104, height: 81.7, depth: 81.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76749',
                  price: '339.99',
                  title: 'Quartz Stone Grey Combination Vanity Basin and Austin Toilet 1050mm'
              },
              {
                  id: 'C76751',
                  name: 'Denver Toilet',
                  image: 'assets/productImages/furniture/C76751-1000-Grey-Vanity-Basin-and-Denver-Toilet-1050mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-stone-grey-combination-vanity-basin-and-denver-toilet-1050mm-c76751',
                  path: '../../models/furniture/basin/C76751.glb',
                  dimensions: { width: 104, height: 81.6, depth: 80.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76751',
                  price: '389.99',
                  title: 'Quartz Stone Grey Combination Vanity Basin and Denver Toilet 1050mm'
              },
              {
                  id: 'C77020',
                  name: 'No Toilet & Cistern',
                  image: 'assets/productImages/furniture/c77020-1000-pebble-grey-basin-vanity-and-back-to-wall-toilet-unit.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-stone-grey-basin-vanity-and-back-to-wall-toilet-unit-1050mm-c77020',
                  path: '../../models/furniture/basin/C77020.glb',
                  dimensions: { width: 104, height: 81.6, depth: 42.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77020',
                  price: '259.99',
                  title: 'Quartz Stone Grey Basin Vanity and Back To Wall Toilet Unit 1050mm'
              },
              {
                  id: 'C76750',
                  name: 'Seattle Toilet',
                  image: 'assets/productImages/furniture/C76750-1000-Grey-Vanity-Basin-and-Seattle-Toilet-1050mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-pebble-grey-combination-vanity-basin-and-seattle-toilet-1050mm-c76750',
                  path: '../../models/furniture/basin/C76750.glb',
                  dimensions: { width: 104, height: 81.6, depth: 80.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76750',
                  price: '369.99',
                  title: 'Quartz Stone Grey Combination Vanity Basin and Seattle Toilet 1050mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_23',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-800mm-brushed-handles-c81212',
          name: 'Milos Cotton White Basin Vanity 800mm - Brushed Handles',
          price: '299.99',
          image: 'assets/productImages/furniture/C81212-1000-Cotton-White-Basin-Vanity-800mm-Brushed-Handles_1.webp',
          variants: [
              {
                  id: 'C81212',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C81212-1000-Cotton-White-Basin-Vanity-800mm-Brushed-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-800mm-brushed-handles-c81212',
                  path: '../../models/furniture/basin/C81212.glb',
                  dimensions: { width: 82, height: 81.7, depth: 47.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81212',
                  price: '299.99',
                  title: 'Milos Cotton White Basin Vanity 800mm - Brushed Handles'
              },
              {
                  id: 'C81214',
                  name: 'Oval Basin',
                  image: 'assets/productImages/furniture/C81214-1000-Cotton-White-Vanity-Basin-800mm-Brushed-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-oval-basin-800mm-brushed-handles-c81214',
                  path: '../../models/furniture/basin/C81214.glb',
                  dimensions: { width: 81.1, height: 96.1, depth: 47.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81214',
                  price: '263.00',
                  title: 'Milos Cotton White Vanity with Oval Basin 800mm - Brushed Handles'
              },
              {
                  id: 'C81215',
                  name: 'Troy Basin',
                  image: 'assets/productImages/furniture/c77020-1000-pebble-grey-basin-vanity-and-back-to-wall-toilet-unit.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-troy-basin-800mm-brushed-handles-c81215',
                  path: '../../models/furniture/basin/C81215.glb',
                  dimensions: { width: 81.1, height: 95.1, depth: 47.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81215',
                  price: '329.99',
                  title: 'Milos Cotton White Vanity with Troy Basin 800mm - Brushed Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_24',
          link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-basin-vanity-600mm-c79697',
          name: 'Mersey Gloss White Basin Vanity 600mm',
          price: '189.99',
          image: 'assets/productImages/furniture/C79697-1000-Mersey-Gloss-White-Basin-Vanity-600mm_1.webp',
          variants: [
              {
                  id: 'C79697',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C79697-1000-Mersey-Gloss-White-Basin-Vanity-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-basin-vanity-600mm-c79697',
                  path: '../../models/furniture/basin/C79697.glb',
                  dimensions: { width: 61.5, height: 81.8, depth: 48.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79697',
                  price: '189.99',
                  title: 'Mersey Gloss White Basin Vanity 600mm'
              },
              {
                  id: 'C81184',
                  name: 'Oval Basin',
                  image: 'assets/productImages/furniture/C81184-1000-Mersey-Gloss-White-Vanity-with-Oval-Basin-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-vanity-with-oval-basin-600mm-c81184',
                  path: '../../models/furniture/basin/C81184.glb',
                  dimensions: { width: 61, height: 95.1, depth: 48.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81184',
                  price: '199.99',
                  title: 'Mersey Gloss White Vanity with Oval Basin 600mm'
              },
              {
                  id: 'C81185',
                  name: 'Troy Basin',
                  image: 'assets/productImages/furniture/C81185-1000-Mersey-Gloss-White-Vanity-with-Troy-Basin-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-vanity-with-troy-basin-600mm-c81185',
                  path: '../../models/furniture/basin/C81185.glb',
                  dimensions: { width: 61.1, height: 95.1, depth: 48.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81185',
                  price: '199.99',
                  title: 'Mersey Gloss White Vanity with Troy Basin 600mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_25',
          link: 'https://www.bathroommountain.co.uk/capri-navy-blue-combination-vanity-basin-and-miami-toilet-1050mm-chrome-handles-c81113',
          name: 'Capri Navy Blue Combination Vanity Basin and Denver Toilet 1050mm - Chrome Handles',
          price: '189.99',
          image: 'assets/productImages/furniture/c81113-1000-navy-blue-combination-vanity-basin-toilet-1050mm.webp',
          variants: [
              {
                  id: 'C81113',
                  name: 'Denver Toilet',
                  image: 'assets/productImages/furniture/c81113-1000-navy-blue-combination-vanity-basin-toilet-1050mm.webp',
                  link: 'https://www.bathroommountain.co.uk/capri-navy-blue-combination-vanity-basin-and-miami-toilet-1050mm-chrome-handles-c81113',
                  path: '../../models/furniture/basin/C81113.glb',
                  dimensions: { width: 61, height: 81.6, depth: 48.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81113',
                  price: '375.00',
                  title: 'Capri Navy Blue Combination Vanity Basin and Denver Toilet 1050mm - Chrome Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_26',
          link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-vanity-with-semi-recessed-basin-550mm-c79923',
          name: 'Quartz Gloss White Vanity with Semi Recessed Basin 550mm',
          price: '124.99',
          image: 'assets/productImages/furniture/C79923-1000-Gloss-White-Vanity-Semi-Recessed-Basin-550mm_1.webp',
          variants: [
              {
                  id: 'C79923',
                  name: '550mm',
                  image: 'assets/productImages/furniture/C79923-1000-Gloss-White-Vanity-Semi-Recessed-Basin-550mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-vanity-with-semi-recessed-basin-550mm-c79923',
                  path: '../../models/furniture/basin/C79923.glb',
                  dimensions: { width: 54.8, height: 86.2, depth: 42.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79923',
                  price: '124.99',
                  title: 'Quartz Gloss White Vanity with Semi Recessed Basin 550mm'
              },
              {
                  id: 'C79922',
                  name: '450mm',
                  image: 'assets/productImages/furniture/C79922-1000-Gloss-White-Vanity-Semi-Recessed-Basin-450mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-cloakroom-vanity-with-semi-recessed-basin-450mm-c79922',
                  path: '../../models/furniture/basin/C79922.glb',
                  dimensions: { width: 44.8, height: 83.5, depth: 44.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79922',
                  price: '119.99',
                  title: 'Quartz Gloss White Cloakroom Vanity with Semi Recessed Basin 450mm'
              },
              {
                  id: 'C79924',
                  name: '650mm',
                  image: 'assets/productImages/furniture/C79924-1000-Gloss-White-Vanity-Semi-Recessed-Basin-650mm.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-gloss-white-vanity-with-semi-recessed-basin-650mm-c79924',
                  path: '../../models/furniture/basin/C79924.glb',
                  dimensions: { width: 64.3, height: 85.6, depth: 43.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79924',
                  price: '149.99',
                  title: 'Quartz Gloss White Vanity with Semi Recessed Basin 650mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_27',
          link: 'https://www.bathroommountain.co.uk/quartz-stone-grey-combination-vanity-basin-and-austin-toilet-1150mm-c76752',
          name: 'Quartz Stone Grey Combination Vanity Basin and Austin Toilet 1150mm',
          price: '289.00',
          image: 'assets/productImages/furniture/C76752-1000-Grey-Vanity-Basin-and-Austin-Toilet-1150mm_1.webp',
          variants: [
              {
                  id: 'C76752',
                  name: 'Austin Toilet',
                  image: 'assets/productImages/furniture/C76752-1000-Grey-Vanity-Basin-and-Austin-Toilet-1150mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-stone-grey-combination-vanity-basin-and-austin-toilet-1150mm-c76752',
                  path: '../../models/furniture/basin/C76752.glb',
                  dimensions: { width: 112.6, height: 82, depth: 82.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76752',
                  price: '289.00',
                  title: 'Quartz Stone Grey Combination Vanity Basin and Austin Toilet 1150mm'
              },
              {
                  id: 'C76754',
                  name: 'Denver Toilet',
                  image: 'assets/productImages/furniture/C76754-1000-Grey-Vanity-Basin-and-Denver-Toilet-1150mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-stone-grey-combination-vanity-basin-and-denver-toilet-1150mm-c76754',
                  path: '../../models/furniture/basin/C76754.glb',
                  dimensions: { width: 112.6, height: 82, depth: 81.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76754',
                  price: '335.00',
                  title: 'Quartz Stone Grey Combination Vanity Basin and Denver Toilet 1150mm'
              },
              {
                  id: 'C77021',
                  name: 'No Toilet & Cistern',
                  image: 'assets/productImages/furniture/C77021-1000-Pebble-Grey-Basin-Vanity-and-Back-To-Wall-Toilet-Unit_2.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-stone-grey-basin-vanity-and-back-to-wall-toilet-unit-1150mm-c77021',
                  path: '../../models/furniture/basin/C77021.glb',
                  dimensions: { width: 112.6, height: 81.7, depth: 43.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77021',
                  price: '289.99',
                  title: 'Quartz Stone Grey Basin Vanity and Back To Wall Toilet Unit 1150mm'
              },
              {
                  id: 'C76753',
                  name: 'Seattle Toilet',
                  image: 'assets/productImages/furniture/C76753-1000-Grey-Vanity-Basin-and-Seattle-Toilet-1150mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/quartz-pebble-grey-combination-vanity-basin-and-seattle-toilet-1150mm-c76753',
                  path: '../../models/furniture/basin/C76753.glb',
                  dimensions: { width: 112.6, height: 81.7, depth: 81.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76753',
                  price: '399.99',
                  title: 'Quartz Stone Grey Combination Vanity Basin and Seattle Toilet 1150mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_28',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-basin-drawer-vanity-600mm-c81581',
          name: 'Corsica Gloss White Basin Drawer Vanity 600mm',
          price: '263.00',
          image: 'assets/productImages/furniture/C81581-1000-Gloss-White-Basin-Drawer-Vanity-600mm_1.webp',
          variants: [
              {
                  id: 'C81581',
                  name: 'Build-in Basin',
                  image: 'assets/productImages/furniture/C81581-1000-Gloss-White-Basin-Drawer-Vanity-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-basin-drawer-vanity-600mm-c81581',
                  path: '../../models/furniture/basin/C81581.glb',
                  dimensions: { width: 61.3, height: 86.6, depth: 46.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81581',
                  price: '263.00',
                  title: 'Corsica Gloss White Basin Drawer Vanity 600mm'
              },
              {
                  id: 'C81584',
                  name: 'Curved Basin',
                  image: 'assets/productImages/furniture/C81584-1000-White-Vanity-Drawer-Marble-Top-Basin-600mm_2.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-vanity-drawer-with-marble-top-curved-counter-top-basin-600mm-c81584',
                  path: '../../models/furniture/basin/C81584.glb',
                  dimensions: { width: 60, height: 113.3, depth: 45.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81584',
                  price: '379.99',
                  title: 'Corsica Gloss White Vanity Drawer with Marble Top & Curved Counter Top Basin 600mm'
              },
              {
                  id: 'C81585',
                  name: 'Marin Basin',
                  image: 'assets/productImages/furniture/C81585-1000-Gloss-White-Vanity-Drawer-Marble-Top-Basin-600mm_2.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-vanity-drawer-with-marble-top-marin-basin-600mm-c81585',
                  path: '../../models/furniture/basin/C81585.glb',
                  dimensions: { width: 60, height: 113.3, depth: 45.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81585',
                  price: '389.99',
                  title: 'Corsica Gloss White Vanity Drawer with Marble Top & Marin Basin 600mm'
              },
              {
                  id: 'C81582',
                  name: 'No Basin',
                  image: 'assets/productImages/furniture/C81582-1000-White-Drawer-Vanity-Marble-600mm-Excludes-Basin_2.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-drawer-vanity-with-marble-top-600mm-excludes-counter-top-basin-c81582',
                  path: '../../models/furniture/basin/C81582.glb',
                  dimensions: { width: 60, height: 113.3, depth: 45.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81582',
                  price: '349.99',
                  title: 'Corsica Gloss White Drawer Vanity with Marble Top 600mm - Excludes Counter Top Basin'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_29',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-combination-vanity-basin-and-miami-toilet-1100mm-chrome-handles-c81246',
          name: 'Milos Cotton White Combination Vanity Basin and Denver Toilet 1100mm - Chrome Handles',
          price: '519.99',
          image: 'assets/productImages/furniture/C81246-1000-White-Combination-Vanity-Basin-Toilet-1100mm.webp',
          variants: [
              {
                  id: 'C81246',
                  name: 'Denver Toilet',
                  image: 'assets/productImages/furniture/C81246-1000-White-Combination-Vanity-Basin-Toilet-1100mm.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-combination-vanity-basin-and-miami-toilet-1100mm-chrome-handles-c81246',
                  path: '../../models/furniture/basin/C81246.glb',
                  dimensions: { width: 101.2, height: 81.8, depth: 75.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81246',
                  price: '519.99',
                  title: 'Milos Cotton White Combination Vanity Basin and Denver Toilet 1100mm - Chrome Handles'
              },
              {
                  id: 'C81247',
                  name: 'Houston Toilet',
                  image: 'assets/productImages/furniture/c81247-1000-white-combination-vanity-basin-toilet-1100mm.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-combination-vanity-basin-and-houston-toilet-1100mm-chrome-handles-c81247',
                  path: '../../models/furniture/basin/C81247.glb',
                  dimensions: { width: 101.2, height: 81.8, depth: 78.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81247',
                  price: '431.00',
                  title: 'Milos Cotton White Combination Vanity Basin and Houston Toilet 1100mm - Chrome Handles'
              },
              {
                  id: 'C81245',
                  name: 'Austin Toilet',
                  image: 'assets/productImages/furniture/C81245-1000-White-Combination-Vanity-Basin-Toilet-1100mm.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-combination-vanity-basin-and-austin-toilet-1100mm-chrome-handles-c81245',
                  path: '../../models/furniture/basin/C81245.glb',
                  dimensions: { width: 101.2, height: 81.8, depth: 76.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81245',
                  price: '499.99',
                  title: 'Milos Cotton White Combination Vanity Basin and Austin Toilet 1100mm - Chrome Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_30',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-mesa-basin-500mm-chrome-handles-c81231',
          name: 'Milos Cotton White Vanity with Mesa Basin 500mm - Chrome Handles',
          price: '519.99',
          image: 'assets/productImages/furniture/C81231-1000-Cotton-White-Vanity-Basin-500mm-Chrome-Handles_1.webp',
          variants: [
              {
                  id: 'C81231',
                  name: 'Mesa Basin',
                  image: 'assets/productImages/furniture/C81231-1000-Cotton-White-Vanity-Basin-500mm-Chrome-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-mesa-basin-500mm-chrome-handles-c81231',
                  path: '../../models/furniture/basin/C81231.glb',
                  dimensions: { width: 51, height: 97, depth: 46.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81231',
                  price: '191.99',
                  title: 'Milos Cotton White Vanity with Mesa Basin 500mm - Chrome Handles'
              },
              {
                  id: 'C81228',
                  name: 'Build-in Basin',
                  image: 'assets/productImages/furniture/C81228-1000-Cotton-White-Basin-Vanity-500mm-Chrome-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-500mm-chrome-handles-c81228',
                  path: '../../models/furniture/basin/C81228.glb',
                  dimensions: { width: 51.8, height: 81.8, depth: 42.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81228',
                  price: '175.00',
                  title: 'Milos Cotton White Basin Vanity 500mm - Chrome Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_31',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-600mm-brushed-handles-c81208',
          name: 'Milos Cotton White Basin Vanity 600mm - Brushed Handles',
          price: '259.99',
          image: 'assets/productImages/furniture/C81208-1000-Cotton-White-Basin-Vanity-600mm-Brushed-Handles_3.webp',
          variants: [
              {
                  id: 'C81208',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C81208-1000-Cotton-White-Basin-Vanity-600mm-Brushed-Handles_3.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-600mm-brushed-handles-c81208',
                  path: '../../models/furniture/basin/C81208.glb',
                  dimensions: { width: 61.5, height: 81.8, depth: 47.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81208',
                  price: '259.99',
                  title: 'Milos Cotton White Basin Vanity 600mm - Brushed Handles'
              },
              {
                  id: 'C81210',
                  name: 'Oval Basin',
                  image: 'assets/productImages/furniture/C81210-1000-Cotton-White-Vanity-Basin-600mm-Brushed-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-oval-basin-600mm-brushed-handles-c81210',
                  path: '../../models/furniture/basin/C81210.glb',
                  dimensions: { width: 60.9, height: 96.5, depth: 47.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81210',
                  price: '223.00',
                  title: 'Milos Cotton White Vanity with Oval Basin 600mm - Brushed Handles'
              },
              {
                  id: 'C81211',
                  name: 'Troy Basin',
                  image: 'assets/productImages/furniture/C81211-1000-Cotton-White-Vanity-Basin-600mm-Brushed-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-troy-basin-600mm-brushed-handles-c81211',
                  path: '../../models/furniture/basin/C81211.glb',
                  dimensions: { width: 60.9, height: 95.1, depth: 47.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81211',
                  price: '279.99',
                  title: 'Milos Cotton White Vanity with Troy Basin 600mm - Brushed Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_32',
          link: 'https://www.bathroommountain.co.uk/harper-charcoal-elm-vanity-with-semi-recessed-basin-500mm',
          name: 'Harper Charcoal Elm Vanity with Semi Recessed Basin 500mm',
          price: '179.00',
          image: 'assets/productImages/furniture/c77479-1000-harper-charcoal-elm-vanity-with-semi-recessed-basin-500mm.webp',
          variants: [
              {
                  id: 'C77479',
                  name: 'Charcoal Elm',
                  image: 'assets/productImages/furniture/c77479-1000-harper-charcoal-elm-vanity-with-semi-recessed-basin-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/harper-charcoal-elm-vanity-with-semi-recessed-basin-500mm',
                  path: '../../models/furniture/basin/C77479.glb',
                  dimensions: { width: 50.1, height: 83.6, depth: 30 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77479',
                  price: '179.00',
                  title: 'Harper Charcoal Elm Vanity with Semi Recessed Basin 500mm'
              },
              {
                  id: 'C79614',
                  name: 'Navy Blue',
                  image: 'assets/productImages/furniture/C79614-1000-Navy-Blue-Vanity-Semi-Recessed-Basin-500mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/harper-navy-blue-vanity-with-semi-recessed-basin-500mm-c79614',
                  path: '../../models/furniture/basin/C79614.glb',
                  dimensions: { width: 50.1, height: 83.6, depth: 30 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79614',
                  price: '239.99',
                  title: 'Harper Navy Blue Vanity with Semi Recessed Basin 500mm'
              },
              {
                  id: 'C77016',
                  name: 'Stone Grey',
                  image: 'assets/productImages/furniture/C77016-1000-Pebble-Grey-Vanity-with-Semi-Recessed-Basin-500mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/harper-pebble-grey-vanity-with-semi-recessed-basin-marble-top-500mm-c77016',
                  path: '../../models/furniture/basin/C77016.glb',
                  dimensions: { width: 50, height: 83.6, depth: 30 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77016',
                  price: '239.99',
                  title: 'Harper Stone Grey Vanity with Semi Recessed Basin 500mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_33',
          link: 'https://www.bathroommountain.co.uk/ohio-gloss-white-2-in-1-combined-wash-basin-denver-toilet-500mm-c78423',
          name: 'Ohio Gloss White 2-In-1 Combined Wash Basin & Denver Toilet 500mm',
          price: '271.99',
          image: 'assets/productImages/furniture/C78423-1000-Gloss-White-2-In-1-Combined-Wash-Basin-Toilet-500mm.webp',
          variants: [
              {
                  id: 'C78423',
                  name: 'Denver Toilet',
                  image: 'assets/productImages/furniture/C78423-1000-Gloss-White-2-In-1-Combined-Wash-Basin-Toilet-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/ohio-gloss-white-2-in-1-combined-wash-basin-denver-toilet-500mm-c78423',
                  path: '../../models/furniture/basin/C78423.glb',
                  dimensions: { width: 50.6, height: 89, depth: 85.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78423',
                  price: '271.99',
                  title: 'Ohio Gloss White 2-In-1 Combined Wash Basin & Denver Toilet 500mm'
              },
              {
                  id: 'C78424',
                  name: 'Atlanta Toilet',
                  image: 'assets/productImages/furniture/C78424-1000-Gloss-White-2-In-1-Combined-Wash-Basin-Toilet-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/ohio-gloss-white-2-in-1-combined-wash-basin-atlanta-toilet-500mm-c78424',
                  path: '../../models/furniture/basin/C78424.glb',
                  dimensions: { width: 50.6, height: 89, depth: 85.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78424',
                  price: '287.00',
                  title: 'Ohio Gloss White 2-In-1 Combined Wash Basin & Atlanta Toilet 500mm'
              },
              {
                  id: 'C78421',
                  name: 'Austin Toilet',
                  image: 'assets/productImages/furniture/C78421-1000-Gloss-White-2-In-1-Combined-Wash-Basin-Toilet-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/ohio-gloss-white-2-in-1-combined-wash-basin-austin-toilet-500mm-c78421',
                  path: '../../models/furniture/basin/C78421.glb',
                  dimensions: { width: 50.6, height: 89, depth: 87 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78421',
                  price: '239.99',
                  title: 'Ohio Gloss White 2-In-1 Combined Wash Basin & Austin Toilet 500mm'
              },
              {
                  id: 'C78420',
                  name: 'No Toilet',
                  image: 'assets/productImages/furniture/C78420-1000-White-2-In-1-Combined-Wash-Basin-Back-To-Wall-Unit_3.webp',
                  link: 'https://www.bathroommountain.co.uk/ohio-gloss-white-2-in-1-combined-wash-basin-back-to-wall-unit-500mm-c78420',
                  path: '../../models/furniture/basin/C78420.glb',
                  dimensions: { width: 50.6, height: 89, depth: 36 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78420',
                  price: '151.99',
                  title: 'Ohio Gloss White 2-In-1 Combined Wash Basin & Back To Wall Unit 500mm'
              },
              {
                  id: 'C78422',
                  name: 'Seattle Toilet',
                  image: 'assets/productImages/furniture/C78422-1000-Gloss-White-2-In-1-Combined-Wash-Basin-Toilet-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/ohio-gloss-white-2-in-1-combined-wash-basin-seattle-toilet-500mm-c78422',
                  path: '../../models/furniture/basin/C78422.glb',
                  dimensions: { width: 50.6, height: 89, depth: 86.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78422',
                  price: '319.99',
                  title: 'Ohio Gloss White 2-In-1 Combined Wash Basin & Seattle Toilet 500mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_34',
          link: 'https://www.bathroommountain.co.uk/monaco-inky-blue-combination-vanity-basin-with-marble-top-and-boston-v2-toilet-1500mm-c78397',
          name: 'Monaco Inky Blue Combination Vanity Basin with Marble Top and Boston Toilet 1500mm',
          price: '999.99',
          image: 'assets/productImages/furniture/C78397-1000-Inky-Blue-Vanity-Basin-Marble-Top-Toilet-1500mm.webp',
          variants: [
              {
                  id: 'C78397',
                  name: 'Boston Toilet',
                  image: 'assets/productImages/furniture/C78397-1000-Inky-Blue-Vanity-Basin-Marble-Top-Toilet-1500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-inky-blue-combination-vanity-basin-with-marble-top-and-boston-v2-toilet-1500mm-c78397',
                  path: '../../models/furniture/basin/C78397.glb',
                  dimensions: { width: 150.2, height: 95.5, depth: 85.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78397',
                  price: '999.99',
                  title: 'Monaco Inky Blue Combination Vanity Basin with Marble Top and Boston Toilet 1500mm'
              },
              {
                  id: 'C78396',
                  name: 'Hudson Toilet With Wooden Seat',
                  image: 'assets/productImages/furniture/c78396-1000-inky-blue-vanity-basin-top-toilet-wooden-1500mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-inky-blue-combination-vanity-basin-with-marble-top-and-hudson-toilet-with-wooden-seat-1500mm-c78396',
                  path: '../../models/furniture/basin/C78396.glb',
                  dimensions: { width: 150.1, height: 95.1, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78396',
                  price: '799.00',
                  title: 'Monaco Inky Blue Combination Vanity Basin with Marble Top and Hudson Toilet with Wooden Seat 1500mm'
              },
              {
                  id: 'C78393',
                  name: 'No Toilet',
                  image: 'assets/productImages/furniture/c78393-1000-inky-blue-vanity-basin-marble-top-1500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-inky-blue-combination-vanity-basin-with-marble-top-1500mm-excludes-pan-cistern-c78393',
                  path: '../../models/furniture/basin/C78393.glb',
                  dimensions: { width: 150.2, height: 95.5, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78393',
                  price: '695.99',
                  title: 'Monaco Inky Blue Combination Vanity Basin with Marble Top 1500mm (Excludes Pan & Cistern)'
              },
              {
                  id: 'C78394',
                  name: 'Seattle Toilet',
                  image: 'assets/productImages/furniture/C78394-1000-Inky-Blue-Vanity-Basin-Marble-Top-Toilet-1500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/monaco-inky-blue-combination-vanity-basin-with-marble-top-and-seattle-toilet-1500mm-c78394',
                  path: '../../models/furniture/basin/C78394.glb',
                  dimensions: { width: 150.2, height: 95.5, depth: 82.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C78394',
                  price: '949.99',
                  title: 'Monaco Inky Blue Combination Vanity Basin with Marble Top and Seattle Toilet 1500mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_35',
          link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-vanity-with-marble-top-curved-counter-top-basin-800mm-c77098',
          name: 'Bermuda Chalk White Vanity with Marble Top & Curved Counter Top Basin 800mm',
          price: '367.00',
          image: 'assets/productImages/furniture/C77098-1000-Chalk-White-Vanity-with-Marble-Top-and-Counter-Top-Basin-800mm_2.webp',
          variants: [
              {
                  id: 'C77098',
                  name: 'Boston Toilet',
                  image: 'assets/productImages/furniture/C77098-1000-Chalk-White-Vanity-with-Marble-Top-and-Counter-Top-Basin-800mm_2.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-vanity-with-marble-top-curved-counter-top-basin-800mm-c77098',
                  path: '../../models/furniture/basin/C77098.glb',
                  dimensions: { width: 81, height: 113.1, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77098',
                  price: '367.00',
                  title: 'Bermuda Chalk White Vanity with Marble Top & Curved Counter Top Basin 800mm'
              },
              {
                  id: 'C77635',
                  name: 'No Basin',
                  image: 'assets/productImages/furniture/c77635-1000-chalk-white-cabinet-with-marble-top-exclude-counter-top-basin.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-cabinet-with-marble-top-800mm-exclude-counter-top-basin-c77635',
                  path: '../../models/furniture/basin/C77635.glb',
                  dimensions: { width: 81.1, height: 81.8, depth: 41.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77635',
                  price: '335.99',
                  title: 'Bermuda Chalk White Cabinet with Marble Top 800mm - Excludes Counter Top Basin'
              },
              {
                  id: 'C77097',
                  name: 'Oval Basin',
                  image: 'assets/productImages/furniture/C77097-1000-Chalk-White-Vanity-with-Marble-Top-and-Counter-Top-Basin-800mm_2.webp',
                  link: 'https://www.bathroommountain.co.uk/bermuda-chalk-white-vanity-with-marble-top-oval-counter-top-basin-800mm-c77097',
                  path: '../../models/furniture/basin/C77097.glb',
                  dimensions: { width: 81, height: 113.1, depth: 43 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77097',
                  price: '449.99',
                  title: 'Bermuda Chalk White Vanity with Marble Top & Oval Counter Top Basin 800mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_36',
          link: 'https://www.bathroommountain.co.uk/corsica-storm-grey-wall-hung-basin-drawer-vanity-500mm-c76244',
          name: 'Corsica Storm Grey Wall Hung Slimline Basin Drawer Vanity 500mm',
          price: '229.99',
          image: 'assets/productImages/furniture/c76244-1000-corsica-storm-grey-wall-hung-basin-drawer-vanity-500mm.webp',
          variants: [
              {
                  id: 'C76244',
                  name: '500mm Wall Hung',
                  image: 'assets/productImages/furniture/c76244-1000-corsica-storm-grey-wall-hung-basin-drawer-vanity-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-storm-grey-wall-hung-basin-drawer-vanity-500mm-c76244',
                  path: '../../models/furniture/basin/C76244.glb',
                  dimensions: { width: 50.4, height: 50.1, depth: 34.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C77098',
                  price: '229.99',
                  title: 'Corsica Storm Grey Wall Hung Slimline Basin Drawer Vanity 500mm'
              },
              {
                  id: 'C76245',
                  name: '500mm Floorstanding',
                  image: 'assets/productImages/furniture/c76245-1000-corsica-storm-grey-basin-drawer-vanity-500mm.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-storm-grey-short-projection-basin-drawer-vanity-500mm',
                  path: '../../models/furniture/basin/C76245.glb',
                  dimensions: { width: 50.4, height: 85, depth: 34.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76245',
                  price: '199.00',
                  title: 'Corsica Storm Grey Slimline Basin Drawer Vanity 500mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_37',
          link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-double-vanity-with-marble-top-undermount-basins-1200mm-c76359v2',
          name: 'Lucia Chalk White Double Vanity with Marble Top & Undermount Basins 1200mm',
          price: '791.00',
          image: 'assets/productImages/furniture/C76350V2-1000-White-Vanity-Marble-Top-Undermount-Basin-630mm_5.webp',
          variants: [
              {
                  id: 'C76359V2',
                  name: '1200mm',
                  image: 'assets/productImages/furniture/C76359V2-1000-White-Vanity-Marble-Top-Undermount-Basins-1200mm.webp',
                  link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-double-vanity-with-marble-top-undermount-basins-1200mm-c76359v2',
                  path: '../../models/furniture/basin/C76359V2.glb',
                  dimensions: { width: 122.2, height: 91.6, depth: 47.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76359V2',
                  price: '791.00',
                  title: 'Lucia Chalk White Double Vanity with Marble Top & Undermount Basins 1200mm'
              },
              {
                  id: 'C76350V2',
                  name: '630mm',
                  image: 'assets/productImages/furniture/C76350V2-1000-White-Vanity-Marble-Top-Undermount-Basin-630mm_5.webp',
                  link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-marble-top-undermount-basin-630mm-c76350v2',
                  path: '../../models/furniture/basin/C76350V2.glb',
                  dimensions: { width: 63.4, height: 91.6, depth: 47.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76350V2',
                  price: '455.00',
                  title: 'Lucia Chalk White Vanity with Marble Top & Undermount Basin 630mm'
              },

              {
                  id: 'C76355V2',
                  name: '830mm',
                  image: 'assets/productImages/furniture/c76355v2-1000-white-vanity-marble-top-undermount-basin-830mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/lucia-chalk-white-vanity-with-marble-top-undermount-basin-830mm-c76355v2',
                  path: '../../models/furniture/basin/C76355V2.glb',
                  dimensions: { width: 83.1, height: 91.6, depth: 47.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C76355V2',
                  price: '519.00',
                  title: 'Lucia Chalk White Vanity with Marble Top & Undermount Basin 830mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_38',
          link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-basin-vanity-500mm-c79696',
          name: 'Mersey Gloss White Basin Vanity 500mm',
          price: '159.99',
          image: 'assets/productImages/furniture/C79696-1000-Mersey-Gloss-White-Basin-Vanity-500mm_1.webp',
          variants: [
              {
                  id: 'C79696',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C79696-1000-Mersey-Gloss-White-Basin-Vanity-500mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-basin-vanity-500mm-c79696',
                  path: '../../models/furniture/basin/C79696.glb',
                  dimensions: { width: 51.8, height: 82.1, depth: 44 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79696',
                  price: '159.99',
                  title: 'Mersey Gloss White Basin Vanity 500mm'
              },
              {
                  id: 'C79944',
                  name: 'Mesa Basin',
                  image: 'assets/productImages/furniture/C79944-1000-Mersey-Gloss-White-Vanity-with-Mesa-Basin-500mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-vanity-with-mesa-basin-500mm-c79944',
                  path: '../../models/furniture/basin/C79944.glb',
                  dimensions: { width: 51, height: 96.7, depth: 41.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79944',
                  price: '179.99',
                  title: 'Mersey Gloss White Vanity with Mesa Basin 500mm'
              },

              {
                  id: 'C79925',
                  name: 'No Basin',
                  image: 'assets/productImages/furniture/C79925-1000-Gloss-White-Vanity-Excludes-Counter-Top-Basin.webp',
                  link: 'https://www.bathroommountain.co.uk/mersey-gloss-white-vanity-500mm-excludes-counter-top-basin-c79925',
                  path: '../../models/furniture/basin/C79925.glb',
                  dimensions: { width: 51, height: 81.9, depth: 41.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79925',
                  price: '149.99',
                  title: 'Mersey Gloss White Vanity 500mm - Excludes Counter Top Basin'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_39',
          link: 'https://www.bathroommountain.co.uk/crete-fluted-linen-white-wall-hung-basin-drawer-vanity-800mm-c79823',
          name: 'Crete Fluted Linen White Wall Hung Basin Drawer Vanity 800mm',
          price: '159.99',
          image: 'assets/productImages/furniture/c79823-1000-linen-white-wall-hung-basin-drawer-vanity-800mm.webp',
          variants: [
              {
                  id: 'C79823',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/c79823-1000-linen-white-wall-hung-basin-drawer-vanity-800mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-linen-white-wall-hung-basin-drawer-vanity-800mm-c79823',
                  path: '../../models/furniture/basin/C79823.glb',
                  dimensions: { width: 81.3, height: 57, depth: 46.5 },
                  floorOffset: 24.7,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79823',
                  price: '351.00',
                  title: 'Crete Fluted Linen White Wall Hung Basin Drawer Vanity 800mm'
              },
              {
                  id: 'C79827',
                  name: 'Cody Basin',
                  image: 'assets/productImages/furniture/c79827-1000-linen-white-wall-hung-drawer-vanity-basin-800mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-linen-white-wall-hung-drawer-vanity-with-marble-top-cody-basin-800mm-c79827',
                  path: '../../models/furniture/basin/C79827.glb',
                  dimensions: { width: 81, height: 64.8, depth: 45.5 },
                  floorOffset: 27.9,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79827',
                  price: '509.99',
                  title: 'Crete Fluted Linen White Wall Hung Drawer Vanity with Marble Top & Cody Basin 800mm'
              },
              {
                  id: 'C79825',
                  name: 'Curved Basin',
                  image: 'assets/productImages/furniture/c79825-1000-white-wall-hung-anity-marble-top-basin-800mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-linen-white-wall-hung-drawer-vanity-with-marble-top-curved-basin-800mm-c79825',
                  path: '../../models/furniture/basin/C79825.glb',
                  dimensions: { width: 81, height: 67.2, depth: 45.2 },
                  floorOffset: 27.7,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79825',
                  price: '499.99',
                  title: 'Crete Fluted Linen White Wall Hung Drawer Vanity with Marble Top & Curved Basin 800mm'
              },
              {
                  id: 'C79826',
                  name: 'Marin Basin',
                  image: 'assets/productImages/furniture/c79826-1000-linen-white-wall-hung-drawer-vanity-basin-800mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-linen-white-wall-hung-drawer-vanity-with-marble-top-marin-basin-800mm-c79826',
                  path: '../../models/furniture/basin/C79826.glb',
                  dimensions: { width: 81, height: 64.8, depth: 45.5 },
                  floorOffset: 27.9,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79826',
                  price: '407.99',
                  title: 'Crete Fluted Linen White Wall Hung Drawer Vanity with Marble Top & Marin Basin 800mm'
              },
              {
                  id: 'C79824',
                  name: 'No Basin',
                  image: 'assets/productImages/furniture/c79824-1000-white-wall-hung-drawer-vanity-marble-top-800mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-linen-white-wall-hung-drawer-vanity-with-marble-top-800mm-excludes-counter-top-basin-c79824',
                  path: '../../models/furniture/basin/C79824.glb',
                  dimensions: { width: 81, height: 53.8, depth: 45.5 },
                  floorOffset: 27.9,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C79824',
                  price: '469.99',
                  title: 'Crete Fluted Linen White Wall Hung Drawer Vanity with Marble Top 800mm - Excludes Counter Top Basin'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_40',
          link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-800mm-chrome-handles-c81236',
          name: 'Milos Cotton White Basin Vanity 800mm - Chrome Handles',
          price: '159.99',
          image: 'assets/productImages/furniture/C81236-1000-Cotton-White-Basin-Vanity-800mm-Chrome-Handles_1.webp',
          variants: [
              {
                  id: 'C81236',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C81236-1000-Cotton-White-Basin-Vanity-800mm-Chrome-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-basin-vanity-800mm-chrome-handles-c81236',
                  path: '../../models/furniture/basin/C81236.glb',
                  dimensions: { width: 82, height: 81.9, depth: 47.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81236',
                  price: '239.00',
                  title: 'Milos Cotton White Basin Vanity 800mm - Chrome Handles'
              },
              {
                  id: 'C81238',
                  name: 'Oval Basin',
                  image: 'assets/productImages/furniture/C81238-1000-Cotton-White-Vanity-Basin-800mm-Chrome-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-oval-basin-800mm-chrome-handles-c81238',
                  path: '../../models/furniture/basin/C81238.glb',
                  dimensions: { width: 81.1, height: 96.5, depth: 45.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81238',
                  price: '329.99',
                  title: 'Milos Cotton White Vanity with Oval Basin 800mm - Chrome Handles'
              },
              {
                  id: 'C81239',
                  name: 'Troy Basin',
                  image: 'assets/productImages/furniture/C81239-1000-Cotton-White-Vanity-Basin-800mm-Chrome-Handles_1.webp',
                  link: 'https://www.bathroommountain.co.uk/milos-cotton-white-vanity-with-troy-basin-800mm-chrome-handles-c81239',
                  path: '../../models/furniture/basin/C81239.glb',
                  dimensions: { width: 81.1, height: 95.1, depth: 47.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81239',
                  price: '263.99',
                  title: 'Milos Cotton White Vanity with Troy Basin 800mm - Chrome Handles'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_41',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-basin-drawer-vanity-600mm-c81576',
          name: 'Corsica Gloss White Wall Hung Basin Drawer Vanity 600mm',
          price: '159.99',
          image: 'assets/productImages/furniture/C81576-1000-Gloss-White-Wall-Hung-Basin-Drawer-Vanity-600mm_1.webp',
          variants: [
              {
                  id: 'C81576',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C81576-1000-Gloss-White-Wall-Hung-Basin-Drawer-Vanity-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-basin-drawer-vanity-600mm-c81576',
                  path: '../../models/furniture/basin/C81576.glb',
                  dimensions: { width: 61.3, height: 56.6, depth: 46.5 },
                  floorOffset: 38.1,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81576',
                  price: '279.99',
                  title: 'Corsica Gloss White Wall Hung Basin Drawer Vanity 600mm'
              },
              {
                  id: 'C81579',
                  name: 'Curved Basin',
                  image: 'assets/productImages/furniture/C81579-1000-White-Wall-Hung-Drawer-Vanity-Marble-Basin-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-drawer-vanity-with-marble-top-curved-counter-top-basin-600mm-c81579',
                  path: '../../models/furniture/basin/C81579.glb',
                  dimensions: { width: 60, height: 65.4, depth: 45 },
                  floorOffset: 38.4,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81579',
                  price: '271.99',
                  title: 'Corsica Gloss White Wall Hung Drawer Vanity with Marble Top & Curved Counter Top Basin 600mm'
              },
              {
                  id: 'C81580',
                  name: 'Marin Basin',
                  image: 'assets/productImages/furniture/C81580-1000-White-Wall-Hung-Drawer-Vanity-Marble-Basin-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-drawer-vanity-with-marble-top-marin-basin-600mm-c81580',
                  path: '../../models/furniture/basin/C81580.glb',
                  dimensions: { width: 60, height: 63, depth: 45 },
                  floorOffset: 32.1,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81580',
                  price: '279.00',
                  title: 'Corsica Gloss White Wall Hung Drawer Vanity with Marble Top & Marin Basin 600mm'
              },
              {
                  id: 'C81577',
                  name: 'No Basin',
                  image: 'assets/productImages/furniture/C81577-1000-White-Wall-Hung-Drawer-Vanity-Marble-Top-600mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-drawer-vanity-with-marble-top-600mm-excludes-counter-top-basin-c81577',
                  path: '../../models/furniture/basin/C81577.glb',
                  dimensions: { width: 60, height: 51.9, depth: 45 },
                  floorOffset: 38.4,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C81577',
                  price: '309.99',
                  title: 'Corsica Gloss White Wall Hung Drawer Vanity with Marble Top 600mm - Excludes Counter Top Basin'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
      {
          id: 'furniture_variant_42',
          link: 'https://www.bathroommountain.co.uk/crete-fluted-apex-oak-wall-hung-basin-drawer-vanity-600mm-c82105',
          name: 'Crete Fluted Apex Oak Wall Hung Basin Drawer Vanity 600mm',
          price: '159.99',
          image: 'assets/productImages/furniture/C82105-1000-Fluted-Apex-Oak-Wall-Hung-Basin-Vanity-600mm.webp',
          variants: [
              {
                  id: 'C82105',
                  name: 'Built-in Basin',
                  image: 'assets/productImages/furniture/C82105-1000-Fluted-Apex-Oak-Wall-Hung-Basin-Vanity-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-apex-oak-wall-hung-basin-drawer-vanity-600mm-c82105',
                  path: '../../models/furniture/basin/C82105.glb',
                  dimensions: { width: 61, height: 57, depth: 46.5 },
                  floorOffset: 37.2,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C82105',
                  price: '349.99',
                  title: 'Crete Fluted Apex Oak Wall Hung Basin Drawer Vanity 600mm'
              },
              {
                  id: 'C82106',
                  name: 'No Basin',
                  image: 'assets/productImages/furniture/C82106-1000-Fluted-Apex-Oak-Wall-Hung-Vanity-Top-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-apex-oak-wall-hung-drawer-vanity-with-marble-top-600mm-excludes-counter-top-basin-c82106',
                  path: '../../models/furniture/basin/C82106.glb',
                  dimensions: { width: 61, height: 53.8, depth: 45.5 },
                  floorOffset: 37.4,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C82106',
                  price: '369.99',
                  title: 'Crete Fluted Apex Oak Wall Hung Drawer Vanity with Marble Top 600mm - Excludes Counter Top Basin'
              },
              {
                  id: 'C82108',
                  name: 'Marin Basin',
                  image: 'assets/productImages/furniture/C82108-1000-Fluted-Apex-Oak-Wall-Hung-Vanity-Top-Basin-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-apex-oak-wall-hung-drawer-vanity-with-marble-top-marin-basin-600mm-c82108',
                  path: '../../models/furniture/basin/C82108.glb',
                  dimensions: { width: 61, height: 64.8, depth: 45.5 },
                  floorOffset: 39.2,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C82108',
                  price: '327.00',
                  title: 'Crete Fluted Apex Oak Wall Hung Drawer Vanity with Marble Top & Marin Basin 600mm'
              },
              {
                  id: 'C82107',
                  name: 'Curved Basin',
                  image: 'assets/productImages/furniture/C82107-1000-Fluted-Apex-Oak-Wall-Hung-Vanity-Top-Basin-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-apex-oak-wall-hung-drawer-vanity-with-marble-top-curved-basin-600mm-c82107',
                  path: '../../models/furniture/basin/C82107.glb',
                  dimensions: { width: 61, height: 67.2, depth: 45.5 },
                  floorOffset: 38.4,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C82107',
                  price: '399.99',
                  title: 'Crete Fluted Apex Oak Wall Hung Drawer Vanity with Marble Top & Curved Basin 600mm'
              },
              {
                  id: 'C82109',
                  name: 'Cody Basin',
                  image: 'assets/productImages/furniture/C82109-1000-Fluted-Apex-Oak-Wall-Hung-Vanity-Top-Basin-600mm.webp',
                  link: 'https://www.bathroommountain.co.uk/crete-fluted-apex-oak-wall-hung-drawer-vanity-with-marble-top-cody-basin-600mm-c82109',
                  path: '../../models/furniture/basin/C82109.glb',
                  dimensions: { width: 61, height: 64.8, depth: 45.5 },
                  floorOffset: 37.3,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  sku: 'C82109',
                  price: '409.99',
                  title: 'Crete Fluted Apex Oak Wall Hung Drawer Vanity with Marble Top & Cody Basin 600mm'
              },
          ],
          variantType: 'Width Options',
          features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
      },
  ],

  Mirror: [
    // Mirror Variant 1 (3 variants)
    {
      id: 'mirror_variant_1',
      link: 'https://www.bathroommountain.co.uk/haisley-illuminated-led-mirror-cabinet-with-bluetooth-speaker-650x1200mm',
      name: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker',
      price: '499.99',
      image: 'assets/productImages/mirror/73104v2-1000-illuminated-led-mirror-cabinet-with-bluetooth_2.webp',
      variants: [
        {
          id: '73189v2',
          name: '650x1200mm',
          image: 'assets/productImages/mirror/73189v2-1000-illuminated-led-mirror-cabinet-with-bluetooth_2.webp',
          link: 'https://www.bathroommountain.co.uk/haisley-illuminated-led-mirror-cabinet-with-bluetooth-speaker-650x1200mm',
          path: '../../models/mirror/73189V2.glb',
          dimensions: { width: 119.8, height: 64.8, depth: 13.8 },
          floorOffset: 110.1,
          spawnHeight: 41.9,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: {
            snapToWall: true,
            allowVerticalMovement: true, // Vertical placement allowed (0..ceiling)
            allowFreeRotation: false,
            minHeight: 0, // Minimum height from floor
            maxHeight: -1
          },
          sku: '73189V2',
          price: '499.99',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 650x1200mm'
        },
        {
          id: '73104v2',
          name: '600x600mm',
          image: 'assets/productImages/mirror/73104v2-1000-illuminated-led-mirror-cabinet-with-bluetooth_2.webp',
          link: 'https://www.bathroommountain.co.uk/haisley-illuminated-led-mirror-cabinet-with-bluetooth-speaker-600x600mm-73104v2',
          path: '../../models/mirror/73104V2.glb',
          dimensions: { width: 59, height: 59.9, depth: 13.5 },
          floorOffset: 110,
          spawnHeight: 41.9,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: {
            snapToWall: true,
            allowVerticalMovement: true, // Fixed height
            allowFreeRotation: false,
            minHeight: 0, // Minimum height from floor
            maxHeight: -1
          },
          sku: '73104V2',
          price: '239.00',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 600x600mm'
        },
        {
          id: '73103v2',
          name: '600x450mm',
          image: 'assets/productImages/mirror/73103v2-1000-illuminated-led-mirror-cabinet-with-bluetooth_1_1.webp',
          link: 'https://www.bathroommountain.co.uk/haisley-illuminated-led-mirror-cabinet-with-bluetooth-speaker-600x450mm',
          path: '../../models/mirror/73103V2.glb',
          dimensions: { width: 45, height: 60, depth: 13 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: {
            snapToWall: true,
            allowVerticalMovement: true, // Fixed height
            allowFreeRotation: false,
          },
          floorOffset: 0,
          spawnHeight: 152,
          sku: '73103V2',
          price: '207.00',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 600x450mm'
        }
      ],
      variantType: 'Size Options',
      features: ['LED Lighting', 'Bluetooth Speaker', 'Touch Controls', 'Mirror Cabinet']
    },

    // Mirror Variant 2 (4 variants)
    {
      id: 'mirror_variant_2',
      link: 'https://www.bathroommountain.co.uk/evelyn-large-illuminated-led-mirror-500x1200mm',
      name: 'Evelyn Illuminated LED Mirror',
      price: '139.99',
      image: 'assets/productImages/mirror/73153v2-1000-evelyn-illuminated-led-mirror-600x400mm_1.webp',
      variants: [
        {
          id: '73035v2',
          name: '500x1200mm',
          image: 'assets/productImages/mirror/73035v2-1000-evelyn-large-illuminated-led-mirror-500x1200mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/evelyn-large-illuminated-led-mirror-500x1200mm',
          dimensions: { width: 119.5, height: 49.9, depth: 5.1 },
          floorOffset: 99.5,
          spawnHeight: 52.5,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          path: '../../models/mirror/73035V2.glb',
          sku: '73035V2',
          price: '139.99',
          title: 'Evelyn Large Illuminated LED Mirror 500x1200mm'
        },
        {
          id: '73154v2',
          name: '500x1000mm',
          image: 'assets/productImages/mirror/73154v2-1000-evelyn-illuminated-led-mirror-500x1000mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/evelyn-illuminated-led-mirror-500x1000mm-v2',
          path: '../../models/mirror/73154V2.glb',
          dimensions: { width: 100, height: 50, depth: 5.3 },
          floorOffset: 99.5,
          spawnHeight: 52.5,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: '73154V2',
          price: '125.99',
          title: 'Evelyn Illuminated LED Mirror 500x1000mm'
        },
        {
          id: '73153v2',
          name: '600x400mm',
          image: 'assets/productImages/mirror/73153v2-1000-evelyn-illuminated-led-mirror-600x400mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/evelyn-illuminated-led-mirror-600x400mm-73153v2',
          path: '../../models/mirror/73153V2.glb',
          dimensions: { width: 39.8, height: 59.9, depth: 5.3 },
          floorOffset: 0,
          spawnHeight: 152,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: '73153V2',
          price: '83.99',
          title: 'Evelyn Illuminated LED Mirror 600x400mm'
        },
        {
          id: '73033v2',
          name: '700x500mm',
          image: 'assets/productImages/mirror/73033v2-1000-evelyn-illuminated-led-mirror-700x500mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/evelyn-illuminated-led-mirror-700x500mm-73033v2',
          path: '../../models/mirror/73033V2.glb',
          dimensions: { width: 50, height: 70, depth: 5.1 },
          floorOffset: 99.5,
          spawnHeight: 52.5,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: '73033V2',
          price: '97.99',
          title: 'Evelyn Illuminated LED Mirror 700x500mm'
        }
      ],
      variantType: 'Size Options',
      features: ['LED Lighting', 'Touch Controls', 'Energy Efficient']
    }
  ],

  Radiator: [
    // Radiator Variant 1 (3 variants)
    {
      id: 'radiator_variant_1',
      link: 'https://www.bathroommountain.co.uk/faro-anthracite-double-flat-panel-vertical-radiator-1600x560mm-31022',
      name: 'Faro Anthracite Double Flat Panel Vertical Radiator',
      price: '289.99',
      image: 'assets/productImages/radiator/31019-1000-Anthracite-Double-Flat-Panel-Vertical-Radiator-1600x350mm_1.webp',
      variants: [
        {
          id: '31022',
          name: '1600x560mm',
          image: 'assets/productImages/radiator/31022-1000-Anthracite-Double-Flat-Panel-Vertical-Radiator-1600x560mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-anthracite-double-flat-panel-vertical-radiator-1600x560mm-31022',
          path: '../../models/radiator/31022.glb',
          dimensions: { width: 65.8, height: 163.2, depth: 11.3 },
          spawnHeight: -46,
          floorOffset:61,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: true,
            allowFreeRotation: false,
            minHeight: 0,
            maxHeight: 100
          },
          sku: '31022',
          price: '231.00',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x560mm'
        },
        {
          id: '31063',
          name: '1800x560mm',
          image: 'assets/productImages/radiator/31063-1000-anthracite-double-flat-panel-vertical-radiator-1800x560mm.webp',
          link: 'https://www.bathroommountain.co.uk/faro-anthracite-double-flat-panel-vertical-radiator-1800x560mm-31063',
          path: '../../models/radiator/31063.glb',
          dimensions: { width: 65.8, height: 183.2, depth: 11.3 },
          spawnHeight: -46,
          floorOffset: 61,
          sku: '31063',
          price: '339.99',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1800x560mm'
        },
        {
          id: '31019',
          name: '1600x350mm',
          image: 'assets/productImages/radiator/31019-1000-Anthracite-Double-Flat-Panel-Vertical-Radiator-1600x350mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-anthracite-double-flat-panel-vertical-radiator-1600x350mm-31019',
          path: '../../models/radiator/31019.glb',
          dimensions: { width: 44.8, height: 163, depth: 11.3 },
          spawnHeight: -46,
          floorOffset: 61,
          sku: '31019',
          price: '209.99',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x350mm'
        }
      ],
      variantType: 'Size Options',
      features: ['Double Panel', 'Vertical Design', 'High Heat Output']
    },

    // Radiator Variant 2 (2 variants)
    {
      id: 'radiator_variant_2',
      link: 'https://www.bathroommountain.co.uk/faro-matt-black-double-flat-panel-horizontal-radiator-600x1190mm',
      name: 'Faro Matt Black Double Flat Panel Horizontal Radiator',
      price: '223.00',
      image: 'assets/productImages/radiator/32124-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x420mm_1.webp',
      variants: [
        {
          id: '32128',
          name: '600x1190mm',
          image: 'assets/productImages/radiator/32128-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x1190mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-matt-black-double-flat-panel-horizontal-radiator-600x1190mm',
          path: '../../models/radiator/32128.glb',
          dimensions: { width: 128.5, height: 63, depth: 11.3 },
          spawnHeight: -16,
          floorOffset: 30.5,
          sku: '32128',
          price: '223.00',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x1190mm'
        },
        {
          id: '32124',
          name: '600x420mm',
          image: 'assets/productImages/radiator/32124-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x420mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-matt-black-double-flat-panel-horizontal-radiator-600x420mm',
          path: '../../models/radiator/32124.glb',
          dimensions: { width: 51.5, height: 63, depth: 11.3 },
          spawnHeight: -16,
          floorOffset: 30.5,
          sku: '32124',
          price: '87.00',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x420mm'
        }
      ],
      variantType: 'Size Options',
      features: ['Double Panel', 'Horizontal Design', 'Modern Styling']
    }
  ],

  Shower: [
    // Shower Variant 1 (4 variants)
    {
      id: 'shower_variant_1',
      link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1000x700mm-c46247',
      name: 'London Matt Black 6mm Sliding Shower Enclosure',
      price: '219.99',
      image: 'assets/productImages/shower/c46006-1000-london-matt-black-6mm-sliding-shower-enclosure-1000x760mm.webp',
      variants: [
        {
          id: 'c46247',
          name: '1000x700mm',
          image: 'assets/productImages/shower/C46247-1000-Matt-Black-6mm-Sliding-Shower-Enclosure-1000x700mm_3.webp',
          link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1000x700mm-c46247',
          path: '../../models/shower/C46247.glb',
          dimensions: { width: 100.4, height: 185.5, depth: 70 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            cornerInstallOnly: {
              enabled: true
            },
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C46247',
          price: '219.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x700mm'
        },
        {
          id: 'c46006',
          name: '1000x760mm',
          image: 'assets/productImages/shower/c46006-1000-london-matt-black-6mm-sliding-shower-enclosure-1000x760mm.webp',
          link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1000x760mm-c46006',
          path: '../../models/shower/C46006.glb',
          dimensions: { width: 100.4, height: 185.5, depth: 76.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
            // rotationOffset: Math.PI // Rotate to face into room
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            cornerInstallOnly: {
              enabled: true
            },
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C46006',
          price: '183.00',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x760mm'
        },
        {
          id: 'c46009',
          name: '1200x800mm',
          image: 'assets/productImages/shower/C46009-1000-London-Matt-Black-6mm-Sliding-Shower-Enclosure-1200x800mm_2.webp',
          link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1200x800mm-c46009',
          path: '../../models/shower/C46009.glb',
          dimensions: { width: 120.1, height: 185.5, depth: 80.2 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0,
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            cornerInstallOnly: {
              enabled: true
            },
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C46009',
          price: '203.00',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1200x800mm'
        },
        {
          id: 'c46175',
          name: '1400x900mm',
          image: 'assets/productImages/shower/C46175-1000-London-Matt-Black-6mm-Sliding-Shower-Enclosure-1400x900mm_1_1.webp',
          link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1400x900mm-c46175',
          path: '../../models/shower/C46175.glb',
          dimensions: { width: 139.4, height: 185.5, depth: 90 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0,
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            cornerInstallOnly: {
              enabled: true
            },
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C46175',
          price: '289.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1400x900mm'
        }
      ],
      variantType: 'Size Options',
      features: ['Thermostatic Control', 'Dual Outlet', 'Matt Black Finish']
    },
    {
      id: 'shower_variant_2',
      link: 'https://www.bathroommountain.co.uk/galway-premium-matt-black-square-thermostatic-shower-set-300mm-head-hand-shower-c27067',
      name: 'Galway Premium Matt Black Square Thermostatic Shower Set - 300mm Head & Hand Shower',
      price: '199.00',
      image: 'assets/productImages/shower/C27067-1000-Black-Square-Thermostatic-Shower-Set-300mm-Head_1.webp',
      variants: [
        {
          id: 'C27067',
          name: '300mm + Hand Shower',
          image: 'assets/productImages/shower/C27067-1000-Black-Square-Thermostatic-Shower-Set-300mm-Head_1.webp',
          link: 'https://www.bathroommountain.co.uk/galway-premium-matt-black-square-thermostatic-shower-set-300mm-head-hand-shower-c27067',
          path: '../../models/shower/C27067.glb',
          dimensions: { width: 44.2, height: 122.2, depth: 56.3 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            cornerInstallOnly: {
              enabled: true
            },
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C27067',
          price: '199.00',
          title: 'Galway Premium Matt Black Square Thermostatic Shower Set - 300mm Head & Hand Shower'
        },
      ],
      variantType: 'Size Options',
      features: ['Thermostatic Control', 'Dual Outlet', 'Matt Black Finish']
    },
    {
      id: 'shower_variant_2',
      link: 'https://www.bathroommountain.co.uk/ballina-premium-matt-black-round-thermostatic-shower-set-300mm-head-hand-shower-c27059',
      name: 'Ballina Premium Matt Black Round Thermostatic Shower Set - 300mm Head & Hand Shower',
      price: '259.00',
      image: 'assets/productImages/shower/C27059-1000-Matt-Black-Round-Thermostatic-Shower-Set-300mm-Head_1.webp',
      variants: [
        {
          id: 'C27059',
          name: '300mm + Hand Shower',
          image: 'assets/productImages/shower/C27059-1000-Matt-Black-Round-Thermostatic-Shower-Set-300mm-Head_1.webp',
          link: 'https://www.bathroommountain.co.uk/ballina-premium-matt-black-round-thermostatic-shower-set-300mm-head-hand-shower-c27059',
          path: '../../models/shower/C27059.glb',
          dimensions: { width: 45.6, height: 162.8, depth: 52.2 },
          floorOffset: 21.5,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C27059',
          price: '259.00',
          title: 'Ballina Premium Matt Black Round Thermostatic Shower Set - 300mm Head & Hand Shower'
        },
        {
          id: 'C27054',
          name: '200mm',
          image: 'assets/productImages/shower/C27054-1000-Matt-Black-Round-Thermostatic-Shower-Set-200mm-Head_1.webp',
          link: 'https://www.bathroommountain.co.uk/ballina-premium-matt-black-round-thermostatic-shower-set-200mm-head-c27054',
          path: '../../models/shower/C27054.glb',
          dimensions: { width: 20, height: 85.7, depth: 48.1 },
          floorOffset: 98.6,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C27054',
          price: '199.99',
          title: 'Ballina Premium Matt Black Round Thermostatic Shower Set - 200mm Head'
        },
        {
          id: 'C27058',
          name: '200mm + Hand Shower',
          image: 'assets/productImages/shower/C27058-1000-Matt-Black-Round-Thermostatic-Shower-Set-200mm-Head_1.webp',
          link: 'https://www.bathroommountain.co.uk/ballina-premium-matt-black-round-thermostatic-shower-set-200mm-head-hand-shower-c27058',
          path: '../../models/shower/C27058.glb',
          dimensions: { width: 41.1, height: 143.8, depth: 47.4 },
          floorOffset: 40.5,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C27058',
          price: '179.00',
          title: 'Ballina Premium Matt Black Round Thermostatic Shower Set - 200mm Head & Hand Shower'
        },
        {
          id: 'C27055',
          name: '300mm + Hand Shower',
          image: 'assets/productImages/shower/C27055-1000-Matt-Black-Round-Thermostatic-Shower-Set-300mm-Head_1.webp',
          link: 'https://www.bathroommountain.co.uk/ballina-premium-matt-black-round-thermostatic-shower-set-300mm-head-c27055',
          path: '../../models/shower/C27055.glb',
          dimensions: { width: 41.1, height: 143.8, depth: 47.4 },
          floorOffset: 98.6,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Corner shower installation'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C27055',
          price: '219.99',
          title: 'Ballina Premium Matt Black Round Thermostatic Shower Set - 300mm Head'
        },
      ],
      variantType: 'Size Options',
      features: ['Thermostatic Control', 'Dual Outlet', 'Matt Black Finish']
    },
      {
          id: 'shower_variant_4',
          link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1200x800mm-c46004',
          name: 'London 6mm Sliding Shower Enclosure 1200x800mm',
          price: '175.00',
          image: 'assets/productImages/shower/C46004-1000-London-6mm-Sliding-Shower-Enclosure-1200x800mm_1.webp',
          variants: [
              {
                  id: 'C46004',
                  name: '1200x800mm',
                  image: 'assets/productImages/shower/C46004-1000-London-6mm-Sliding-Shower-Enclosure-1200x800mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1200x800mm-c46004',
                  path: '../../models/shower/C46004.glb',
                  dimensions: { width: 80.5, height: 185.5, depth: 119.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46004',
                  price: '175.00',
                  title: 'London 6mm Sliding Shower Enclosure 1200x800mm'
              },
              {
                  id: 'C46241',
                  name: '1000x700mm',
                  image: 'assets/productImages/shower/C46241-1000-London-6mm-Sliding-Shower-Enclosure-1000x700mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1000x700mm-c46241',
                  path: '../../models/shower/C46241.glb',
                  dimensions: { width: 76.2, height: 185.2, depth: 100.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Corner shower installation'
                      // rotationOffset: Math.PI // Rotate to face into room
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46241',
                  price: '199.99',
                  title: 'London 6mm Sliding Shower Enclosure 1000x700mm'
              },
              {
                  id: 'C46001',
                  name: '1000x760mm',
                  image: 'assets/productImages/shower/C46001-1000-London-6mm-Sliding-Shower-Enclosure-1000x760mm_2.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1000x760mm-c46001',
                  path: '../../models/shower/C46001.glb',
                  dimensions: { width: 100.3, height: 185.3, depth: 70.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46001',
                  price: '204.99',
                  title: 'London 6mm Sliding Shower Enclosure 1000x760mm'
              },
              {
                  id: 'C46002',
                  name: '1400x900mm',
                  image: 'assets/productImages/shower/C46002-1000-London-6mm-Sliding-Shower-Enclosure-1000x800mm_2.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1000x800mm-c46002',
                  path: '../../models/shower/C46002.glb',
                  dimensions: { width: 100.3, height: 185.3, depth: 80 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46002',
                  price: '209.99',
                  title: 'London 6mm Sliding Shower Enclosure 1000x800mm'
              },
              {
                  id: 'C46242',
                  name: '1100x700mm',
                  image: 'assets/productImages/shower/C46242-1000-London-6mm-Sliding-Shower-Enclosure-1100x700mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1100x700mm-c46242',
                  path: '../../models/shower/C46242.glb',
                  dimensions: { width: 70.2, height: 185.2, depth: 110.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46242',
                  price: '204.99',
                  title: 'London 6mm Sliding Shower Enclosure 1100x700mm'
              },
              {
                  id: 'C46243',
                  name: '1400x900mm',
                  image: 'assets/productImages/shower/C46243-1000-London-6mm-Sliding-Shower-Enclosure-1100x760mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1100x760mm-c46243',
                  path: '../../models/shower/C46243.glb',
                  dimensions: { width: 76.2, height: 185.2, depth: 110.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46243',
                  price: '209.99',
                  title: 'London 6mm Sliding Shower Enclosure 1100x760mm'
              },
              {
                  id: 'C46003',
                  name: '1100x800mm',
                  image: 'assets/productImages/shower/C46003-1000-London-6mm-Sliding-Shower-Enclosure-1100x800mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1100x800mm-c46003',
                  path: '../../models/shower/C46003.glb',
                  dimensions: { width: 110.1, height: 185.3, depth: 80.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46003',
                  price: '171.00',
                  title: 'London 6mm Sliding Shower Enclosure 1100x800mm'
              },
              {
                  id: 'C46244',
                  name: '1100x900mm',
                  image: 'assets/productImages/shower/C46244-1000-London-6mm-Sliding-Shower-Enclosure-1100x900mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1100x900mm-c46244',
                  path: '../../models/shower/C46244.glb',
                  dimensions: { width: 90.2, height: 185.2, depth: 110.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46244',
                  price: '219.99',
                  title: 'London 6mm Sliding Shower Enclosure 1100x900mm'
              },
              {
                  id: 'C46245',
                  name: '1200x700mm',
                  image: 'assets/productImages/shower/C46245-1000-London-6mm-Sliding-Shower-Enclosure-1200x700mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1200x700mm-c46245',
                  path: '../../models/shower/C46245.glb',
                  dimensions: { width: 69.9, height: 185.5, depth: 119.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46245',
                  price: '214.99',
                  title: 'London 6mm Sliding Shower Enclosure 1200x700mm'
              },
              {
                  id: 'C46246',
                  name: '1200x760mm',
                  image: 'assets/productImages/shower/C46246-1000-London-6mm-Sliding-Shower-Enclosure-1200x760mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1200x760mm-c46246',
                  path: '../../models/shower/C46246.glb',
                  dimensions: { width: 76.1, height: 185.5, depth: 119.4 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46246',
                  price: '175.00',
                  title: 'London 6mm Sliding Shower Enclosure 1200x760mm'
              },
              {
                  id: 'C46005',
                  name: '1200x900mm',
                  image: 'assets/productImages/shower/C46005-1000-London-6mm-Sliding-Shower-Enclosure-1200x900mm_1.webp',
                  link: 'https://www.bathroommountain.co.uk/london-6mm-sliding-shower-enclosure-1200x900mm-c46005',
                  path: '../../models/shower/C46005.glb',
                  dimensions: { width: 119.4, height: 185.5, depth: 89.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0,
                      description: 'Corner shower installation'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C46005',
                  price: '234.99',
                  title: 'London 6mm Sliding Shower Enclosure 1200x900mm'
              }
          ],
          variantType: 'Size Options',
          features: ['Thermostatic Control', 'Dual Outlet', 'Matt Black Finish']
      },
  ],

  Bath: [
    // Bath Variant 1 (3 variants)
    {
      id: 'bath_variant_1',
      link: 'https://www.bathroommountain.co.uk/newham-1370mm-freestanding-bath-c51096',
      name: 'Newham Freestanding Bath',
      price: '479.99',
      image: 'assets/productImages/bath/C51092-1000-Newham-V2-1500mm-Freestanding-Bath_6.webp',
      variants: [
        {
          id: 'c51096',
          name: '1370mm Length',
          image: 'assets/productImages/bath/C51096-1000-Newham-1370mm-Freestanding-Bath_1.webp',
          link: 'https://www.bathroommountain.co.uk/newham-1370mm-freestanding-bath-c51096',
          path: '../../models/bath/C51096.glb',
          dimensions: { width: 136.9, height: 55, depth: 72.9 },
          movement: { // NEW: Sink movement configuration
            snapToWall: false,
            allowVerticalMovement: false,
            allowFreeRotation: true
          },
          sku: 'C51096',
          price: '479.99',
          title: 'Newham 1370mm Freestanding Bath'
        },
        {
          id: 'c51092',
          name: '1500mm Length',
          image: 'assets/productImages/bath/C51092-1000-Newham-V2-1500mm-Freestanding-Bath_6.webp',
          link: 'https://www.bathroommountain.co.uk/newham-v2-1500mm-freestanding-bath-c51092',
          path: '../../models/bath/C51092.glb',
          dimensions: { width: 151.7, height: 57.9, depth: 74.8 },
          movement: { // NEW: Sink movement configuration
            snapToWall: false,
            allowVerticalMovement: false,
            allowFreeRotation: true
          },
          sku: 'C51092',
          price: '399.00',
          title: 'Newham 1500mm Freestanding Bath'
        },
        {
          id: 'c51093',
          name: '1700mm Length',
          image: 'assets/productImages/bath/C51093-1000-Newham-V2-1700mm-Freestanding-Bath_6.webp',
          link: 'https://www.bathroommountain.co.uk/newham-v2-1700mm-freestanding-bath-c51093',
          path: '../../models/bath/C51093.glb',
          dimensions: { width: 169.7, height: 58, depth: 77.8 },
          movement: { // NEW: Sink movement configuration
            snapToWall: false,
            allowVerticalMovement: false,
            allowFreeRotation: true
          },
          sku: 'C51093',
          price: '499.99',
          title: 'Newham 1700mm Freestanding Bath'
        }
      ],
      variantType: 'Length Options',
      features: ['Freestanding Design', 'Acrylic Construction', 'Modern Shape']
    },

    // Bath 2 (1 variant)
    {
      id: 'bath_2',
      link: 'https://www.bathroommountain.co.uk/l-shaped-1700-shower-bath-with-front-panel-6mm-easy-clean-brushed-brass-bath-screen-right-handed-c57499',
      name: 'L Shaped 1700 Shower Bath with Front Panel & Bath Screen',
      price: '489.99',
      image: 'assets/productImages/bath/C57499-1000-L-Shaped-Shower-Bath-Front-Panel-Bath-Screen-Right.webp',
      variants: [
        {
          id: 'c57499',
          name: 'Right Handed',
          image: 'assets/productImages/bath/C57499-1000-L-Shaped-Shower-Bath-Front-Panel-Bath-Screen-Right.webp',
          link: 'https://www.bathroommountain.co.uk/l-shaped-1700-shower-bath-with-front-panel-6mm-easy-clean-brushed-brass-bath-screen-right-handed-c57499',
          path: '../../models/bath/C57499.glb',
          dimensions: { width: 173.3, height: 195.4, depth: 85.2 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            cornerInstallOnly: {
              enabled: true,
              rotation: {
                'north-west': 0,
                'north-east': -Math.PI / 2,
                'south-east': Math.PI,
                'south-west': Math.PI / 2
              }
            },
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C57499',
          price: '489.99',
          title: 'L Shaped 1700 Shower Bath with Front Panel & 6mm Easy Clean Brushed Brass Bath Screen - Right Handed'
        }
      ],
      variantType: 'Orientation',
      features: ['L-Shaped Design', 'Shower Screen Included', 'Front Panel Included']
    },

    {
      id: 'bath_3',
      link: 'https://www.bathroommountain.co.uk/kensington-v2-1700mm-freestanding-slipper-bath-c51089',
      name: 'Kensington 1700mm Freestanding Slipper Bath',
      price: '599.99',
      image: 'assets/productImages/bath/C51089-1000-Kensington-V2-1700mm-Freestanding-Slipper-Bath_13.webp',
      variants: [
        {
          id: 'C51089',
          name: '1700mm',
          image: 'assets/productImages/bath/C51089-1000-Kensington-V2-1700mm-Freestanding-Slipper-Bath_13.webp',
          link: 'https://www.bathroommountain.co.uk/kensington-v2-1700mm-freestanding-slipper-bath-c51089',
          path: '../../models/bath/C51089.glb',
          dimensions: { width: 170, height: 67, depth: 73 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
                snapToWall: false,
                allowVerticalMovement: false,
                allowFreeRotation: true
            },
          sku: 'C51089',
          price: '599.99',
          title: 'Kensington 1700mm Freestanding Slipper Bath'
        },
        {
          id: 'C51098',
          name: '1370mm',
          image: 'assets/productImages/bath/C51098-1000-Kensington-1370mm-Freestanding-Slipper-Bath_1.webp',
          link: 'https://www.bathroommountain.co.uk/kensington-1370mm-freestanding-slipper-bath-c51098',
          path: '../../models/bath/C51098.glb',
          dimensions: { width: 137.2, height: 67, depth: 71.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
                snapToWall: false,
                allowVerticalMovement: false,
                allowFreeRotation: true
            },
          sku: 'C51098',
          price: '579.99',
          title: 'Kensington 1370mm Freestanding Slipper Bath'
        },
        {
          id: 'C51088',
          name: '1500mm',
          image: 'assets/productImages/bath/C51088-1000-Kensington-V2-1500mm-Freestanding-Slipper-Bath_13.webp',
          link: 'https://www.bathroommountain.co.uk/kensington-v2-1500mm-freestanding-slipper-bath-c51088',
          path: '../../models/bath/C51088.glb',
          dimensions: { width: 152.2, height: 67, depth: 73.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
                snapToWall: false,
                allowVerticalMovement: false,
                allowFreeRotation: true
            },
          sku: 'C51088',
          price: '589.99',
          title: 'Kensington 1500mm Freestanding Slipper Bath'
        },
      ],
      variantType: 'Orientation',
      features: ['L-Shaped Design', 'Shower Screen Included', 'Front Panel Included']
    },

    {
          id: 'bath_4',
          link: 'https://www.bathroommountain.co.uk/stafford-1700x700-round-single-ended-bath-c53017',
          name: 'Stafford 1700x700 Round Single Ended bath',
          price: '125.00',
          image: 'assets/productImages/bath/C53017-1000-1700x700-Round-Single-Ended-bath.webp',
          variants: [
              {
                  id: 'C53017',
                  name: '1700 X 700mm',
                  image: 'assets/productImages/bath/C53017-1000-1700x700-Round-Single-Ended-bath.webp',
                  link: 'https://www.bathroommountain.co.uk/stafford-1700x700-round-single-ended-bath-c53017',
                  path: '../../models/bath/C53017.glb',
                  dimensions: { width: 170, height: 41.1, depth: 70 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53017',
                  price: '125.00',
                  title: 'Stafford 1700x700 Round Single Ended bath'
              },
              {
                  id: 'C53014',
                  name: '1400 X 700mm',
                  image: 'assets/productImages/bath/C53014-1000-1400x700-Round-Single-Ended-Bath_1.webp',
                  link: 'https://www.bathroommountain.co.uk/stafford-v2-1400x700-round-single-ended-bath-c53014',
                  path: '../../models/bath/C53014.glb',
                  dimensions: { width: 140.3, height: 41.4, depth: 70 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53014',
                  price: '139.99',
                  title: 'Stafford 1400x700 Round Single Ended Bath'
              },
              {
                  id: 'C53015',
                  name: '1500 X 700mm',
                  image: 'assets/productImages/bath/C53015-1000-1500x700-Round-Single-Ended-Bath.webp',
                  link: 'https://www.bathroommountain.co.uk/stafford-1500x700-round-single-ended-bath-c53015',
                  path: '../../models/bath/C53015.glb',
                  dimensions: { width: 150, height: 41.1, depth: 70 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53015',
                  price: '139.99',
                  title: 'Stafford 1500x700 Round Single Ended Bath'
              },
              {
                  id: 'C53016',
                  name: '1700 X 700mm',
                  image: 'assets/productImages/bath/C53016-1000-1600x700-Round-Single-Ended-Bath.webp',
                  link: 'https://www.bathroommountain.co.uk/stafford-1600x700-round-single-ended-bath-c53016',
                  path: '../../models/bath/C53016.glb',
                  dimensions: { width: 160, height: 41.1, depth: 70 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53016',
                  price: '139.99',
                  title: 'Stafford 1600x700 Round Single Ended Bath'
              },
          ],
          variantType: 'Size Options',
          features: ['Single Ended Design', 'Acrylic Construction', 'Multiple Lengths']
      },
    {
          id: 'bath_5',
          link: 'https://www.bathroommountain.co.uk/hereford-v2-1500x700-square-single-ended-bath-c53018',
          name: 'Hereford 1500x700 Square Single Ended Bath',
          price: '129.00',
          image: 'assets/productImages/bath/C53018-1000-1500x700-Square-Single-Ended-Bath_1.webp',
          variants: [
              {
                  id: 'C53018',
                  name: '1500 X 700mm',
                  image: 'assets/productImages/bath/C53018-1000-1500x700-Square-Single-Ended-Bath_1.webp',
                  link: 'https://www.bathroommountain.co.uk/hereford-v2-1500x700-square-single-ended-bath-c53018',
                  path: '../../models/bath/C53018.glb',
                  dimensions: { width: 150.8, height: 44.6, depth: 70.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53018',
                  price: '129.00',
                  title: 'Hereford 1500x700 Square Single Ended Bath'
              },
              {
                  id: 'C53019',
                  name: '1600 X 700mm',
                  image: 'assets/productImages/bath/C53019-1000-1600x700-Square-Single-Ended-Bath.webp',
                  link: 'https://www.bathroommountain.co.uk/hereford-v2-1600x700-square-single-ended-bath-c53019',
                  path: '../../models/bath/C53019.glb',
                  dimensions: { width: 160.2, height: 44.6, depth: 70.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53019',
                  price: '159.99',
                  title: 'Hereford 1600x700 Square Single Ended Bath'
              },
              {
                  id: 'C53021',
                  name: '1700 X 750mm',
                  image: 'assets/productImages/bath/C53021-1000-1700x750-Square-Single-Ended-Bath.webp',
                  link: 'https://www.bathroommountain.co.uk/hereford-v2-1700x750-square-single-ended-bath-c53021',
                  path: '../../models/bath/C53021.glb',
                  dimensions: { width: 169.5, height: 44.6, depth: 70.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53021',
                  price: '184.99',
                  title: 'Hereford 1700x750 Square Single Ended Bath'
              },
              {
                  id: 'C53022',
                  name: '1800 X 800mm',
                  image: 'assets/productImages/bath/C53022-1000-1800x800-Square-Single-Ended-Bath.webp',
                  link: 'https://www.bathroommountain.co.uk/hereford-v2-1800x800-square-single-ended-bath-c53022',
                  path: '../../models/bath/C53022.glb',
                  dimensions: { width: 179.4, height: 54.6, depth: 79.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      cornerInstallOnly: {
                          enabled: true,
                      },
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C53022',
                  price: '209.99',
                  title: 'Hereford 1800x800 Square Single Ended Bath'
              },
          ],
          variantType: 'Orientation',
        features: ['Square Design', 'Single Ended', 'Acrylic Construction', 'Multiple Sizes']
      },
  ],

  Toilet: [
    // Toilet Variant 1 (2 variants)
    {
      id: 'toilet_variant_1',
      link: 'https://www.bathroommountain.co.uk/nevada-v2-rimless-wall-hung-toilet-with-premium-soft-close-slim-seat',
      name: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Seat',
      price: '143.00',
      image: 'assets/productImages/toilet/c66174-1000-rimless-wall-hung-toilet-with-soft-close-seat.webp',
      variants: [
        {
          id: 'c66175',
          name: 'Slim Seat',
          image: 'assets/productImages/toilet/c66175-1000-rimless-wall-hung-toilet-with-soft-close-slim-seat.webp',
          link: 'https://www.bathroommountain.co.uk/nevada-v2-rimless-wall-hung-toilet-with-premium-soft-close-slim-seat',
          path: '../../models/toilet/C66175.glb',
          dimensions: { width: 35.2, height: 40.5, depth: 52.7 },
          floorOffset: 5.7,
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C66175',
          price: '143.00',
          title: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Slim Seat'
        },
        {
          id: 'c66174',
          name: 'Standard Seat',
          image: 'assets/productImages/toilet/c66174-1000-rimless-wall-hung-toilet-with-soft-close-seat.webp',
          link: 'https://www.bathroommountain.co.uk/nevada-v2-rimless-wall-hung-toilet-with-premium-soft-close-seat',
          path: '../../models/toilet/C66174.glb',
          dimensions: { width: 36.2, height: 30.8, depth: 52.4 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C66174',
          price: '143.00',
          title: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Seat'
        }
      ],
      variantType: 'Seat Options',
      features: ['Rimless Design', 'Soft Close Seat', 'Wall Hung', 'Premium Quality']
    },

    // Toilet Variant 2 (3 variants)
    {
      id: 'toilet_variant_2',
      link: 'https://www.bathroommountain.co.uk/portland-v2-comfort-height-close-coupled-toilet-with-soft-close-slim-seat-c66185',
      name: 'Portland Close Coupled Toilet With Soft Close Seat',
      price: '135.00',
      image: 'assets/productImages/toilet/C66183-1000-Close-Coupled-Toilet-With-Soft-Close-Slim-Seat.webp',
      variants: [
        {
          id: 'c66183',
          name: 'Slim Seat',
          image: 'assets/productImages/toilet/C66183-1000-Close-Coupled-Toilet-With-Soft-Close-Slim-Seat.webp',
          link: 'https://www.bathroommountain.co.uk/portland-v2-close-coupled-toilet-with-soft-close-slim-seat-c66183',
          path: '../../models/toilet/C66183.glb',
          dimensions: { width: 37.1, height: 77.6, depth: 60.1 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C66183',
          price: '135.00',
          title: 'Portland Close Coupled Toilet With Soft Close Slim Seat'
        },
        {
          id: 'c66185',
          name: 'Comfort Height',
          image: 'assets/productImages/toilet/C66185-1000-Comfort-Height-Close-Coupled-Toilet-Slim-Seat.webp',
          link: 'https://www.bathroommountain.co.uk/portland-v2-comfort-height-close-coupled-toilet-with-soft-close-slim-seat-c66185',
          path: '../../models/toilet/C66185.glb',
          dimensions: { width: 37.1, height: 82.5, depth: 60.9 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C66185',
          price: '167.00',
          title: 'Portland Comfort Height Close Coupled Toilet With Soft Close Slim Seat'
        },
        {
          id: 'c66184',
          name: 'Back to Wall',
          image: 'assets/productImages/toilet/C66184-1000-Back-to-Wall-Close-Coupled-Toilet-Slim-Seat.webp',
          link: 'https://www.bathroommountain.co.uk/portland-v2-fully-back-to-wall-close-coupled-toilet-with-soft-close-slim-seat-c66184',
          path: '../../models/toilet/C66184.glb',
          dimensions: { width: 37.1, height: 77.6, depth: 60.2 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C66184',
          price: '151.99',
          title: 'Portland Fully Back to Wall Close Coupled Toilet With Soft Close Slim Seat'
        }
      ],
      variantType: 'Style Options',
      features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
    },

    {
      id: 'toilet_variant_3',
      link: 'https://www.bathroommountain.co.uk/tucson-rimless-close-coupled-toilet-with-premium-soft-close-seat-c66228',
      name: 'Tucson Rimless Close Coupled Toilet With Premium Soft Close Seat',
      price: '115.99',
      image: 'assets/productImages/toilet/c66228-1000-rimless-close-coupled-toilet-soft-close-seat.webp',
      variants: [
        {
          id: 'C66228',
          name: 'Soft Close Seat',
          image: 'assets/productImages/toilet/c66228-1000-rimless-close-coupled-toilet-soft-close-seat.webp',
          link: 'https://www.bathroommountain.co.uk/tucson-rimless-close-coupled-toilet-with-premium-soft-close-seat-c66228',
          path: '../../models/toilet/C66228.glb',
          dimensions: { width: 38.3, height: 77.8, depth: 64.9 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C66228',
          price: '115.99',
          title: 'Tucson Rimless Close Coupled Toilet With Premium Soft Close Seat'
        },
        {
          id: 'C66229',
              name: 'Soft Close Slim Seat',
              image: 'assets/productImages/toilet/c66229-1000-rimless-close-coupled-toilet-soft-close-slim-seat.webp',
              link: 'https://www.bathroommountain.co.uk/tucson-rimless-close-coupled-toilet-with-premium-soft-close-slim-seat-c66229',
              path: '../../models/toilet/C66229.glb',
              dimensions: { width: 38.3, height: 77.8, depth: 64.9 },
              orientation: {
                  type: 'face_into_room',
                  wallBuffer: 0, // Flush with wall - no gap
                  description: 'Item is part of wall opening'
              },
              movement: { // NEW: Sink movement configuration
                  snapToWall: true,
                  allowVerticalMovement: false,
                  allowFreeRotation: false
              },
              sku: 'C66229',
              price: '115.00',
              title: 'Tucson Rimless Close Coupled Toilet With Premium Soft Close Slim Seat'
          },
      ],
      variantType: 'Style Options',
      features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
    },

    {
          id: 'toilet_variant_4',
          link: 'https://www.bathroommountain.co.uk/denver-close-coupled-toilet-with-soft-close-seat-c66031',
          name: 'Tucson Rimless Close Coupled Toilet With Premium Soft Close Seat',
          price: '119.00',
          image: 'assets/productImages/toilet/C66031-1000-Denver-Close-Coupled-Toilet-With-Soft-Close-Seat.webp',
          variants: [
              {
                  id: 'C66031',
                  name: 'Denver Close Coupled Toilet With Soft Close Seat',
                  image: 'assets/productImages/toilet/C66031-1000-Denver-Close-Coupled-Toilet-With-Soft-Close-Seat.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-close-coupled-toilet-with-soft-close-seat-c66031',
                  path: '../../models/toilet/C66031.glb',
                  dimensions: { width: 37.5, height: 18.6, depth: 63.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66031',
                  price: '119.00',
                  title: 'Denver Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66137',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/C66137-1000-Close-Coupled-Toilet-With-Soft-Close-Slim-Seat.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-close-coupled-toilet-with-soft-close-slim-seat-c66137',
                  path: '../../models/toilet/C66137.glb',
                  dimensions: { width: 37.5, height: 81.6, depth: 63.5 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66137',
                  price: '135.00',
                  title: 'Denver Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66220',
                  name: 'Smart Seat',
                  image: 'assets/productImages/toilet/C66220-1000-Denver-Close-Coupled-Toilet-With-Smart-Bidet-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-close-coupled-toilet-with-smart-bidet-seat-c66220',
                  path: '../../models/toilet/C66220.glb',
                  dimensions: { width: 45.5, height: 81.6, depth: 65.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66220',
                  price: '529.99',
                  title: 'Denver Close Coupled Toilet With Smart Bidet Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },

    {
          id: 'toilet_variant_5',
          link: 'https://www.bathroommountain.co.uk/manhattan-slimline-560-depth-close-coupled-toilet-with-soft-close-seat-c66241',
          name: 'Manhattan Slimline 560 Depth Close Coupled Toilet With Soft Close Seat',
          price: '119.00',
          image: 'assets/productImages/toilet/C66241-1000-Dallas-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
          variants: [
              {
                  id: 'C66241',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/C66241-1000-Dallas-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/manhattan-slimline-560-depth-close-coupled-toilet-with-soft-close-seat-c66241',
                  path: '../../models/toilet/C66241.glb',
                  dimensions: { width: 36, height: 79.6, depth: 55.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66241',
                  price: '119.00',
                  title: 'Manhattan Slimline 560 Depth Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },

    {
          id: 'toilet_variant_6',
          link: 'https://www.bathroommountain.co.uk/boston-rimless-fully-back-to-wall-close-coupled-toilet-with-premium-soft-close-seat-c66042v2',
          name: 'Boston Rimless Fully Back To Wall Close Coupled Toilet With Premium Soft Close Seat',
          price: '159.99',
          image: 'assets/productImages/toilet/c66042v2-1000-rimless-fully-back-to-wall-close-coupled-toilet_1.webp',
          variants: [
              {
                  id: 'C66042V2',
                  name: 'Fully Back To Wall',
                  image: 'assets/productImages/toilet/c66042v2-1000-rimless-fully-back-to-wall-close-coupled-toilet_1.webp',
                  link: 'https://www.bathroommountain.co.uk/boston-rimless-fully-back-to-wall-close-coupled-toilet-with-premium-soft-close-seat-c66042v2',
                  path: '../../models/toilet/C66042V2.glb',
                  dimensions: { width: 38, height: 82.9, depth: 61.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66042V2',
                  price: '159.99',
                  title: 'Boston Rimless Fully Back To Wall Close Coupled Toilet With Premium Soft Close Seat'
              },
              {
                  id: 'C66139V2',
                  name: 'Standard',
                  image: 'assets/productImages/toilet/c66139v2-1000-rimless-close-coupled-toilet-soft-close-slim-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/boston-rimless-close-coupled-toilet-with-premium-soft-close-slim-seat-c66139v2',
                  path: '../../models/toilet/C66139V2.glb',
                  dimensions: { width: 38, height: 83.5, depth: 61.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66139V2',
                  price: '169.00',
                  title: 'Boston Rimless Close Coupled Toilet With Premium Soft Close Slim Seat'
              },
              {
                  id: 'C66226',
                  name: 'Comfort Height With Soft Close Seat',
                  image: 'assets/productImages/toilet/C66226-1000-Rimless-Close-Coupled-Toilet-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/boston-rimless-comfort-height-close-coupled-toilet-with-premium-soft-close-seat-c66226',
                  path: '../../models/toilet/C66226.glb',
                  dimensions: { width: 38, height: 82.9, depth: 61.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66226',
                  price: '183.00',
                  title: 'Boston Rimless Comfort Height Close Coupled Toilet With Premium Soft Close Seat'
              },
              {
                  id: 'C66227',
                  name: 'Comfort Height With Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/C66227-1000-Rimless-Close-Coupled-Toilet-Soft-Close-Slim-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/boston-rimless-comfort-height-close-coupled-toilet-with-premium-soft-close-slim-seat-c66227',
                  path: '../../models/toilet/C66227.glb',
                  dimensions: { width: 89.2, height: 85.5, depth: 89.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66227',
                  price: '183.99',
                  title: 'Boston Rimless Comfort Height Close Coupled Toilet With Premium Soft Close Slim Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_7',
          link: 'https://www.bathroommountain.co.uk/houston-rimless-close-coupled-toilet-with-premium-soft-close-slim-seat-c66230',
          name: 'Houston Rimless Close Coupled Toilet With Premium Soft Close Slim Seat',
          price: '115.00',
          image: 'assets/productImages/toilet/c66230-1000-rimless-close-coupled-toilet-soft-close-slim-seat.webp',
          variants: [
              {
                  id: 'C66230',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/c66230-1000-rimless-close-coupled-toilet-soft-close-slim-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/houston-rimless-close-coupled-toilet-with-premium-soft-close-slim-seat-c66230',
                  path: '../../models/toilet/C66230.glb',
                  dimensions: { width: 38.3, height: 77.8, depth: 64.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66230',
                  price: '115.00',
                  title: 'Houston Rimless Close Coupled Toilet With Premium Soft Close Slim Seat'
              },
              {
                  id: 'C66257',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/c66257-1000-rimless-close-coupled-toilet-soft-close-slim-seat-.webp',
                  link: 'https://www.bathroommountain.co.uk/houston-rimless-close-coupled-toilet-with-premium-soft-close-seat-c66257',
                  path: '../../models/toilet/C66257.glb',
                  dimensions: { width: 38.3, height: 77.8, depth: 64.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66257',
                  price: '115.99',
                  title: 'Houston Rimless Close Coupled Toilet With Premium Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_8',
          link: 'https://www.bathroommountain.co.uk/dallas-rimless-close-coupled-toilet-with-soft-close-seat-c66245',
          name: 'Dallas Rimless Close Coupled Toilet With Soft Close Seat',
          price: '119.99',
          image: 'assets/productImages/toilet/c66245-1000-rimless-close-coupled-toilet-with-soft-close-seat.webp',
          variants: [
              {
                  id: 'C66245',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/c66245-1000-rimless-close-coupled-toilet-with-soft-close-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/dallas-rimless-close-coupled-toilet-with-soft-close-seat-c66245',
                  path: '../../models/toilet/C66245.glb',
                  dimensions: { width: 37, height: 81, depth: 60.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66245',
                  price: '119.99',
                  title: 'Dallas Rimless Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66244',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/c66244-1000-rimless-close-coupled-toilet-slim-soft-close-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/dallas-rimless-close-coupled-toilet-with-slim-soft-close-seat-c66244',
                  path: '../../models/toilet/C66244.glb',
                  dimensions: { width: 37, height: 81, depth: 60.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66244',
                  price: '149.99',
                  title: 'Dallas Rimless Close Coupled Toilet With Slim Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_9',
          link: 'https://www.bathroommountain.co.uk/hudson-traditional-close-coupled-toilet-with-soft-close-seat-c66201',
          name: 'Hudson Traditional Close Coupled Toilet With Soft Close Seat',
          price: '135.99',
          image: 'assets/productImages/toilet/c66201-1000-traditional-close-coupled-toilet-soft-close-seat_1.webp',
          variants: [
              {
                  id: 'C66201',
                  name: 'Standard',
                  image: 'assets/productImages/toilet/c66201-1000-traditional-close-coupled-toilet-soft-close-seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/hudson-traditional-close-coupled-toilet-with-soft-close-seat-c66201',
                  path: '../../models/toilet/C66201.glb',
                  dimensions: { width: 37, height: 81, depth: 60.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66201',
                  price: '135.99',
                  title: 'Hudson Traditional Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66036',
                  name: 'Low-Level Cistern',
                  image: 'assets/productImages/toilet/C66036-1000-Traditional-Toilet-Low-Level-Cistern-Soft-Seat.webp',
                  link: 'https://www.bathroommountain.co.uk/hudson-traditional-toilet-with-low-level-cistern-and-soft-close-seat-c66036',
                  path: '../../models/toilet/C66036.glb',
                  dimensions: { width: 49, height: 119.8, depth: 67.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66201',
                  price: '229.99',
                  title: 'Hudson Traditional Toilet With Low-level Cistern And Soft Close Seat'
              },
              {
                  id: 'C66037',
                  name: 'High-Level Cistern',
                  image: 'assets/productImages/toilet/c66037-1000-traditional-toilet-high-level-cistern-soft-seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/hudson-traditional-toilet-with-high-level-cistern-and-soft-close-seat-c66037',
                  path: '../../models/toilet/C66037.glb',
                  dimensions: { width: 61, height: 207.8, depth: 62.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66037',
                  price: '369.99',
                  title: 'Hudson Traditional Toilet With High-level Cistern And Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_10',
          link: 'https://www.bathroommountain.co.uk/dallas-rimless-comfort-height-close-coupled-toilet-with-soft-close-seat-c66247',
          name: 'Dallas Rimless Comfort Height Close Coupled Toilet With Soft Close Seat',
          price: '143.00',
          image: 'assets/productImages/toilet/c66247-1000-rimless-comfort-height-close-coupled-toilet.webp',
          variants: [
              {
                  id: 'C66247',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/c66247-1000-rimless-comfort-height-close-coupled-toilet.webp',
                  link: 'https://www.bathroommountain.co.uk/dallas-rimless-comfort-height-close-coupled-toilet-with-soft-close-seat-c66247',
                  path: '../../models/toilet/C66247.glb',
                  dimensions: { width: 37, height: 86.5, depth: 60.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66247',
                  price: '143.00',
                  title: 'Dallas Rimless Comfort Height Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66246',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/c66246-1000-rimless-comfort-height-close-coupled-toilet.webp',
                  link: 'https://www.bathroommountain.co.uk/dallas-rimless-comfort-height-close-coupled-toilet-with-slim-soft-close-seat-c66246',
                  path: '../../models/toilet/C66246.glb',
                  dimensions: { width: 37, height: 86.5, depth: 60.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66246',
                  price: '143.99',
                  title: 'Dallas Rimless Comfort Height Close Coupled Toilet With Slim Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_11',
          link: 'https://www.bathroommountain.co.uk/portland-v2-fully-back-to-wall-close-coupled-toilet-with-soft-close-seat-c66181',
          name: 'Portland Fully Back to Wall Close Coupled Toilet With Soft Close Seat',
          price: '143.00',
          image: 'assets/productImages/toilet/C66181-1000-Back-to-Wall-Close-Coupled-Toilet-Soft-Close-Seat.webp',
          variants: [
              {
                  id: 'C66181',
                  name: 'Fully Back To Wall',
                  image: 'assets/productImages/toilet/C66181-1000-Back-to-Wall-Close-Coupled-Toilet-Soft-Close-Seat.webp',
                  link: 'https://www.bathroommountain.co.uk/portland-v2-fully-back-to-wall-close-coupled-toilet-with-soft-close-seat-c66181',
                  path: '../../models/toilet/C66181.glb',
                  dimensions: { width: 37.1, height: 77.7, depth: 60.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66181',
                  price: '143.00',
                  title: 'Portland Fully Back to Wall Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_12',
          link: 'https://www.bathroommountain.co.uk/orlando-close-coupled-toilet-with-soft-close-seat-c66131',
          name: 'Orlando Close Coupled Toilet With Soft Close Seat',
          price: '127.00',
          image: 'assets/productImages/toilet/C66131-1000-Orlando-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
          variants: [
              {
                  id: 'C66131',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/C66131-1000-Orlando-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/orlando-close-coupled-toilet-with-soft-close-seat-c66131',
                  path: '../../models/toilet/C66131.glb',
                  dimensions: { width: 37, height: 77.9, depth: 60.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66131',
                  price: '127.00',
                  title: 'Orlando Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66150',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/C66150-1000-Close-Coupled-Toilet-With-Soft-Close-Slim-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/orlando-close-coupled-toilet-with-soft-close-slim-seat-c66150',
                  path: '../../models/toilet/C66150.glb',
                  dimensions: { width: 37, height: 77.9, depth: 59.2 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66150',
                  price: '179.99',
                  title: 'Orlando Close Coupled Toilet With Soft Close Slim Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_13',
          link: 'https://www.bathroommountain.co.uk/boston-v2-rimless-back-to-wall-toilet-with-premium-soft-close-seat',
          name: 'Boston Rimless Back To Wall Toilet With Premium Soft Close Seat',
          price: '143.99',
          image: 'assets/productImages/toilet/c66176-1000-rimless-back-to-wall-toilet-with-soft-close-seat.webp',
          variants: [
              {
                  id: 'C66176',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/c66176-1000-rimless-back-to-wall-toilet-with-soft-close-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/boston-v2-rimless-back-to-wall-toilet-with-premium-soft-close-seat1',
                  path: '../../models/toilet/C66176.glb',
                  dimensions: { width: 36.9, height: 43.8, depth: 54.3 },
                  floorOffset: 5.7,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66176',
                  price: '143.99',
                  title: 'Boston Rimless Back To Wall Toilet With Premium Soft Close Seat'
              },
              {
                  id: 'C66177',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/c66177-1000-rimless-back-to-wall-toilet-soft-close-slim-seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/boston-rimless-back-to-wall-toilet-with-premium-soft-close-slim-seat',
                  path: '../../models/toilet/C66177.glb',
                  dimensions: { width: 36.9, height: 43.8, depth: 54.3 },
                  floorOffset: 3.8,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66177',
                  price: '143.99',
                  title: 'Boston Rimless Back To Wall Toilet With Premium Soft Close Slim Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_14',
          link: 'https://www.bathroommountain.co.uk/austin-close-coupled-toilet-with-soft-close-seat-c66027',
          name: 'Austin Close Coupled Toilet With Soft Close Seat',
          price: '79.00',
          image: 'assets/productImages/toilet/c66027-1000-austin-close-coupled-toilet-with-soft-close-seat.webp',
          variants: [
              {
                  id: 'C66027',
                  name: 'Austin Close Coupled',
                  image: 'assets/productImages/toilet/c66027-1000-austin-close-coupled-toilet-with-soft-close-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/austin-close-coupled-toilet-with-soft-close-seat-c66027',
                  path: '../../models/toilet/C66027.glb',
                  dimensions: { width: 42.9, height: 76.6, depth: 70.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66027',
                  price: '79.00',
                  title: 'Austin Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_15',
          link: 'https://www.bathroommountain.co.uk/austin-back-to-wall-toilet-with-soft-close-seat-c66028',
          name: 'Austin Back To Wall Toilet With Soft Close Seat',
          price: '89.99',
          image: 'assets/productImages/toilet/C66028-1000-Austin-Back-To-Wall-Toilet-With-Soft-Close-Seat_1.webp',
          variants: [
              {
                  id: 'C66028',
                  name: 'Austin Close Coupled',
                  image: 'assets/productImages/toilet/C66028-1000-Austin-Back-To-Wall-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/austin-back-to-wall-toilet-with-soft-close-seat-c66028',
                  path: '../../models/toilet/C66028.glb',
                  dimensions: { width: 36.5, height: 46.1, depth: 51.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66028',
                  price: '89.99',
                  title: 'Austin Back To Wall Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_16',
          link: 'https://www.bathroommountain.co.uk/atlanta-close-coupled-toilet-with-soft-close-seat-c66127',
          name: 'Atlanta Close Coupled Toilet With Soft Close Seat',
          price: '89.99',
          image: 'assets/productImages/toilet/C66127-1000-Atlanta-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
          variants: [
              {
                  id: 'C66127',
                  name: 'Standard',
                  image: 'assets/productImages/toilet/C66127-1000-Atlanta-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/atlanta-close-coupled-toilet-with-soft-close-seat-c66127',
                  path: '../../models/toilet/C66127.glb',
                  dimensions: { width: 37, height: 78.2, depth: 59.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66127',
                  price: '127.00',
                  title: 'Atlanta Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66128',
                  name: 'Comfort Height',
                  image: 'assets/productImages/toilet/c66128-1000-comfort-close-coupled-toilet-with-soft-close-seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/atlanta-comfort-close-coupled-toilet-with-soft-close-seat-c66128',
                  path: '../../models/toilet/C66128.glb',
                  dimensions: { width: 37, height: 84.3, depth: 59.9 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66128',
                  price: '199.99',
                  title: 'Atlanta Comfort Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66129',
                  name: 'Fully Back To Wall',
                  image: 'assets/productImages/toilet/C66129-1000-Fully-Back-to-Wall-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/austin-back-to-wall-toilet-with-soft-close-seat-c66028',
                  path: '../../models/toilet/C66129.glb',
                  dimensions: { width: 37, height: 78.2, depth: 60 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66129',
                  price: '151.00',
                  title: 'Atlanta Fully Back to Wall Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_17',
          link: 'https://www.bathroommountain.co.uk/hudson-traditional-close-coupled-toilet-with-chalk-white-wooden-seat-c66203',
          name: 'Hudson Traditional Close Coupled Toilet With Chalk White Wooden Seat',
          price: '159.00',
          image: 'assets/productImages/toilet/C66203-1000-Traditional-Close-Coupled-Toilet-White-Wooden-Seat_4.webp',
          variants: [
              {
                  id: 'C66203',
                  name: 'Standard',
                  image: 'assets/productImages/toilet/C66203-1000-Traditional-Close-Coupled-Toilet-White-Wooden-Seat_4.webp',
                  link: 'https://www.bathroommountain.co.uk/hudson-traditional-close-coupled-toilet-with-chalk-white-wooden-seat-c66203',
                  path: '../../models/toilet/C66203.glb',
                  dimensions: { width: 49, height: 82.1, depth: 72.3 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66203',
                  price: '159.00',
                  title: 'Hudson Traditional Close Coupled Toilet With Chalk White Wooden Seat'
              },
              {
                  id: 'C66192',
                  name: 'High-Level Cistern',
                  image: 'assets/productImages/toilet/C66192-1000-Traditional-Toilet-High-Level-Cistern-Wooden-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/hudson-traditional-toilet-with-high-level-cistern-and-chalk-white-wooden-seat-c66192',
                  path: '../../models/toilet/C66192.glb',
                  dimensions: { width: 61, height: 207.8, depth: 62.8 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66192',
                  price: '399.99',
                  title: 'Hudson Traditional Toilet With High-Level Cistern and Chalk White Wooden Seat'
              },
              {
                  id: 'C66189',
                  name: 'Low-Level Cistern',
                  image: 'assets/productImages/toilet/C66189-1000-Traditional-Toilet-Low-Level-Cistern-Wooden-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/hudson-traditional-toilet-with-low-level-cistern-and-chalk-white-wooden-seat-c66189',
                  path: '../../models/toilet/C66189.glb',
                  dimensions: { width: 49, height: 119.8, depth: 66.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66129',
                  price: '151.99',
                  title: 'Hudson Traditional Toilet With Low-Level Cistern and Chalk White Wooden Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_18',
          link: 'https://www.bathroommountain.co.uk/utah-rimless-wall-hung-toilet-with-premium-soft-close-seat-c66273',
          name: 'Utah Rimless Wall Hung Toilet With Premium Soft Close Seat',
          price: '127.00',
          image: 'assets/productImages/toilet/C66273-1000-Rimless-Wall-Hung-Toilet-Soft-Close-Seat_1.webp',
          variants: [
              {
                  id: 'C66273',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/C66273-1000-Rimless-Wall-Hung-Toilet-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/utah-rimless-wall-hung-toilet-with-premium-soft-close-seat-c66273',
                  path: '../../models/toilet/C66273.glb',
                  dimensions: { width: 36.6, height: 40.8, depth: 48.8 },
                  floorOffset: 7.4,
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66273',
                  price: '127.00',
                  title: 'Utah Rimless Wall Hung Toilet With Premium Soft Close Seat'
              },
              {
                  id: 'C66274',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/C66274-1000-Rimless-Wall-Hung-Toilet-Soft-Close-Slim-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/utah-rimless-wall-hung-toilet-with-premium-soft-close-slim-seat-c66274',
                  path: '../../models/toilet/C66274.glb',
                  dimensions: { width: 36.4, height: 41.5, depth: 49 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66274',
                  price: '159.99',
                  title: 'Utah Rimless Wall Hung Toilet With Premium Soft Close Slim Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_19',
          link: 'https://www.bathroommountain.co.uk/casper-rimless-close-coupled-toilet-with-soft-close-seat-c66286',
          name: 'Casper Rimless Close Coupled Toilet With Soft Close Seat',
          price: '95.00',
          image: 'assets/productImages/toilet/C66286-1000-Rimless-Close-Coupled-Toilet-With-Soft-Close-Seat.webp',
          variants: [
              {
                  id: 'C66286',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/C66286-1000-Rimless-Close-Coupled-Toilet-With-Soft-Close-Seat.webp',
                  link: 'https://www.bathroommountain.co.uk/utah-rimless-wall-hung-toilet-with-premium-soft-close-slim-seat-c66274',
                  path: '../../models/toilet/C66286.glb',
                  dimensions: { width: 36.5, height: 46.1, depth: 51.7 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66286',
                  price: '95',
                  title: 'Casper Rimless Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_20',
          link: 'https://www.bathroommountain.co.uk/seattle-close-coupled-toilet-with-soft-close-seat-c66029',
          name: 'Seattle Rimless Close Coupled Toilet With Soft Close Seat',
          price: '124.99',
          image: 'assets/productImages/toilet/c66029-1000-seattle-close-coupled-toilet-with-soft-close-seat_1.webp',
          variants: [
              {
                  id: 'C66029',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/c66029-1000-seattle-close-coupled-toilet-with-soft-close-seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/seattle-close-coupled-toilet-with-soft-close-seat-c66029',
                  path: '../../models/toilet/C66029.glb',
                  dimensions: { width: 35.8, height: 80.2, depth: 60 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66029',
                  price: '124.99',
                  title: 'Seattle Rimless Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_21',
          link: 'https://www.bathroommountain.co.uk/utah-rimless-close-coupled-toilet-with-premium-soft-close-seat-c66271',
          name: 'Utah Rimless Close Coupled Toilet With Premium Soft Close Seat',
          price: '175.00',
          image: 'assets/productImages/toilet/c66271-1000-rimless-close-coupled-toilet-soft-close-seat.webp',
          variants: [
              {
                  id: 'C66271',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/c66271-1000-rimless-close-coupled-toilet-soft-close-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/utah-rimless-close-coupled-toilet-with-premium-soft-close-seat-c66271',
                  path: '../../models/toilet/C66271.glb',
                  dimensions: { width: 86.8, height: 82.8, depth: 87.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66271',
                  price: '175.00',
                  title: 'Utah Rimless Close Coupled Toilet With Premium Soft Close Slim Seat'
              },
              {
                  id: 'C66272',
                  name: 'Soft Close Slim Seat',
                  image: 'assets/productImages/toilet/c66272-1000-rimless-close-coupled-toilet-soft-close-slim-seat.webp',
                  link: 'https://www.bathroommountain.co.uk/utah-rimless-close-coupled-toilet-with-premium-soft-close-slim-seat-c66272',
                  path: '../../models/toilet/C66272.glb',
                  dimensions: { width: 86.7, height: 82.8, depth: 87.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66272',
                  price: '219.99',
                  title: 'Utah Rimless Close Coupled Toilet With Premium Soft Close Slim Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_22',
          link: 'https://www.bathroommountain.co.uk/denver-back-to-wall-toilet-with-soft-close-seat-c66032',
          name: 'Denver Back To Wall Toilet With Soft Close Seat',
          price: '139.99',
          image: 'assets/productImages/toilet/C66032-1000-Denver-Back-To-Wall-Toilet-With-Soft-Close-Seat_1.webp',
          variants: [
              {
                  id: 'C66032',
                  name: 'Soft Close Seat',
                  image: 'assets/productImages/toilet/C66032-1000-Denver-Back-To-Wall-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-back-to-wall-toilet-with-soft-close-seat-c66032',
                  path: '../../models/toilet/C66032.glb',
                  dimensions: { width: 36.3, height: 45.1, depth: 51.1 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66032',
                  price: '139.99',
                  title: 'Denver Back To Wall Toilet With Soft Close Seat'
              },
              {
                  id: 'C66138',
                  name: 'Slim Soft Close Seat',
                  image: 'assets/productImages/toilet/C66138-1000-Back-To-Wall-Toilet-With-Soft-Close-Slim-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-back-to-wall-toilet-with-soft-close-slim-seat-c66138',
                  path: '../../models/toilet/C66138.glb',
                  dimensions: { width: 35.9, height: 47, depth: 50.6 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66138',
                  price: '159.99',
                  title: 'Denver Back To Wall Toilet With Soft Close Slim Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
    {
          id: 'toilet_variant_23',
          link: 'https://www.bathroommountain.co.uk/denver-rimless-comfort-height-close-coupled-toilet-with-soft-close-seat-c66215',
          name: 'Denver Rimless Comfort Height Close Coupled Toilet With Soft Close Seat',
          price: '199.99',
          image: 'assets/productImages/toilet/C66215-1000-Rimless-Comfort-Height-Close-Coupled-Toilet_2.webp',
          variants: [
              {
                  id: 'C66215',
                  name: 'Comfort Height',
                  image: 'assets/productImages/toilet/C66215-1000-Rimless-Comfort-Height-Close-Coupled-Toilet_2.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-rimless-comfort-height-close-coupled-toilet-with-soft-close-seat-c66215',
                  path: '../../models/toilet/C66215.glb',
                  dimensions: { width: 37.5, height: 86.2, depth: 65 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66215',
                  price: '199.99',
                  title: 'Denver Rimless Comfort Height Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66216',
                  name: 'Fully Back To Wall',
                  image: 'assets/productImages/toilet/C66216-1000-Rimless-Fully-Back-to-Wall-Close-Coupled-Toilet_2.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-rimless-fully-back-to-wall-close-coupled-toilet-with-soft-close-seat-c66216',
                  path: '../../models/toilet/C66216.glb',
                  dimensions: { width: 37.5, height: 83.4, depth: 65 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66216',
                  price: '159.00',
                  title: 'Denver Rimless Fully Back to Wall Close Coupled Toilet With Soft Close Seat'
              },
              {
                  id: 'C66214',
                  name: 'Standard',
                  image: 'assets/productImages/toilet/C66214-1000-Rimless-Close-Coupled-Toilet-With-Soft-Close-Seat_1.webp',
                  link: 'https://www.bathroommountain.co.uk/denver-rimless-close-coupled-toilet-with-soft-close-seat-c66214',
                  path: '../../models/toilet/C66214.glb',
                  dimensions: { width: 37.5, height: 82.2, depth: 65 },
                  orientation: {
                      type: 'face_into_room',
                      wallBuffer: 0, // Flush with wall - no gap
                      description: 'Item is part of wall opening'
                  },
                  movement: { // NEW: Sink movement configuration
                      snapToWall: true,
                      allowVerticalMovement: false,
                      allowFreeRotation: false
                  },
                  sku: 'C66214',
                  price: '159.99',
                  title: 'Denver Rimless Close Coupled Toilet With Soft Close Seat'
              },
          ],
          variantType: 'Style Options',
          features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
      },
  ],

  TowelRails: [
        {
            id: 'heated_towel_rail_1',
            link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-650x400mm-c36213',
            name: 'Barcelona Electric Chrome Straight Heated Towel Rail 650x400mm',
            price: '91.00',
            image: 'assets/productImages/heatedTowelRails/c36213-1000-electric-chrome-heated-towel-rail-650x400mm_1.webp',
            variants: [
                {
                    id: 'heated_towel_rails_1',
                    name: '400X650mm',
                    image: 'assets/productImages/heatedTowelRails/c36213-1000-electric-chrome-heated-towel-rail-650x400mm_1.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-650x400mm-c36213',
                    path: '../../models/heatedTowelRails/C36213.glb',
                    dimensions: {
                        width: 45.9, // 110mm diameter = ~11cm width
                        height: 85.5, // 260mm + 15mm cap = 27.5cm total height
                        depth: 24.5 // Same as width for circular pipe
                    },
                    floorOffset: 6.8,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36213',
                    price: '91.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 650x400mm'
                },
                {
                    id: 'heated_towel_rails_2',
                    name: '800X400mm',
                    image: 'assets/productImages/heatedTowelRails/c36214-1000-electric-chrome-heated-towel-rail-800x400mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-800x400mm-c36214',
                    path: '../../models/heatedTowelRails/C36214.glb',
                    dimensions: {
                        width: 46, // 110mm diameter = ~11cm width
                        height: 100.4, // 260mm + 15mm cap = 27.5cm total height
                        depth: 24.4 // Same as width for circular pipe
                    },
                    floorOffset: 6.7,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36214',
                    price: '119.99',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 800x400mm'
                },
                {
                    id: 'heated_towel_rails_3',
                    name: '800X500mm',
                    image: 'assets/productImages/heatedTowelRails/c36215-1000-electric-chrome-heated-towel-rail-800x500mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-800x500mm-c36215',
                    path: '../../models/heatedTowelRails/C36215.glb',
                    dimensions: {
                        width: 55.9, // 110mm diameter = ~11cm width
                        height: 100.4, // 260mm + 15mm cap = 27.5cm total height
                        depth: 24.4 // Same as width for circular pipe
                    },
                    floorOffset: 5.7,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36215',
                    price: '103.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 800x500mm'
                },
                {
                    id: 'heated_towel_rails_4',
                    name: '800X600mm',
                    image: 'assets/productImages/heatedTowelRails/c36216-1000-electric-chrome-heated-towel-rail-800x600mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-800x600mm-c36216',
                    path: '../../models/heatedTowelRails/C36216.glb',
                    dimensions: {
                        width: 64.2, // 110mm diameter = ~11cm width
                        height: 100.5, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 11.5,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36216',
                    price: '139.99',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 800x600mm'
                },
                {
                    id: 'heated_towel_rails_5',
                    name: '1000X400mm',
                    image: 'assets/productImages/heatedTowelRails/c36217-1000-electric-chrome-heated-towel-rail-1000x400mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1000x400mm-c36217',
                    path: '../../models/heatedTowelRails/C36217.glb',
                    dimensions: {
                        width: 44.2, // 110mm diameter = ~11cm width
                        height: 120.4, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 7,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36217',
                    price: '134.99',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1000x400mm'
                },
                {
                    id: 'heated_towel_rails_6',
                    name: '1000X500mm',
                    image: 'assets/productImages/heatedTowelRails/c36218-1000-electric-chrome-heated-towel-rail-1000x500mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1000x500mm-c36218',
                    path: '../../models/heatedTowelRails/C36218.glb',
                    dimensions: {
                        width: 54.2, // 110mm diameter = ~11cm width
                        height: 120.4, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 6.9,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36218',
                    price: '115.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1000x500mm'
                },
                {
                    id: 'heated_towel_rails_7',
                    name: '1000X600mm',
                    image: 'assets/productImages/heatedTowelRails/c36219-1000-electric-chrome-heated-towel-rail-1000x600mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1000x600mm-c36219',
                    path: '../../models/heatedTowelRails/C36219.glb',
                    dimensions: {
                        width: 64.2, // 110mm diameter = ~11cm width
                        height: 120.4, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 7.2,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36219',
                    price: '154.99',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1000x600mm'
                },
                {
                    id: 'heated_towel_rails_8',
                    name: '1200X400mm',
                    image: 'assets/productImages/heatedTowelRails/c36220-1000-electric-chrome-heated-towel-rail-1200x400mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1200x400mm-c36220',
                    path: '../../models/heatedTowelRails/C36220.glb',
                    dimensions: {
                        width: 44.2, // 110mm diameter = ~11cm width
                        height: 140.5, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 11.4,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36220',
                    price: '119.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1200x400mm'
                },
                {
                    id: 'heated_towel_rails_9',
                    name: '1200X500mm',
                    image: 'assets/productImages/heatedTowelRails/c36221-1000-electric-chrome-heated-towel-rail-1200x500mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1200x500mm-c36221',
                    path: '../../models/heatedTowelRails/C36221.glb',
                    dimensions: {
                        width: 54.3, // 110mm diameter = ~11cm width
                        height: 140.5, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 9.9,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36221',
                    price: '159.99',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1200x500mm'
                },
                {
                    id: 'heated_towel_rails_10',
                    name: '1200X600mm',
                    image: 'assets/productImages/heatedTowelRails/c36222-1000-electric-chrome-heated-towel-rail-1200x600mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1200x600mm-c36222',
                    path: '../../models/heatedTowelRails/C36222.glb',
                    dimensions: {
                        width: 64.2, // 110mm diameter = ~11cm width
                        height: 140.5, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 6.5,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36222',
                    price: '135.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1200x600mm'
                },
                {
                    id: 'heated_towel_rails_11',
                    name: '1600X400mm',
                    image: 'assets/productImages/heatedTowelRails/c36223-1000-electric-chrome-heated-towel-rail-1600x400mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1600x400mm-c36223',
                    path: '../../models/heatedTowelRails/C36223.glb',
                    dimensions: {
                        width: 44, // 110mm diameter = ~11cm width
                        height: 161.3, // 260mm + 15mm cap = 27.5cm total height
                        depth: 10.1 // Same as width for circular pipe
                    },
                    floorOffset: 10.3,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36223',
                    price: '135.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1600x400mm'
                },
                {
                    id: 'heated_towel_rails_12',
                    name: '1600X500mm',
                    image: 'assets/productImages/heatedTowelRails/c36224-1000-electric-chrome-heated-towel-rail-1600x500mm_1.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1600x500mm-c36224',
                    path: '../../models/heatedTowelRails/C36224.glb',
                    dimensions: {
                        width: 54.2, // 110mm diameter = ~11cm width
                        height: 161.3, // 260mm + 15mm cap = 27.5cm total height
                        depth: 11.9 // Same as width for circular pipe
                    },
                    floorOffset: 6,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36224',
                    price: '184.99',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1600x500mm'
                },
                {
                    id: 'heated_towel_rails_13',
                    name: '1600X600mm',
                    image: 'assets/productImages/heatedTowelRails/c36225-1000-electric-chrome-heated-towel-rail-1600x600mm.webp',
                    link: 'https://www.bathroommountain.co.uk/barcelona-electric-chrome-straight-heated-towel-rail-1600-600mm-c36225',
                    path: '../../models/heatedTowelRails/C36225.glb',
                    dimensions: {
                        width: 64.3, // 110mm diameter = ~11cm width
                        height: 180.4, // 260mm + 15mm cap = 27.5cm total height
                        depth: 12.0 // Same as width for circular pipe
                    },
                    floorOffset: 6.1,
                    movement: {
                        snapToWall: true,
                        allowVerticalMovement: true, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'C36225',
                    price: '91.00',
                    title: 'Barcelona Electric Chrome Straight Heated Towel Rail 1600x600mm'
                },
            ],
            variantType: 'Size Options',
            features: []
        },
    ],

  Plumbing: [
        {
            id: 'soil_pipe_1',
            link: 'https://www.bathroommountain.co.uk/soil-pipe-connector',
            name: 'Soil Pipe Connector',
            price: '89.99',
            image: 'assets/productImages/plumbing/soil-pipe-110mm.webp',
            variants: [
                {
                    id: 'soil_pipe_110mm',
                    name: '110mm Diameter',
                    image: 'assets/productImages/plumbing/soil-pipe-110mm.webp',
                    link: 'https://www.bathroommountain.co.uk/soil-pipe-110mm-connector',
                    path: '../../models/plumbing/soil-pipe-new.glb',
                    dimensions: {
                        width: 17, // 110mm diameter = ~11cm width
                        height: 33, // 260mm + 15mm cap = 27.5cm total height
                        depth: 17 // Same as width for circular pipe
                    },
                    floorOffset: 0, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
                    spawnHeight: 0, // ✅ CRITICAL: Set to 0 since GLB bottom is at Y=0
                    movement: {
                        snapToWall: false,
                        allowVerticalMovement: false, // Keep on floor
                        allowFreeRotation: false,
                    },
                    sku: 'SP110MM',
                    price: '89.99',
                    title: '110mm Soil Pipe Connector with Inspection Cap'
                },
                {
                    id: 'corner_column_150',
                    name: '150×150×2400mm',
                    image: 'assets/productImages/plumbing/rectangularColumn.webp',
                    path: '../../models/plumbing/rectangular_column.glb',
                    link: 'https://www.bathroommountain.co.uk/150mm-corner-column-boxing-tile-ready',
                    dimensions: {
                        width: 25,    // 25cm
                        height: 26,   // 26cm
                        depth: 25     // 25cm
                    },
                    floorOffset: 0,
                    spawnHeight: 0,
                    orientation: {
                        type: 'face_into_room',
                        wallBuffer: 10,
                        description: 'Item is part of wall opening'
                    },
                    movement: { // NEW: Sink movement configuration
                        snapToWall: true,
                        allowVerticalMovement: false,
                        allowFreeRotation: false
                    },
                    sku: 'CC150X150',
                    price: '45.99',
                    title: '150mm Corner Column Boxing - Tile Ready'
                }
            ],
            variantType: 'Size Options',
            features: ['110mm Standard Size', '4 Screw Mounting Holes', 'Inspection Cap', 'PVC Construction']
        },
    ]
};

export default productData;

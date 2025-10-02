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
      features: ['6mm Tempered Glass', 'Sliding Door', 'Easy Clean Glass']
    }
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
      name: 'Kensington 1700mm Freestanding Slipper Bath\n',
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
        }
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
                  link: 'https://www.bathroommountain.co.uk/l-shaped-1700-shower-bath-with-front-panel-6mm-easy-clean-brushed-brass-bath-screen-right-handed-c57499',
                  path: '../../models/bath/C53017.glb',
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
                  sku: 'C53017',
                  price: '139.99',
                  title: 'Stafford 1600x700 Round Single Ended Bath'
              },
          ],
          variantType: 'Orientation',
          features: ['L-Shaped Design', 'Shower Screen Included', 'Front Panel Included']
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
                    floorOffset: 6.7, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 5.7, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 11.5, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 7, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 6.9, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 7.2, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 11.4, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 9.9, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 6.5, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 10.3, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 6, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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
                    floorOffset: 6.1, // ✅ CRITICAL: Set to 0 since GLB is already floor-positioned
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

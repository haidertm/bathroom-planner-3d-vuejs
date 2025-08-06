import { ObjectModel } from '../utils/constraints';

type ProductColor = {
  id: string;
  name: string;
  color: string;
};

type ProductData = {
  [key: string]: {
    id: string;
    link: string;
    name: string;
    price: string;
    image: string;
    variants: ObjectModel[];
    variantType: string;
    colors: ProductColor[];
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
      price: '249.99',
      image: 'assets/productImages/furniture/C76237-1000-White-Basin-Drawer-Vanity-600mm_1.webp',
      variants: [
        {
          id: 'C76236',
          name: 'Wall Hung Slimline Basin Drawer Vanity 600mm',
          image: 'assets/productImages/furniture/C76236-1000-White-Wall-Hung-Basin-Drawer-Vanity-600mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/corsica-gloss-white-wall-hung-short-projection-basin-drawer-vanity-600mm-c76236',
          path: '../../models/furniture/basin/C76236.glb',
          dimensions: { width: 60.4, height: 55, depth: 34.7 },
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
          sku: 'C76236',
          price: '249.99',
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
          price: '249.99',
          title: 'Corsica Gloss White Slimline Basin Drawer Vanity 600mm'
        }
      ],
      variantType: 'Style Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    // Furniture Variant 2 (4 variants)
    {
      id: 'furniture_variant_2',
      link: 'https://www.bathroommountain.co.uk/bali-gloss-white-basin-drawer-vanity-600mm',
      name: 'Bali Gloss White Wall Hung Basin Drawer Vanity',
      price: '399.99',
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
          price: '399.99',
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
          price: '429.99',
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
          price: '415',
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
          price: '431',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 1000mm'
        }
      ],
      variantType: 'Width Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' },
        { id: 'c2', name: 'Matt Grey', color: '#6b7280' }
      ],
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    }
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
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: '73189V2',
          price: '399',
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
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: '73104V2',
          price: '319.99',
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
          floorOffset: 0,
          sku: '73103V2',
          price: '259.99',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 600x450mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Silver Frame', color: '#c0c0c0' }
      ],
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
      colors: [
        { id: 'c1', name: 'Clear', color: '#f0f0f0' }
      ],
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
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: '31022',
          price: '289.99',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x560mm'
        },
        {
          id: '31063',
          name: '1800x560mm',
          image: 'assets/productImages/radiator/31063-1000-anthracite-double-flat-panel-vertical-radiator-1800x560mm.webp',
          link: 'https://www.bathroommountain.co.uk/faro-anthracite-double-flat-panel-vertical-radiator-1800x560mm-31063',
          path: '../../models/radiator/31063.glb',
          dimensions: { width: 65.8, height: 183.2, depth: 11.3 },
          sku: '31063',
          price: '255',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1800x560mm'
        },
        {
          id: '31019',
          name: '1600x350mm',
          image: 'assets/productImages/radiator/31019-1000-Anthracite-Double-Flat-Panel-Vertical-Radiator-1600x350mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-anthracite-double-flat-panel-vertical-radiator-1600x350mm-31019',
          path: '../../models/radiator/31019.glb',
          dimensions: { width: 44.8, height: 163, depth: 11.3 },
          sku: '31019',
          price: '151',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x350mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Anthracite', color: '#404040' },
        { id: 'c2', name: 'White', color: '#ffffff' }
      ],
      features: ['Double Panel', 'Vertical Design', 'High Heat Output']
    },

    // Radiator Variant 2 (2 variants)
    {
      id: 'radiator_variant_2',
      link: 'https://www.bathroommountain.co.uk/faro-matt-black-double-flat-panel-horizontal-radiator-600x1190mm',
      name: 'Faro Matt Black Double Flat Panel Horizontal Radiator',
      price: '289.99',
      image: 'assets/productImages/radiator/32124-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x420mm_1.webp',
      variants: [
        {
          id: '32128',
          name: '600x1190mm',
          image: 'assets/productImages/radiator/32128-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x1190mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-matt-black-double-flat-panel-horizontal-radiator-600x1190mm',
          path: '../../models/radiator/32128.glb',
          dimensions: { width: 128.5, height: 63, depth: 11.3 },
          sku: '32128',
          price: '289.99',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x1190mm'
        },
        {
          id: '32124',
          name: '600x420mm',
          image: 'assets/productImages/radiator/32124-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x420mm_1.webp',
          link: 'https://www.bathroommountain.co.uk/faro-matt-black-double-flat-panel-horizontal-radiator-600x420mm',
          path: '../../models/radiator/32124.glb',
          dimensions: { width: 51.5, height: 63, depth: 11.3 },
          sku: '32124',
          price: '109.99',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x420mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Matt Black', color: '#000000' },
        { id: 'c2', name: 'White', color: '#ffffff' }
      ],
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
          dimensions: { width: 70, height: 185.5, depth: 100.4 },
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
          dimensions: { width: 76.1, height: 185.5, depth: 100.4 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening',
            // rotationOffset: Math.PI // Rotate to face into room
          },
          movement: { // NEW: Sink movement configuration
            snapToWall: true,
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C46006',
          price: '229.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x760mm'
        },
        {
          id: 'c46009',
          name: '1200x800mm',
          image: 'assets/productImages/shower/C46009-1000-London-Matt-Black-6mm-Sliding-Shower-Enclosure-1200x800mm_2.webp',
          link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1200x800mm-c46009',
          path: '../../models/shower/C46009.glb',
          dimensions: { width: 80.2, height: 185.5, depth: 120.1 },
          sku: 'C46009',
          price: '254.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1200x800mm'
        },
        {
          id: 'c46175',
          name: '1400x900mm',
          image: 'assets/productImages/shower/C46175-1000-London-Matt-Black-6mm-Sliding-Shower-Enclosure-1400x900mm_1_1.webp',
          link: 'https://www.bathroommountain.co.uk/london-matt-black-6mm-sliding-shower-enclosure-1400x900mm-c46175',
          path: '../../models/shower/C46175.glb',
          dimensions: { width: 90, height: 185.5, depth: 139.4 },
          sku: 'C46175',
          price: '231',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1400x900mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Matt Black', color: '#000000' },
        { id: 'c2', name: 'Chrome', color: '#c0c0c0' }
      ],
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
          price: '383',
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
          price: '489.99',
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
          price: '399',
          title: 'Newham 1700mm Freestanding Bath'
        }
      ],
      variantType: 'Length Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
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
            allowVerticalMovement: false,
            allowFreeRotation: false
          },
          sku: 'C57499',
          price: '391.99',
          title: 'L Shaped 1700 Shower Bath with Front Panel & 6mm Easy Clean Brushed Brass Bath Screen - Right Handed'
        }
      ],
      variantType: 'Orientation',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['L-Shaped Design', 'Shower Screen Included', 'Front Panel Included']
    }
  ],

  Toilet: [
    // Toilet Variant 1 (2 variants)
    {
      id: 'toilet_variant_1',
      link: 'https://www.bathroommountain.co.uk/nevada-v2-rimless-wall-hung-toilet-with-premium-soft-close-slim-seat',
      name: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Seat',
      price: '179.99',
      image: 'assets/productImages/toilet/c66174-1000-rimless-wall-hung-toilet-with-soft-close-seat.webp',
      variants: [
        {
          id: 'c66175',
          name: 'Slim Seat',
          image: 'assets/productImages/toilet/c66175-1000-rimless-wall-hung-toilet-with-soft-close-slim-seat.webp',
          link: 'https://www.bathroommountain.co.uk/nevada-v2-rimless-wall-hung-toilet-with-premium-soft-close-slim-seat',
          path: '../../models/toilet/C66175.glb',
          dimensions: { width: 35.2, height: 40.5, depth: 52.7 },
          orientation: {
            type: 'face_into_room',
            wallBuffer: 0, // Flush with wall - no gap
            description: 'Item is part of wall opening'
          },
          sku: 'C66175',
          price: '143',
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
          sku: 'C66174',
          price: '179.99',
          title: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Seat'
        }
      ],
      variantType: 'Seat Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Rimless Design', 'Soft Close Seat', 'Wall Hung', 'Premium Quality']
    },

    // Toilet Variant 2 (3 variants)
    {
      id: 'toilet_variant_2',
      link: 'https://www.bathroommountain.co.uk/portland-v2-comfort-height-close-coupled-toilet-with-soft-close-slim-seat-c66185',
      name: 'Portland Close Coupled Toilet With Soft Close Seat',
      price: '209.99',
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
          sku: 'C66183',
          price: '169.99',
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
          sku: 'C66185',
          price: '209.99',
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
          sku: 'C66184',
          price: '151',
          title: 'Portland Fully Back to Wall Close Coupled Toilet With Soft Close Slim Seat'
        }
      ],
      variantType: 'Style Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
    }
  ]
};

export default productData;

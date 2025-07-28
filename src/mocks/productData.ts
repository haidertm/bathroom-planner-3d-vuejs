export default {
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
          path: '../../models/furniture/basin/C76236.glb',
          dimensions: { width: 60.4, height: 55, depth: 34.7 },
          sku: 'C76236',
          price: '249.99',
          title: 'Corsica Gloss White Wall Hung Slimline Basin Drawer Vanity 600mm'
        },
        {
          id: 'C76237',
          name: 'Slimline Basin Drawer Vanity 600mm',
          path: '../../models/furniture/basin/C76237.glb',
          dimensions: { width: 60.4, height: 85, depth: 34.7 },
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
          path: '../../models/furniture/basin/C77605.glb',
          dimensions: { width: 61, height: 83, depth: 44 },
          sku: 'C77605',
          price: '399.99',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 600mm'
        },
        {
          id: 'C77606',
          name: '800mm Width',
          sku: 'C77606',
          path: '../../models/furniture/basin/C77606.glb',
          dimensions: { width: 81.3, height: 53, depth: 44 },
          price: '399.99',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 800mm'
        },
        {
          id: 'C77607',
          name: '900mm Width',
          sku: 'C77607',
          path: '../../models/furniture/basin/C77607.glb',
          dimensions: { width: 81.3, height: 83.4, depth: 44 },
          price: '399.99',
          title: 'Bali Gloss White Basin Drawer Vanity 900mm'
        },
        {
          id: 'C77608',
          name: '1000mm Width',
          sku: 'C77608',
          path: '../../models/furniture/basin/C77608.glb',
          dimensions: { width: 100.08, height: 53, depth: 43.9 },
          price: '399.99',
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
          path: '../../models/mirror/73189V2.glb',
          dimensions: { width: 119.8, height: 64.8, depth: 13.8 },
          sku: '73189V2',
          price: '499.99',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 650x1200mm'
        },
        {
          id: '73104v2',
          name: '600x600mm',
          path: '../../models/mirror/73104V2.glb',
          dimensions: { width: 59, height: 59.9, depth: 13.5 },
          sku: '73104V2',
          price: '499.99',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 600x600mm'
        },
        {
          id: '73103v2',
          name: '600x450mm',
          path: '../../models/mirror/73103V2.glb',
          dimensions: { width: 45, height: 60, depth: 13 },
          sku: '73103V2',
          price: '499.99',
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
          dimensions: { width: 119.5, height: 49.9, depth: 5.1 },
          path: '../../models/mirror/73035V2.glb',
          sku: '73035V2',
          price: '139.99',
          title: 'Evelyn Large Illuminated LED Mirror 500x1200mm'
        },
        {
          id: '73154v2',
          name: '500x1000mm',
          path: '../../models/mirror/73154V2.glb',
          dimensions: { width: 100, height: 50, depth: 5.3 },
          sku: '73154V2',
          price: '139.99',
          title: 'Evelyn Illuminated LED Mirror 500x1000mm'
        },
        {
          id: '73153v2',
          name: '600x400mm',
          path: '../../models/mirror/73153V2.glb',
          dimensions: { width: 39.8, height: 59.9, depth: 5.3 },
          sku: '73153V2',
          price: '139.99',
          title: 'Evelyn Illuminated LED Mirror 600x400mm'
        },
        {
          id: '73033v2',
          name: '700x500mm',
          path: '../../models/mirror/73033V2.glb',
          dimensions: { width: 50, height: 70, depth: 5.1 },
          sku: '73033V2',
          price: '139.99',
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
          path: '../../models/radiator/31022.glb',
          sku: '31022',
          price: '289.99',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x560mm'
        },
        {
          id: '31063',
          name: '1800x560mm',
          path: '../../models/radiator/31063.glb',
          sku: '31063',
          price: '289.99',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1800x560mm'
        },
        {
          id: '31019',
          name: '1600x350mm',
          path: '../../models/radiator/31019.glb',
          sku: '31019',
          price: '289.99',
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
          path: '../../models/radiator/32128.glb',
          sku: '32128',
          price: '289.99',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x1190mm'
        },
        {
          id: '32124',
          name: '600x420mm',
          path: '../../models/radiator/32124.glb',
          sku: '32124',
          price: '289.99',
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
          path: '../../models/shower/C46247.glb',
          dimensions: { width: 70, height: 185.5, depth: 100.4 },
          sku: 'C46247',
          price: '219.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x700mm'
        },
        {
          id: 'c46006',
          name: '1000x760mm',
          path: '../../models/shower/C46006.glb',
          dimensions: { width: 76.1, height: 185.5, depth: 100.4 },
          sku: 'C46006',
          price: '219.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x760mm'
        },
        {
          id: 'c46009',
          name: '1200x800mm',
          path: '../../models/shower/C46009.glb',
          dimensions: { width: 80.2, height: 185.5, depth: 120.1 },
          sku: 'C46009',
          price: '219.99',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1200x800mm'
        },
        {
          id: 'c46175',
          name: '1400x900mm',
          path: '../../models/shower/C46175.glb',
          dimensions: { width: 90, height: 185.5, depth: 139.4 },
          sku: 'C46175',
          price: '219.99',
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
          path: '../../models/bath/C51096.glb',
          dimensions: { width: 136.9, height: 55, depth: 72.9 },
          sku: 'C51096',
          price: '399.95',
          title: 'Newham 1370mm Freestanding Bath'
        },
        {
          id: 'c51092',
          name: '1500mm Length',
          path: '../../models/bath/C51092.glb',
          dimensions: { width: 151.7, height: 57.9, depth: 74.8 },
          sku: 'C51092',
          price: '449.95',
          title: 'Newham 1500mm Freestanding Bath'
        },
        {
          id: 'c51093',
          name: '1700mm Length',
          path: '../../models/bath/C51093.glb',
          dimensions: { width: 169.7, height: 58, depth: 77.8 },
          sku: 'C51093',
          price: '499.95',
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
          path: '../../models/bath/C57499.glb',
          dimensions: { width: 173.3, height: 195.4, depth: 85.2 },
          sku: 'C57499',
          price: '599.95',
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
          path: '../../models/toilet/C66175.glb',
          dimensions: { width: 35.2, height: 40.5, depth: 52.7 },
          sku: 'C66175',
          price: '179.99',
          title: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Slim Seat'
        },
        {
          id: 'c66174',
          name: 'Standard Seat',
          path: '../../models/toilet/C66174.glb',
          dimensions: { width: 36.2, height: 30.8, depth: 52.4 },
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
          path: '../../models/toilet/C66183.glb',
          dimensions: { width: 37.1, height: 77.6, depth: 60.1 },
          sku: 'C66183',
          price: '209.99',
          title: 'Portland Close Coupled Toilet With Soft Close Slim Seat'
        },
        {
          id: 'c66185',
          name: 'Comfort Height',
          path: '../../models/toilet/C66185.glb',
          dimensions: { width: 37.1, height: 82.5, depth: 60.9 },
          sku: 'C66185',
          price: '209.99',
          title: 'Portland Comfort Height Close Coupled Toilet With Soft Close Slim Seat'
        },
        {
          id: 'c66184',
          name: 'Back to Wall',
          path: '../../models/toilet/C66184.glb',
          dimensions: { width: 37.1, height: 77.6, depth: 60.2 },
          sku: 'C66184',
          price: '209.99',
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

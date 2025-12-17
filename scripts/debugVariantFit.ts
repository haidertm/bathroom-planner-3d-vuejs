import { getTemplateById } from '../src/constants/templates'
import productData from '../src/mocks/productData'
import { validateObjectFitsInRoom, validateNoOverlap, wouldCollideWithExisting } from '../src/utils/constraints'

type TemplateItem = {
  type: string
  sku: string
  wall: string
  wallPosition?: number
}

type PlannerItem = any

const WALL_THICKNESS = 5

const calculateWallPosition = (
  wall: string,
  wallPosition: number | undefined,
  roomWidth: number,
  roomHeight: number,
  dimensions: { width: number; depth: number },
  spawnHeight = 0
) => {
  const halfRoomWidth = roomWidth / 2
  const halfRoomHeight = roomHeight / 2

  const wallFaces = {
    north: -halfRoomHeight + WALL_THICKNESS,
    south: halfRoomHeight - WALL_THICKNESS,
    east: halfRoomWidth - WALL_THICKNESS,
    west: -halfRoomWidth + WALL_THICKNESS
  }

  const interior = {
    minX: -halfRoomWidth + WALL_THICKNESS,
    maxX: halfRoomWidth - WALL_THICKNESS,
    minZ: -halfRoomHeight + WALL_THICKNESS,
    maxZ: halfRoomHeight - WALL_THICKNESS
  }

  const halfWidth = dimensions.width / 2
  const t = wallPosition ?? 0.5
  const position = { x: 0, y: spawnHeight, z: 0 }
  let rotation = 0

  switch (wall) {
    case 'north':
      position.x = interior.minX + halfWidth + t * (interior.maxX - interior.minX - dimensions.width)
      position.z = wallFaces.north
      rotation = 0
      break
    case 'south':
      position.x = interior.minX + halfWidth + t * (interior.maxX - interior.minX - dimensions.width)
      position.z = wallFaces.south
      rotation = Math.PI
      break
    case 'east':
      position.x = wallFaces.east
      position.z = interior.minZ + halfWidth + t * (interior.maxZ - interior.minZ - dimensions.width)
      rotation = -Math.PI / 2
      break
    case 'west':
      position.x = wallFaces.west
      position.z = interior.minZ + halfWidth + t * (interior.maxZ - interior.minZ - dimensions.width)
      rotation = Math.PI / 2
      break
    case 'corner-nw':
      position.x = wallFaces.west + halfWidth
      position.z = wallFaces.north
      rotation = 0
      break
    case 'corner-ne':
      position.x = wallFaces.east - halfWidth
      position.z = wallFaces.north
      rotation = 0
      break
    case 'corner-sw':
      position.x = wallFaces.west + halfWidth
      position.z = wallFaces.south
      rotation = Math.PI
      break
    case 'corner-se':
      position.x = wallFaces.east - halfWidth
      position.z = wallFaces.south
      rotation = Math.PI
      break
  }

  return { position, rotation }
}

const findVariant = (sku: string) => {
  for (const [category, products] of Object.entries(productData)) {
    for (const product of products) {
      const variant = product.variants?.find((v: any) => v.sku === sku)
      if (variant) {
        return { product, variant, category }
      }
    }
  }
  return null
}

const buildTemplateItems = (templateId: string) => {
  const template = getTemplateById(templateId)
  if (!template) throw new Error('missing template')
  const placed: PlannerItem[] = []
  const created: PlannerItem[] = []

  for (const templateItem of template.items) {
    const productInfo = findVariant(templateItem.sku)
    if (!productInfo) continue
    const { variant } = productInfo

    const { position, rotation } = calculateWallPosition(
      templateItem.wall,
      templateItem.wallPosition,
      template.roomWidth,
      template.roomHeight,
      variant.dimensions
    )

    const newItem: PlannerItem = {
      id: placed.length + 1,
      type: templateItem.type,
      position: [position.x, position.y, position.z],
      rotation,
      scale: 1,
      sku: templateItem.sku,
      model: {
        path: variant.path,
        name: `${templateItem.type}-${templateItem.sku}`,
        dimensions: variant.dimensions,
        floorOffset: variant.floorOffset || 0
      }
    }

    created.push(newItem)
    placed.push(newItem)
  }

  return { template, items: created }
}

const { template, items } = buildTemplateItems('standard-family')
const vanity = items.find(item => item.type === 'Furniture')!
console.log('vanity position', vanity.position)

const vanityProduct = findVariant(vanity.sku)!
const variants = vanityProduct.product.variants

for (const variant of variants) {
  const tempItem = {
    ...vanity,
    sku: variant.sku,
    model: {
      ...vanity.model,
      dimensions: variant.dimensions
    }
  }

  const collision = wouldCollideWithExisting(
    { x: vanity.position[0], y: vanity.position[1], z: vanity.position[2] },
    vanity.type as any,
    vanity.scale || 1,
    vanity.id,
    items,
    tempItem,
    template.roomWidth,
    template.roomHeight,
    0,
    0
  )
  console.log(variant.sku, variant.dimensions, collision)
}

import ImageRenderer from "./Image.vue"

export function resolveRenderer(type) {
  if(!type) return null
  if (type.startsWith("image")) {
    return ImageRenderer
  }
  return null
}
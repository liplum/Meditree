import ImageRenderer from "./Image.vue"

export function resolveRenderer(type) {
  if (type.startsWith("image")) {
    return ImageRenderer
  }
  return null
}
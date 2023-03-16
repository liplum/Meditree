import mitt from 'mitt'
export const emitter = mitt()

export function goNextFile(file) {
  emitter.emit("go-next", file)
}
export function goPreviousFile(file) {
  emitter.emit("go-previous", file)
}

export function onGoNextFile(...args) {
  emitter.on("go-next", ...args)
}

export function onPreviousFile(...args) {
  emitter.on("go-previous", ...args)
}

export function offGoNextFile(...args) {
  emitter.off("go-next", ...args)
}

export function offPreviousFile(...args) {
  emitter.off("go-previous", ...args)
}
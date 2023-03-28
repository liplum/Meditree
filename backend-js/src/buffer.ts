export class BufferWriter {
  private backend: Buffer
  private cursor: number = 0

  constructor(size: number = 1024) {
    this.backend = Buffer.alloc(size)
  }

  private ensureCapacity(size: number): void {
    if (this.cursor + size > this.backend.length) {
      const newBuffer = Buffer.alloc(this.backend.length + size)
      this.backend.copy(newBuffer)
      this.backend = newBuffer
    }
  }

  int8(value: number): void {
    this.ensureCapacity(1)
    this.backend.writeInt8(value, this.cursor)
    this.cursor += 1
  }

  uint8(value: number): void {
    this.backend.writeUInt8(value, this.cursor)
    this.cursor += 1
  }

  int16LE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeInt16LE(value, this.cursor)
    this.cursor += 2
  }

  int16BE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeInt16BE(value, this.cursor)
    this.cursor += 2
  }

  uint16LE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeUInt16LE(value, this.cursor)
    this.cursor += 2
  }

  uint16BE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeUInt16BE(value, this.cursor)
    this.cursor += 2
  }

  int32LE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeInt32LE(value, this.cursor)
    this.cursor += 4
  }

  int32BE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeInt32BE(value, this.cursor)
    this.cursor += 4
  }

  uint32LE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeUInt32LE(value, this.cursor)
    this.cursor += 4
  }

  uint32BE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeUInt32BE(value, this.cursor)
    this.cursor += 4
  }

  floatLE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeFloatLE(value, this.cursor)
    this.cursor += 4
  }

  floatBE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeFloatBE(value, this.cursor)
    this.cursor += 4
  }

  doubleLE(value: number): void {
    this.ensureCapacity(8)
    this.backend.writeDoubleLE(value, this.cursor)
    this.cursor += 8
  }

  doubleBE(value: number): void {
    this.ensureCapacity(8)
    this.backend.writeDoubleBE(value, this.cursor)
    this.cursor += 8
  }

  string(value: string, encoding: BufferEncoding = "utf8"): void {
    const length = Buffer.byteLength(value, encoding)
    this.ensureCapacity(length + 4)
    this.backend.writeInt32BE(length, this.cursor)
    this.cursor += 4
    this.backend.write(value, this.cursor, length, encoding)
    this.cursor += length
  }

  buffer(buffer: Buffer): void {
    this.ensureCapacity(buffer.length + 4)
    this.cursor += 4
    buffer.copy(this.backend, this.cursor, 0)
    this.cursor += buffer.length
  }

  buildBuffer(): Buffer {
    return this.backend.subarray(0, this.cursor + 1)
  }
}

export class BufferReader {
  private readonly backend: Buffer
  private cursor: number = 0

  constructor(buffer: Buffer) {
    this.backend = buffer
  }

  int8(): number {
    const value = this.backend.readInt8(this.cursor)
    this.cursor += 1
    return value
  }

  uint8(): number {
    const value = this.backend.readUInt8(this.cursor)
    this.cursor += 1
    return value
  }

  int16BE(): number {
    const value = this.backend.readInt16BE(this.cursor)
    this.cursor += 2
    return value
  }

  int16LE(): number {
    const value = this.backend.readInt16LE(this.cursor)
    this.cursor += 2
    return value
  }

  uint16BE(): number {
    const value = this.backend.readUInt16BE(this.cursor)
    this.cursor += 2
    return value
  }

  uint16LE(): number {
    const value = this.backend.readUInt16LE(this.cursor)
    this.cursor += 2
    return value
  }

  int32BE(): number {
    const value = this.backend.readInt32BE(this.cursor)
    this.cursor += 4
    return value
  }

  int32LE(): number {
    const value = this.backend.readInt32LE(this.cursor)
    this.cursor += 4
    return value
  }

  uint32BE(): number {
    const value = this.backend.readUInt32BE(this.cursor)
    this.cursor += 4
    return value
  }

  uint32LE(): number {
    const value = this.backend.readUInt32LE(this.cursor)
    this.cursor += 4
    return value
  }

  floatLE(): number {
    const value = this.backend.readFloatLE(this.cursor)
    this.cursor += 4
    return value
  }

  floatBE(): number {
    const value = this.backend.readFloatBE(this.cursor)
    this.cursor += 4
    return value
  }

  doubleLE(): number {
    const value = this.backend.readDoubleLE(this.cursor)
    this.cursor += 8
    return value
  }

  doubleBE(): number {
    const value = this.backend.readDoubleBE(this.cursor)
    this.cursor += 8
    return value
  }

  string(encoding: BufferEncoding = "utf8"): string {
    const length = this.backend.readInt32BE(this.cursor)
    this.cursor += 4
    const content = this.backend.toString(encoding, this.cursor, this.cursor + length)
    this.cursor += length
    return content
  }

  buffer(): Buffer {
    const length = this.backend.readInt32BE(this.cursor)
    this.cursor += 4
    const buffer = this.backend.subarray(this.cursor, this.cursor + length)
    this.cursor += length
    return buffer
  }
}

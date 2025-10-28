if (typeof MessagePort !== "undefined") {
  const proto = MessagePort.prototype as unknown as {
    addListener?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    removeListener?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    on?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    off?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    once?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    addEventListener: (type: string, listener: (...args: Array<any>) => void) => void
    removeEventListener: (type: string, listener: (...args: Array<any>) => void) => void
  }

  if (!proto.addListener) {
    proto.addListener = function(this: MessagePort, type: string, listener: (...args: Array<any>) => void) {
      this.addEventListener(type, listener)
      return this
    }
  }

  if (!proto.removeListener) {
    proto.removeListener = function(this: MessagePort, type: string, listener: (...args: Array<any>) => void) {
      this.removeEventListener(type, listener)
      return this
    }
  }

  if (!proto.on) {
    proto.on = proto.addListener
  }

  if (!proto.off) {
    proto.off = proto.removeListener
  }

  if (!proto.once) {
    proto.once = function(this: MessagePort, type: string, listener: (...args: Array<any>) => void) {
      const wrapped = (...args: Array<any>) => {
        proto.removeListener?.call(this, type, wrapped)
        listener(...args)
      }
      proto.addListener?.call(this, type, wrapped)
      return this
    }
  }
}

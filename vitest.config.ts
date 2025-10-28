import { defineConfig } from "vitest/config"


const userSpecifiedTestFiles = process.argv.slice(2).some((arg) =>
  arg.endsWith(".test.ts") || arg.endsWith(".test.tsx") || arg.includes("test/")
)

const messagePortProto = (globalThis as any).MessagePort?.prototype as
  | undefined
  | {
    addListener?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    removeListener?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    on?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    off?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    once?: (type: string, listener: (...args: Array<any>) => void) => MessagePort
    addEventListener: (type: string, listener: (...args: Array<any>) => void) => void
    removeEventListener: (type: string, listener: (...args: Array<any>) => void) => void
  }

if (messagePortProto) {
  if (!messagePortProto.addListener) {
    messagePortProto.addListener = function(this: MessagePort, type: string, listener: (...args: Array<any>) => void) {
      this.addEventListener(type, listener)
      return this
    }
  }
  if (!messagePortProto.removeListener) {
    messagePortProto.removeListener = function(this: MessagePort, type: string, listener: (...args: Array<any>) => void) {
      this.removeEventListener(type, listener)
      return this
    }
  }
  if (!messagePortProto.on) {
    messagePortProto.on = messagePortProto.addListener
  }
  if (!messagePortProto.off) {
    messagePortProto.off = messagePortProto.removeListener
  }
  if (!messagePortProto.once) {
    messagePortProto.once = function(this: MessagePort, type: string, listener: (...args: Array<any>) => void) {
      const wrapped = (...args: Array<any>) => {
        messagePortProto.removeListener?.call(this, type, wrapped)
        listener(...args)
      }
      messagePortProto.addListener?.call(this, type, wrapped)
      return this
    }
  }
}

export default defineConfig({
  test: {
    include: userSpecifiedTestFiles ? ["test/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"] : ["test/all.test.ts"],
    exclude: [],
    globals: true,
    pool: "threads",
    threads: {
      isolate: true,
      maxThreads: 2,
      minThreads: 1
    },
    setupFiles: ["./test/vitest.setup.ts"],
    environment: "node",
    coverage: {
      provider: "v8"
    }
  }
})

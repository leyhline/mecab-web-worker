import type { Dictionary, Features } from "./Dictionary.js";
import type { MecabNode } from "./mecab-worker.js";

interface MecabDataType {
  id: number;
  type: string;
}

export interface MecabReady extends MecabDataType {
  type: "ready";
}

export interface MecabUnzip extends MecabDataType {
  type: "unzip";
  name: string;
  size: number;
  total: number | null;
}

export interface MecabCache extends MecabDataType {
  type: "cache";
  name: string;
  size: number;
  total: number | null;
}

export interface MecabParse extends MecabDataType {
  type: "parse";
  result: string;
}

export interface MecabParseToNodes extends MecabDataType {
  type: "parseToNodes";
  result: MecabNode[];
}

export interface MecabError extends MecabDataType {
  type: "error";
  message: string;
}

export type MecabData =
  | MecabReady
  | MecabParse
  | MecabParseToNodes
  | MecabUnzip
  | MecabCache
  | MecabError;

export type MecabMessageEvent = MessageEvent<MecabData>;

export interface MecabCallInit extends MecabDataType {
  type: "init";
  cacheName: string;
  url: string;
  noCache?: boolean;
}

export interface MecabCallParse extends MecabDataType {
  type: "parse";
  arg: string;
}

export interface MecabCallParseToNodes extends MecabDataType {
  type: "parseToNodes";
  arg: string;
}

export type MecabCallData =
  | MecabCallInit
  | MecabCallParse
  | MecabCallParseToNodes;

export type MecabMessageCallEvent = MessageEvent<MecabCallData>;

interface MecabWorkerOptions {
  noCache?: boolean;
  onLoad?: (message: MecabUnzip | MecabCache) => void;
}

/**
 * MecabWorker subclasses Worker to provide a simple interface for interacting
 * with the actual worker script. Instead of using `postMessage` one can
 * simple use the async functions `parse` and `parseToNodes`.
 *
 * @example
 * const worker = await MecabWorker.create(UNIDIC3)
 * const result = await worker.parse('青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望')
 * const nodes = await worker.parseToNodes('青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望')
 */
export class MecabWorker<T extends Features | null = null> {
  private worker: Worker;
  private wrapper?: (features: string[]) => T | null;
  private pending: Map<number, (data: MecabData) => void> = new Map();
  private counter = 1;

  /**
   * Helper function to call `MecabWorker.init` after construction.
   */
  static async create<T extends Features | null = null>(
    dictionary: Dictionary<T>,
    options?: MecabWorkerOptions
  ): Promise<MecabWorker<T>> {
    const mecabWorker = new MecabWorker<T>(dictionary.wrapper);
    return mecabWorker.init(dictionary, options).then(() => mecabWorker);
  }

  constructor(wrapper?: (feature: string[]) => T | null) {
    if (!testModuleWorkerSupport()) {
      throw new Error(
        "Cannot initialize MeCab. Module workers are not supported in your browser."
      );
    }
    this.wrapper = wrapper;
    // Initially, I wanted to use `class MecabWorker extends Worker` and
    // `super(new URL(...)` but it seems this wasn't recognized by many
    // module bundlers. Now, it's just a wrapper around a Worker.
    this.worker = new Worker(new URL("./mecab-worker.js", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e: MecabMessageEvent) => {
      const callback = this.pending.get(e.data.id);
      if (callback) {
        callback(e.data);
        this.pending.delete(e.data.id);
      } else if (e.data.id > 0) {
        console.warn("No pending request for message", e.data);
      }
    };
  }

  async init(
    dictionary: Dictionary<T>,
    options?: MecabWorkerOptions
  ): Promise<void> {
    const message: MecabCallInit = {
      id: this.counter,
      type: "init",
      cacheName: dictionary.cacheName,
      url: dictionary.url,
      noCache: options?.noCache,
    };
    this.counter++;
    return new Promise((resolve, reject) => {
      this.pending.set(message.id, (data) => {
        if (data.type === "ready") {
          resolve();
        } else if (data.type === "error") {
          reject(data.message);
        } else {
          reject("Unexpected message: " + data);
        }
      });
      this.worker.postMessage(message);
    });
  }

  async parse(text: string): Promise<string> {
    const message: MecabCallParse = {
      id: this.counter,
      type: "parse",
      arg: text,
    };
    this.counter++;
    return new Promise((resolve, reject) => {
      this.pending.set(message.id, (value) => {
        if (value.type === "parse") {
          resolve(value.result);
        } else if (value.type === "error") {
          reject(value.message);
        } else {
          reject("Unexpected message: " + value);
        }
      });
      this.worker.postMessage(message);
    });
  }

  async parseToNodes(text: string): Promise<MecabNode<T | null>[]> {
    const message: MecabCallParseToNodes = {
      id: this.counter,
      type: "parseToNodes",
      arg: text,
    };
    this.counter++;
    return new Promise((resolve, reject) => {
      this.pending.set(message.id, (value) => {
        if (value.type === "parseToNodes") {
          const nodes: MecabNode<null>[] = value.result;
          if (this.wrapper) {
            const wrappedNodes: MecabNode<T>[] = nodes.map((node) => ({
              ...node,
              feature: this.wrapper!(node.features),
            }));
            resolve(wrappedNodes);
          } else {
            resolve(nodes);
          }
        } else if (value.type === "error") {
          reject(value.message);
        } else {
          reject("Unexpected message: " + value);
        }
      });
      this.worker.postMessage(message);
    });
  }
}

/**
 * https://stackoverflow.com/questions/62954570/javascript-feature-detect-module-support-for-web-workers
 */
function testModuleWorkerSupport(): boolean {
  let supports = false;
  const tester: WorkerOptions = {
    get type() {
      supports = true;
      return undefined;
    },
  };
  new Worker("data:,", tester).terminate();
  return supports;
}

import type { Dictionary, Features } from "./Dictionary.js";
import type { MecabNode } from "./mecab-worker.js";

interface MecabDataType {
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

export interface MecabMessageEvent extends MessageEvent {
  data: MecabData;
}

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

export interface MecabMessageCallEvent extends MessageEvent {
  data: MecabCallData;
}

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
export class MecabWorker<T extends Features = Record<string, never>> {
  private worker: Worker;
  private wrapper?: (feature: string[]) => T | null;
  /**
   * Helper function to call `MecabWorker.init` after construction.
   */
  static async create<T extends Features = Record<string, never>>(
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
  }

  async init(
    dictionary: Dictionary<T>,
    options?: MecabWorkerOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (options && options.onLoad) {
        this.worker.addEventListener("message", (e: MecabMessageEvent) => {
          if (e.data.type === "cache" || e.data.type === "unzip") {
            options.onLoad!(e.data);
          }
        });
      }
      const listener = (e: MecabMessageEvent) => {
        if (e.data.type === "ready") {
          this.worker.removeEventListener("message", listener);
          resolve();
        } else if (e.data.type == "error") {
          this.worker.removeEventListener("message", listener);
          reject(e.data.message);
        }
      };
      this.worker.addEventListener("message", listener);
      const initMessage: MecabCallInit = {
        type: "init",
        cacheName: dictionary.cacheName,
        url: dictionary.url,
        noCache: options?.noCache,
      };
      this.worker.postMessage(initMessage);
    });
  }

  async parse(text: string): Promise<string> {
    return new Promise((resolve) =>
      this.handleParse(resolve, { type: "parse", arg: text })
    );
  }

  async parseToNodes(text: string): Promise<MecabNode<T>[]> {
    const nodesPromise = new Promise<MecabNode<T>[]>((resolve) =>
      this.handleParse(resolve, { type: "parseToNodes", arg: text })
    );
    if (this.wrapper) {
      return nodesPromise.then((nodes) => {
        nodes.forEach((node) => (node.feature = this.wrapper!(node.features)));
        return nodes;
      });
    } else {
      return nodesPromise;
    }
  }

  private handleParse(
    resolve: (value: any) => void,
    payload: MecabCallData
  ): void {
    const listener = (e: MecabMessageEvent) => {
      if (e.data.type === payload.type) {
        this.worker.removeEventListener("message", listener);
        resolve(e.data.result);
      }
    };
    this.worker.addEventListener("message", listener);
    this.worker.postMessage(payload);
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

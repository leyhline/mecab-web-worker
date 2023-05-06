import type { MecabNode } from "./mecab-worker.js";

interface MecabDataType {
  type: string;
}

export interface MecabReady extends MecabDataType {
  type: "ready";
}

export interface MecabUnzip extends MecabDataType {
  type: "unzip";
  filename: string;
}

export interface MecabCache extends MecabDataType {
  type: "cache";
  filename: string;
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
  cacheName?: string;
  url?: string;
  noCache?: boolean;
  onUnzip?: (filename: string) => void;
  onCache?: (filename: string) => void;
}

/**
 * MecabWorker subclasses Worker to provide a simple interface for interacting
 * with the actual worker script. Instead of using `postMessage` one can
 * simple use the async functions `parse` and `parseToNodes`.
 *
 * @example
 * const worker = await MecabWorker.create()
 * const result = await worker.parse('青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望')
 * console.log(result)
 */
export class MecabWorker {
  protected worker: Worker;

  static async create(options?: MecabWorkerOptions): Promise<MecabWorker> {
    const mecabWorker = new MecabWorker();
    return mecabWorker.init(options).then(() => mecabWorker);
  }

  constructor() {
    // Initially, I wanted to use `class MecabWorker extends Worker` and
    // `super(new URL(...)` but it seems this wasn't recognized by many
    // module bundlers. Now, it's just a wrapper around a Worker.
    this.worker = new Worker(new URL("./mecab-worker.js", import.meta.url), {
      type: "module",
    });
  }

  async init(options?: MecabWorkerOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (options && options.onCache) {
        this.worker.addEventListener("message", (e: MecabMessageEvent) => {
          if (e.data.type === "cache") {
            options && options.onCache && options.onCache(e.data.filename);
          }
        });
      }
      if (options && options.onUnzip) {
        this.worker.addEventListener("message", (e: MecabMessageEvent) => {
          if (e.data.type === "unzip") {
            options && options.onUnzip && options.onUnzip(e.data.filename);
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
        cacheName: options?.cacheName || "unidic-3.1.0",
        url: options?.url || "/unidic-3.1.0.zip",
        noCache: options?.noCache,
      };
      this.worker.postMessage(initMessage);
    });
  }

  parse(text: string): Promise<string> {
    return new Promise((resolve) =>
      this.handleParse(resolve, { type: "parse", arg: text })
    );
  }

  parseToNodes(text: string): Promise<MecabNode[]> {
    return new Promise((resolve) =>
      this.handleParse(resolve, { type: "parseToNodes", arg: text })
    );
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

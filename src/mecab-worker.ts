import { unzipDictionary } from "./unzip.js";
import createModule from "./mecab.js";

import type {
  MecabReady,
  MecabUnzip,
  MecabCache,
  MecabData,
  MecabCallData,
  MecabMessageCallEvent,
  MecabError,
  MecabCallInit,
} from "./MecabWorker.js";

import type { Module } from "./mecab.js";
import type { Features } from "./Dictionary.js";

declare function postMessage(message: MecabData): void;

/**************************************
 * initialization of events and WASM
 **************************************/

let mecabTagger: MecabTagger;

onmessage = (e: MecabMessageCallEvent) => {
  const data: MecabCallData = e.data;
  let result: MecabData;
  switch (data.type) {
    case "init":
      initTagger(data);
      break;
    case "parse":
      result = {
        id: data.id,
        type: "parse",
        result: mecabTagger.parse(data.arg),
      };
      postMessage(result);
      break;
    case "parseToNodes":
      result = {
        id: data.id,
        type: "parseToNodes",
        result: mecabTagger.parseToNodeList(data.arg),
      };
      postMessage(result);
      break;
  }
};

async function initTagger(data: MecabCallInit) {
  try {
    const Module = await createModule();
    const files = await loadDictionaryFiles(
      data.cacheName,
      data.url,
      data.noCache
    );
    mountDicionaryFiles(Module, files);
    mecabTagger = new MecabTagger(Module);
    const readyMessage: MecabReady = { id: data.id, type: "ready" };
    postMessage(readyMessage);
  } catch (error: any) {
    const errorMsg: MecabError = {
      id: data.id,
      type: "error",
      message: error.message,
    };
    postMessage(errorMsg);
  }
}

/**************************************
 * wrappers and logic
 **************************************/

class MecabTagger {
  private mecab_new: (argc: number, argv: number) => number;
  private mecab_sparse_tostr: (taggerPtr: number, str: string) => string;
  private mecab_sparse_tonode: (taggerPtr: number, str: string) => number;
  private taggerPtr: number;
  private Module: Module;

  constructor(Module: Module) {
    this.Module = Module;
    this.mecab_new = Module.cwrap("mecab_new", "number", ["number", "number"]);
    this.mecab_sparse_tostr = Module.cwrap("mecab_sparse_tostr", "string", [
      "number",
      "string",
    ]);
    this.mecab_sparse_tonode = Module.cwrap("mecab_sparse_tonode", "number", [
      "number",
      "string",
    ]);
    const programName = "mecab";
    const allocateSentence = "-C";
    const outputFormat = "-Owakati";
    const args = [programName, allocateSentence, outputFormat];
    const argPtrs = args.map((arg) => {
      const argPtr = Module._malloc(arg.length + 1);
      Module.writeAsciiToMemory(arg, argPtr, false);
      return argPtr;
    });
    const argc = args.length;
    const argv = Module._malloc(argc * 4);
    argPtrs.forEach((argPtr, i) => {
      Module.setValue(argv + i * 4, argPtr, "*");
    });
    try {
      this.taggerPtr = this.mecab_new(argc, argv);
      if (this.taggerPtr === 0) {
        const error: MecabError = {
          id: 0,
          type: "error",
          message: "Failed initializing MeCab. Are the dictionaries mounted?",
        };
        postMessage(error);
        throw new Error(
          "Failed initializing MeCab. Are the dictionaries mounted?"
        );
      }
    } finally {
      Module._free(argv);
      argPtrs.forEach((argPtr) => Module._free(argPtr));
    }
  }

  parse(str: string): string {
    return this.mecab_sparse_tostr(this.taggerPtr, str).trim();
  }

  parseToNodeList(str: string): MecabNode[] {
    const nodePtr = this.mecab_sparse_tonode(this.taggerPtr, str);
    return createNodeList(this.Module, nodePtr);
  }
}

function createNodeList(Module: Module, nodePtr: number): MecabNode[] {
  const nodes: MecabNode[] = [];
  let node = new MecabNode(Module, nodePtr);
  while (node.nextPtr !== 0) {
    node = new MecabNode(Module, node.nextPtr);
    if (node.stat === Stat.MECAB_EOS_NODE) break;
    nodes.push(node);
  }
  return nodes;
}

enum Stat {
  MECAB_NOR_NODE,
  MECAB_UNK_NODE,
  MECAB_BOS_NODE,
  MECAB_EOS_NODE,
  MECAB_EON_NODE,
}

class MecabNode<T extends Features | null = null> {
  // accessing the struct fields using pointer arithmetic
  // https://github.com/taku910/mecab/blob/master/mecab/src/mecab.h#L98
  private static readonly nextPtrOffset = 1 * 4;
  private static readonly surfacePtrOffset = 6 * 4;
  private static readonly featurePtrOffset = 7 * 4;
  private static readonly lengthOffset = 9 * 4;
  private static readonly statOffset = 9 * 4 + 5 * 2 + 1;

  readonly nextPtr: number;
  readonly surface: string;
  readonly length: number;
  readonly stat: Stat;

  features: string[] = [];
  feature: T | null = null;

  constructor(Module: Module, nodePtr: number) {
    this.nextPtr = Module.getValue(nodePtr + MecabNode.nextPtrOffset, "*");
    const surfacePtr = Module.getValue(
      nodePtr + MecabNode.surfacePtrOffset,
      "*"
    );
    const featurePtr = Module.getValue(
      nodePtr + MecabNode.featurePtrOffset,
      "*"
    );
    const featureCsv = Module.UTF8ToString(featurePtr);
    this.length = Module.getValue(nodePtr + MecabNode.lengthOffset, "i16");
    this.surface = Module.UTF8ToString(surfacePtr, this.length);
    this.stat = Module.getValue(nodePtr + MecabNode.statOffset, "i8");
    if (this.stat === Stat.MECAB_NOR_NODE) {
      this.features = parseFeatureCsv(featureCsv);
    }
  }
}

/**
 * Some feature fields contains commas, which are escaped with double quotes.
 * For unidic, this sometimes affects the aType field used for accent data.
 */
function parseFeatureCsv(featureCsv: string): string[] {
  const features: string[] = [];
  let escapedFeature = "";
  for (const feature of featureCsv.split(",")) {
    if (feature.startsWith('"')) {
      escapedFeature = feature.slice(1);
    } else if (feature.endsWith('"')) {
      escapedFeature += "," + feature.slice(0, -1);
      features.push(escapedFeature);
      escapedFeature = "";
    } else if (escapedFeature) {
      escapedFeature += "," + feature;
    } else {
      features.push(feature);
    }
  }
  return features;
}

/**
 * Mounts mecabrc and dictionary files to the emscripten file system
 * using the mecab default paths, i.e. the home directory for the
 * mecabrc and the current working directory for the dictionary.
 *
 * https://github.com/taku910/mecab/blob/master/mecab/src/utils.cpp#L292
 *
 * @param files the dictionary files from the extracted unidic zip file
 */
function mountDicionaryFiles(Module: Module, files: File[]): void {
  const dicrc = files.filter((file) => file.name.endsWith("dicrc")).at(0);
  if (!dicrc) throw new Error("dicrc file not found in archive");
  const baseIndex = dicrc.name.search("dicrc");
  const baseDir = dicrc.name.slice(0, baseIndex);
  Module.FS.mkdir("/mecab");
  Module.FS.mount(Module.WORKERFS, { files }, "/mecab");
  Module.FS.writeFile("/home/web_user/.mecabrc", "# This is a dummy file.");
  Module.FS.chdir("/mecab/" + baseDir);
}

interface ResponseWithPath {
  pathname: string;
  response: Response;
}

async function loadDictionaryFiles(
  cacheName: string,
  url: string,
  noCache = false
): Promise<File[]> {
  if (noCache || !(await caches.has(cacheName))) {
    return loadDictionaryFilesFromNetwork(cacheName, url, noCache);
  } else {
    return loadDictionaryFilesFromCache(cacheName);
  }
}

async function loadDictionaryFilesFromCache(
  cacheName: string
): Promise<File[]> {
  const c = tryForCachesApi();
  const cache = await c.open(cacheName);
  const keys = await cache.keys();
  if (keys.length === 0) throw new Error("Cache is empty");
  const files: File[] = [];
  for (const key of keys) {
    const responseWithPath: ResponseWithPath = {
      pathname: new URL(key.url).pathname.slice(1),
      response: (await cache.match(key))!,
    };
    const file = await responseToFile(responseWithPath);
    const message: MecabCache = {
      id: 0,
      type: "cache",
      name: file.name,
      size: file.size,
      total: null,
    };
    postMessage(message);
    files.push(file);
  }
  return files;
}

/**
 * Downloads the dictionary zip file from the given url, places the extracted files
 * in the cache and returns the files as File objects.
 *
 * @param cacheName the name of the newly created cache
 * @param url the url of the dictonary zip file
 * @returns the extracted files
 */
async function loadDictionaryFilesFromNetwork(
  cacheName: string,
  url: string,
  noCache: boolean
): Promise<File[]> {
  const [stream, contentLength] = await unzipDictionary(url);
  const reader = stream.getReader();
  const files: File[] = [];
  if (noCache) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const message: MecabUnzip = {
        id: 0,
        type: "unzip",
        name: value.name,
        size: value.size,
        total: contentLength,
      };
      postMessage(message);
      files.push(value);
    }
    if (files.length === 0) {
      throw new Error("No files extracted");
    }
  } else {
    const c = tryForCachesApi();
    const cache = await c.open(cacheName);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const message: MecabUnzip = {
          id: 0,
          type: "unzip",
          name: value.name,
          size: value.size,
          total: contentLength,
        };
        postMessage(message);
        const { pathname, response } = fileToResponse(value);
        await cache.put("/" + pathname, response);
        files.push(value);
      }
      if (files.length === 0) {
        throw new Error("No files extracted");
      }
    } catch (error) {
      c.delete(cacheName);
      throw error;
    }
  }
  return files;
}

function tryForCachesApi(): CacheStorage {
  try {
    return caches;
  } catch (error) {
    throw new Error(
      "CacheStorage is not supported; do you use HTTPS? See: https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage"
    );
  }
}

async function responseToFile({
  pathname,
  response,
}: ResponseWithPath): Promise<File> {
  return new File([await response.blob()], pathname);
}

function fileToResponse(file: File): ResponseWithPath {
  return { pathname: file.name, response: new Response(file) };
}

export type { MecabNode };

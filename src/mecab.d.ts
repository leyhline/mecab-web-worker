declare function createModule(): Promise<Module>;

type PtrType = "i8" | "i16" | "i32" | "i64" | "float" | "double" | "*";
type CwrapReturnType = "number" | "string" | "array" | null;
type CwrapArgType = "number" | "string";

export interface Module {
  cwrap: (
    ident: string,
    returnType: CwrapReturnType,
    argTypes?: CwrapArgType[]
  ) => (...args: any[]) => any;
  writeAsciiToMemory: (
    str: string,
    outPtr: number,
    dontAddNull: boolean
  ) => void;
  UTF8ToString: (ptr: number, maxBytesToRead?: number) => string;
  setValue: (ptr: number, value: number, type: PtrType) => void;
  getValue: (ptr: number, type: PtrType) => number;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  WORKERFS: any;
  FS: FS;
}

interface FS {
  mkdir: (path: string, mode?: number) => void;
  mount: (type: any, opts: object, mountpoint: string) => void;
  writeFile: (path: string, data: string | ArrayBufferView) => void;
  chdir: (path: string) => void;
}

export default createModule;

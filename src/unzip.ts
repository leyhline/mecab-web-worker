declare class DecompressionStream extends TransformStream<
  Uint8Array,
  Uint8Array
> {
  constructor(format: "gzip" | "deflate" | "deflate-raw");
}

export async function unzipDictionary(
  url: string
): Promise<ReadableStream<File>> {
  if (!testDecompressionStreamSupport()) {
    throw new Error(
      "Cannot unzip dictionary. DecompressionStream API is not supported by this browser."
    );
  }
  const zip = await fetch(url);
  if (zip.ok && zip.body) {
    const fileStream = await unzip(zip.body);
    return fileStream;
  } else {
    throw new Error(
      `Failed to fetch dictionary: ${url} (${zip.status} ${zip.statusText})`
    );
  }
}

function testDecompressionStreamSupport(): boolean {
  return typeof DecompressionStream !== "undefined";
}

async function unzip(
  stream: ReadableStream<Uint8Array>
): Promise<ReadableStream<File>> {
  return new ReadableStream({
    pull: async (controller) => {
      const reader = new ZipReader(stream);
      while (true) {
        const header = await reader.readHeader();
        if (header === null) {
          reader.cancel();
          controller.close();
          break;
        }
        if (header.compressionMethod === 8) {
          const data = await reader.decompress(header.compressedSize);
          controller.enqueue(new File([data], header.fileName));
        } else {
          const data = await reader.read(header.compressedSize);
          controller.enqueue(new File([data], header.fileName));
        }
      }
    },
  });
}

interface FileHeader {
  header: Uint8Array;
  version: number;
  bitFlag: number;
  compressionMethod: number;
  lastModifiedTime: number;
  lastModifiedDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  fileNameLength: number;
  extraFieldLength: number;
  fileName: string;
  extraFields: ExtraFields;
}

type ExtraFields = { [key: string]: Uint8Array };

class ZipReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private buffer: Uint8Array = new Uint8Array(0);

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
  }

  async readHeader(): Promise<FileHeader | null> {
    const header = await this.read(4);
    if (
      header[0] !== 0x50 ||
      header[1] !== 0x4b ||
      header[2] !== 0x03 ||
      header[3] !== 0x04
    ) {
      return null;
    }
    const version = toUint16(await this.read(2));
    const bitFlag = toUint16(await this.read(2));
    const compressionMethod = toUint16(await this.read(2));
    const lastModifiedTime = toUint16(await this.read(2));
    const lastModifiedDate = toUint16(await this.read(2));
    const crc32 = toUint32(await this.read(4));
    const compressedSize = toUint32(await this.read(4));
    const uncompressedSize = toUint32(await this.read(4));
    const fileNameLength = toUint16(await this.read(2));
    const extraFieldLength = toUint16(await this.read(2));
    const fileName = toString(await this.read(fileNameLength));
    const extraFields = parseExtraField(await this.read(extraFieldLength));
    return {
      header,
      version,
      bitFlag,
      compressionMethod,
      lastModifiedTime,
      lastModifiedDate,
      crc32,
      compressedSize,
      uncompressedSize,
      fileNameLength,
      extraFieldLength,
      fileName,
      extraFields,
    };
  }

  async decompress(length: number): Promise<Uint8Array> {
    const compressedData = await this.read(length);
    const compressedStream = new ReadableStream({
      pull: (controller) => {
        controller.enqueue(compressedData);
        controller.close();
      },
    });
    const ds: ReadableWritablePair<Uint8Array, Uint8Array> =
      new DecompressionStream("deflate-raw");
    const decompressedStream = compressedStream.pipeThrough(ds);
    const reader = decompressedStream.getReader();
    const buffers: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffers.push(value);
    }
    reader.releaseLock();
    const decompressed = new Uint8Array(
      buffers.reduce((a, b) => a + b.length, 0)
    );
    let offset = 0;
    for (const buffer of buffers) {
      decompressed.set(buffer, offset);
      offset += buffer.length;
    }
    return decompressed;
  }

  async read(length: number): Promise<Uint8Array> {
    while (true) {
      if (this.buffer.length >= length) {
        const returnBuffer = this.buffer.slice(0, length);
        this.buffer = this.buffer.slice(length);
        return returnBuffer;
      } else {
        const { done, value } = await this.reader.read();
        if (done) return new Uint8Array(0);
        const newBuffer = new Uint8Array(this.buffer.length + value.length);
        newBuffer.set(this.buffer);
        newBuffer.set(value, this.buffer.length);
        this.buffer = newBuffer;
      }
    }
  }

  async cancel(): Promise<void> {
    this.reader.cancel();
  }
}

function toUint32(arr: Uint8Array) {
  const view = new DataView(arr.buffer);
  return view.getUint32(0, true);
}

function toUint16(arr: Uint8Array) {
  const view = new DataView(arr.buffer);
  return view.getUint16(0, true);
}

function toString(arr: Uint8Array) {
  return Array.from(arr)
    .map((v) => String.fromCharCode(v))
    .join("");
}

function parseExtraField(extraField: Uint8Array): ExtraFields {
  const result: ExtraFields = {};
  let i = 0;
  while (i < extraField.length) {
    const signature = toString(extraField.slice(i, i + 2));
    const length = toUint16(extraField.slice(i + 2, i + 4));
    const data = extraField.slice(i + 4, i + 4 + length);
    result[signature] = data;
    i += 4 + length;
  }
  return result;
}

[![integration tests](https://github.com/leyhline/mecab-web-worker/actions/workflows/build.yaml/badge.svg)](https://github.com/leyhline/mecab-web-worker/actions/workflows/build.yaml)
[![CodeQL](https://github.com/leyhline/mecab-web-worker/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/leyhline/mecab-web-worker/actions/workflows/github-code-scanning/codeql)
![npm](https://img.shields.io/npm/v/mecab-web-worker)

# mecab-web-worker

Using [MeCab](https://github.com/taku910/mecab) for Japanese segmentation in the browser. Inspired by [fugashi](https://github.com/polm/fugashi)'s API.

```
npm install mecab-web-worker
```

**Compatibility notice: Uses [Module Workers](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) and the [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API). These are not available in every major browser.**

```javascript
import { MecabWorker } from "mecab-web-worker";

const worker = await MecabWorker.create("/unidic-mecab-2.1.2_bin.zip");
const result = await worker.parse("和布蕪は、ワカメの付着器の上にある");
console.log(result);

const nodes = await worker.parseToNodes("和布蕪は、ワカメの付着器の上にある");
for (let node of nodes) {
  console.log(node);
}
```

MeCab was compiled to WASM and runs in a background thread via the [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API). It's necessary to provide a dictionary (an url to a zip file). The corresponding files are available here: <https://github.com/leyhline/mecab-web-worker/releases/tag/v0.3.0> After the first download the zip file is persisted in the browser cache (using [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)) to avoid repeated downloads.

## Motivation

I want to build some interactive tool for aligning Japanese text and audio. Since interactivity is easier to accomplish in the browser I wanted to go full JS instead of putting e.g. Python in the mix. And since the functionality for segmentation is easy to separate I decided to create an NPM package that's hopefully as easy to use as Python's [fugashi](https://github.com/polm/fugashi) (a great wrapper around MeCab, check it out, cite it and sponsor Paul's work).

My uninformed self did also draw from the knowledge he published on his blog, e.g. [An Overview of Japanese Tokenizer Dictionaries](https://www.dampfkraft.com/nlp/japanese-tokenizer-dictionaries.html) and I use his [Unidic distribution](https://github.com/polm/unidic-py). Thanks a lot! I hope to build a better understanding of the theory behind all this at a later date.

## Technical Background

MeCab was compiled to WASM using [Emscripten](https://emscripten.org/) without wrapper code in C. See the corresponding [GitHub Action](https://github.com/leyhline/mecab-web-worker/blob/main/.github/workflows/build.yaml) for the compiler flags.

However, for accessing a C struct from MeCab, I had to use _pointer arithmetic in JavaScript_ (see [mecab-worker.js:MecabNode](https://github.com/leyhline/mecab-web-worker/blob/main/src/mecab-worker.ts) which isn't really elegant. I also wrote a simple unzip function using the [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) which works (in Chrome at least) but is not completely correct.

## TODO

- [x] Support different dictionaries; this isn't hard but wasn't a use case for me personally.
- [ ] Wrap more of MeCab's functionality like returning nbest results.
- [ ] Polyfills for APIs that are not widely supported by browsers.

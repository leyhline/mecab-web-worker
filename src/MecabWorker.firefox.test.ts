import { expect } from "@esm-bundle/chai";
import { MecabWorker } from "./index.js";
import { IPADIC } from "./Dictionary.js";
import { unzipDictionary } from "./unzip.js";

describe("MecabWorker integration tests in Firefox, expecting failure because of missing APIs", function () {
  it("fails to create a module worker on MecabWorker creation", function (done) {
    MecabWorker.create(IPADIC)
      .then(() => {
        done(new Error("Should not have created a worker"));
      })
      .catch((error) => {
        expect(error.message).to.equal(
          "Cannot initialize MeCab. Module workers are not supported in your browser."
        );
        done();
      });
  });

  it("fails to decompress a dictionary because missing DecompressionStream", function (done) {
    unzipDictionary(IPADIC.url)
      .then(() => {
        done(new Error("Should not have decompressed a dictionary"));
      })
      .catch((error) => {
        expect(error.message).to.equal(
          "Cannot unzip dictionary. DecompressionStream API is not supported by this browser."
        );
        done();
      });
  });
});

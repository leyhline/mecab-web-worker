import { expect } from "@esm-bundle/chai";
import { MecabWorker } from "./index.js";
import { IPADIC, JUMANDIC, UNIDIC2 } from "./Dictionary.js";

describe("MecabWorker integration tests", function () {
  it("fails to create a worker when no dictionary was found", function (done) {
    MecabWorker.create({ url: "not-a-real-path", cacheName: "test" })
      .then(() => {
        done(new Error("Should not have created a worker"));
      })
      .catch((error) => {
        expect(error).to.equal(
          "Failed to fetch dictionary: not-a-real-path (404 Not Found)"
        );
        done();
      });
  });

  it("creates a worker with UNIDIC2 and parses a string, inserting spaces", async function () {
    const worker = await MecabWorker.create(UNIDIC2, { noCache: true });
    const result = await worker.parse(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(result).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田湖 、 御 鼻 部 山 展望 台 から の 展望"
    );
  });

  it("creates a worker with UNIDIC2 and parses a string, returning a node for each word", async function () {
    const worker = await MecabWorker.create(UNIDIC2, { noCache: true });
    const nodes = await worker.parseToNodes(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(nodes.map((node) => node.surface).join(" ")).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田湖 、 御 鼻 部 山 展望 台 から の 展望"
    );
    for (const node of nodes) {
      expect(node.features).to.have.lengthOf(26);
      expect(node.feature).to.not.be.null;
      expect(node.feature!.kana).to.not.be.undefined;
    }
  });

  it("creates a worker with IPADIC and parses a string, inserting spaces", async function () {
    const worker = await MecabWorker.create(IPADIC);
    const result = await worker.parse(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(result).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田湖 、 御鼻部山 展望 台 から の 展望"
    );
  });

  it("creates a worker with IPADIC and parses a string, returning a node for each word", async function () {
    const worker = await MecabWorker.create(IPADIC);
    const nodes = await worker.parseToNodes(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(nodes.map((node) => node.surface).join(" ")).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田湖 、 御鼻部山 展望 台 から の 展望"
    );
    for (const node of nodes) {
      expect(node.features).to.have.lengthOf(9);
      expect(node.feature).to.be.null;
    }
  });

  it("creates a worker with JUMANDIC and parses a string, inserting spaces", async function () {
    const worker = await MecabWorker.create(JUMANDIC, { noCache: true });
    const result = await worker.parse(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(result).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田 湖 、 御 鼻 部 山 展望 台 から の 展望"
    );
  });

  it("creates a worker with JUMANDIC and parses a string, returning a node for each word", async function () {
    const worker = await MecabWorker.create(JUMANDIC, { noCache: true });
    const nodes = await worker.parseToNodes(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(nodes.map((node) => node.surface).join(" ")).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田 湖 、 御 鼻 部 山 展望 台 から の 展望"
    );
    for (const node of nodes) {
      expect(node.features).to.have.lengthOf(7);
      expect(node.feature).to.be.null;
    }
  });
});

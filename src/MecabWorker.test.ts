import { expect } from "@esm-bundle/chai";
import { MecabWorker, createUnidicFeature26 } from "./index.js";

describe("MecabWorker integration tests", function () {
  it("fails to create a worker when no dictionary was found", function (done) {
    MecabWorker.create("wrong-url")
      .then(() => {
        done(new Error("Should not have created a worker"));
      })
      .catch((error) => {
        expect(error).to.have.length.above(0);
        done();
      });
  });

  it("creates a worker with UNIDIC2 and parses a string, inserting spaces", async function () {
    const worker = await MecabWorker.create("/unidic-mecab-2.1.2_bin.zip", {
      noCache: true,
    });
    const result = await worker.parse(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(result).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田湖 、 御 鼻 部 山 展望 台 から の 展望"
    );
  });

  it("creates a worker with UNIDIC2 and parses a string, returning a node for each word", async function () {
    const worker = await MecabWorker.create("/unidic-mecab-2.1.2_bin.zip", {
      noCache: true,
      wrapper: createUnidicFeature26,
    });
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

  it("parses a list of words using Array.map", async function () {
    const worker = await MecabWorker.create("/unidic-mecab-2.1.2_bin.zip", {
      noCache: true,
    });
    const result = (
      await Promise.all(
        [
          "青森県と",
          "秋田県に",
          "またがり",
          "所在する",
          "十和田湖",
          "御鼻部山",
          "展望",
          "台からの",
          "展望",
        ].map((word) => worker.parse(word))
      )
    )
      .flat()
      .join(" ");
    expect(result).to.equal(
      "青森 県 と 秋田 県 に また がり 所在 する 十和田湖 御 鼻 部 山 展望 台 から の 展望"
    );
  });

  it("loads IPADIC from network and receives messages during worker creation", async function () {
    const onLoadLog: { type: string; name: string }[] = [];
    await MecabWorker.create("/ipadic-2.7.0_bin.zip", {
      onLoad: ({ type, name }) => {
        onLoadLog.push({ type, name });
      },
    });
    expect(onLoadLog).has.length(9);
    expect(onLoadLog[0]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/",
    });
    expect(onLoadLog[1]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/dicrc",
    });
    expect(onLoadLog[2]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/README",
    });
    expect(onLoadLog[3]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/unk.dic",
    });
    expect(onLoadLog[4]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/AUTHORS",
    });
    expect(onLoadLog[5]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/COPYING",
    });
    expect(onLoadLog[6]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/sys.dic",
    });
    expect(onLoadLog[7]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/matrix.bin",
    });
    expect(onLoadLog[8]).to.deep.equal({
      type: "network",
      name: "ipadic-2.7.0_bin/char.bin",
    });
  });

  it("loads IPADIC from cache and receives messages during worker creation", async function () {
    const onLoadLog: { type: string; name: string }[] = [];
    await MecabWorker.create("/ipadic-2.7.0_bin.zip", {
      onLoad: ({ type, name }) => {
        onLoadLog.push({ type, name });
      },
    });
    expect(onLoadLog).has.length(9);
    expect(onLoadLog[0]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/",
    });
    expect(onLoadLog[1]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/dicrc",
    });
    expect(onLoadLog[2]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/README",
    });
    expect(onLoadLog[3]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/unk.dic",
    });
    expect(onLoadLog[4]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/AUTHORS",
    });
    expect(onLoadLog[5]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/COPYING",
    });
    expect(onLoadLog[6]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/sys.dic",
    });
    expect(onLoadLog[7]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/matrix.bin",
    });
    expect(onLoadLog[8]).to.deep.equal({
      type: "cache",
      name: "ipadic-2.7.0_bin/char.bin",
    });
  });

  it("creates a worker with IPADIC and parses a string, inserting spaces", async function () {
    const worker = await MecabWorker.create("/ipadic-2.7.0_bin.zip", {
      noCache: true,
    });
    const result = await worker.parse(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(result).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田湖 、 御鼻部山 展望 台 から の 展望"
    );
  });

  it("creates a worker with IPADIC and parses a string, returning a node for each word", async function () {
    const worker = await MecabWorker.create("/ipadic-2.7.0_bin.zip", {
      noCache: true,
    });
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
    const worker = await MecabWorker.create("/jumandic-7.0_bin.zip", {
      noCache: true,
    });
    const result = await worker.parse(
      "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
    );
    expect(result).to.equal(
      "青森 県 と 秋田 県 に またがり 所在 する 十和田 湖 、 御 鼻 部 山 展望 台 から の 展望"
    );
  });

  it("creates a worker with JUMANDIC and parses a string, returning a node for each word", async function () {
    const worker = await MecabWorker.create("/jumandic-7.0_bin.zip", {
      noCache: true,
    });
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

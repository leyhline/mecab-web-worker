import { expect } from "@esm-bundle/chai";
import { MecabWorker } from "./index.js";

describe("MecabWorker integration tests", () => {
  it("fails to create a worker when no dictionary was found", (done) => {
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

  it("parses a string, inserting spaces", (done) => {
    MecabWorker.create()
      .then((worker) => {
        worker
          .parse(
            "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
          )
          .then((result) => {
            expect(result).to.equal(
              "青森 県 と 秋田 県 に またがり 所在 する 十和田 湖 、 御 鼻 部 山 展望 台 から の 展望"
            );
            done();
          });
      })
      .catch((error) => {
        done(error);
      });
  });

  it("parses a string, returning a node for each word", (done) => {
    MecabWorker.create()
      .then((worker) => {
        worker
          .parseToNodes(
            "青森県と秋田県にまたがり所在する十和田湖、御鼻部山展望台からの展望"
          )
          .then((result) => {
            expect(result.map((node) => node.surface).join(" ")).to.equal(
              "青森 県 と 秋田 県 に またがり 所在 する 十和田 湖 、 御 鼻 部 山 展望 台 から の 展望"
            );
            done();
          });
      })
      .catch((error) => {
        done(error);
      });
  });
});

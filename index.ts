"use strict";
import { createWriteStream, mkdirSync } from "hexo-fs";
import createLogger from "hexo-log";
import { generate } from "./lib/generate";
import path from "path";

const supported_types = ["book", "movie", "game", "song"];

const log = createLogger({
  debug: false,
  silent: false,
});

// Register `hexo g` and `hexo s`
supported_types.forEach((type) => {
  hexo.extend.generator.register(`${type}s`, function (locals) {
    if (
      !this.config.douban ||
      !this.config.douban[type] ||
      !this.config.douban.builtin
    ) {
      return;
    }

    let path = this.config.douban[type].path;
    if (path) {
      this.config.douban[type].path = path.replace(/^\//, "");
    } else {
      this.config.douban[type].path = `${type}s/index.html`;
    }
    return generate(
      this.config.lang,
      this.config.url,
      type,
      this.config.douban
    ) as any;
  });
});

const options = {
  options: [
    { name: "-b, --books", desc: "Generate douban books only" },
    { name: "-m, --movies", desc: "Generate douban movies only" },
    { name: "-g, --games", desc: "Generate douban games only" },
    { name: "-s, --songs", desc: "Generate douban songs only" },
  ],
};

// Register `hexo douban`
hexo.extend.console.register(
  "douban",
  "Generate pages from douban",
  options,
  function (args) {
    if (!this.config.douban) {
      log.info("No douban config specified");
      return;
    }
    if (!this.config.douban.id) {
      log.info("No douban id specified");
      return;
    }

    let force_types: string[] = [];
    supported_types.forEach((supported_type) => {
      if (
        (Object.keys(args).includes(supported_type[0]) ||
          Object.keys(args).includes(`${supported_type}s`)) &&
        this.config.douban[supported_type]
      ) {
        force_types.push(supported_type);
      }
    });

    let enabled_types: string[] = [];

    if (force_types.length !== 0) {
      enabled_types = force_types;
    } else {
      supported_types.forEach((type) => {
        if (this.config.douban[type]) {
          enabled_types.push(type);
        }
      });
    }

    if (enabled_types.length === 0) {
      log.info("No douban type specified");
      return;
    }

    // Prepare path
    enabled_types.forEach((type) => {
      let path = this.config.douban[type].path;
      if (path) {
        this.config.douban[type].path = path.replace(/^\//, "");
      } else {
        this.config.douban[type].path = `${type}s/index.html`;
      }

      hexo.extend.generator.register(type, function (locals) {
        return generate(
          this.config.lang,
          this.config.url,
          type,
          this.config.douban
        ) as any;
      });
    });

    const self = this;

    //Generate files
    self.load().then(function () {
      enabled_types.forEach((type) => {
        const publicDir = self.public_dir;
        const id = self.config.douban[type].path;
        mkdirSync(path.join(publicDir, id.replace("index.html", "")), {
          recursive: true,
        });

        let stream = self.route.get(id);
        if (stream) {
          self.route.get(id).pipe(createWriteStream(path.join(publicDir, id)));
          log.info("Generated: %s", id);
        }
      });
    });
  }
);

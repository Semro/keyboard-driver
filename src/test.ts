// echo "8 255 0 255" | ./bloody-cli

import { delay } from "./utils";

const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function changeColor() {
  // for (let i = 0; i < 256; i++) {
  //   let r = 255;
  //   let g = 0;
  //   let b = 255;

  //   g += i;
  //   b -= i;

  //   try {
  //     exec(
  //       `echo "8 ${r} ${g} ${b}" | /home/semro/git/a4tech_bloody_p85_driver/bloody-cli`
  //     );
  //   } catch (e) {}

  //   // await delay(100);
  // }

  console.time("test");
  exec(
    `echo "8 255 0 255" | /home/semro/git/a4tech_bloody_p85_driver/bloody-cli`
  );
  console.timeLog("time");
}
changeColor();

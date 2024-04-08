import { GMMK } from "./devices";
import { delay } from "./utils";

const main = async (): Promise<number> => {
  let exitCode = 1;
  let driver: GMMK | undefined;

  try {
    driver = new GMMK();

    await driver.setColor({ red: 0x00, green: 0xff, blue: 0x00 });
    await delay(2000);
  } catch (error) {
    console.log((error as Error).message);
    exitCode = -1;
  } finally {
    if (driver) {
      driver.release();
    }
    return exitCode;
  }
};

main().then((exitCode) => process.exit(exitCode));

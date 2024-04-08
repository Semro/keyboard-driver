import * as usb from "usb";

const VID = 0x09da;
const PID = 0x3735;

const COMMAND_ENDPOINT = 0x03;
const INTERRUPT_ENDPOINT = 0x82;

const main = async () => {
  const device = usb.findByIds(VID, PID);

  device.open();

  const deviceInterface = device.interfaces[1];
  const controlEp = deviceInterface.endpoints.find(
    (e) => e.address === COMMAND_ENDPOINT
  );

  const interruptEp = deviceInterface.endpoints.find(
    (e) => e.address === INTERRUPT_ENDPOINT
  );

  const controlTransfer = controlEp.makeTransfer;
};

main();

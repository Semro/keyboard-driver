import * as usb from "usb";
import { Device } from "usb/dist/usb";
import { Endpoint } from "usb/dist/usb/endpoint";
import { Interface } from "usb/dist/usb/interface";
import { allocAndSet } from "../utils";

const VID = 0x09da;
const PID = 0x3735;

const COMMAND_ENDPOINT = 0x00;
const INTERRUPT_ENDPOINT = 0x80;
const INTERFACE_INDEX = 0;

const A4TECH_MAGIC = 0x07;

const headerBuf = allocAndSet(72, [A4TECH_MAGIC, 0x02, 0x00, 0x01, 0x04, 0x60]);
const footerBuf = allocAndSet(72, [0x04, 0x02, 0x00, 0x02]);

const TIMEOUT = 1000;
export class GMMK {
  device: Device;
  commandEp: Endpoint;
  interruptEp: Endpoint;
  iFace: Interface;

  hasDetachedKernelDriver = false;

  constructor() {
    this.device = usb.findByIds(VID, PID);
    if (!this.device) {
      throw new Error("GMMK Device Not Found");
    }
    this.device.open();

    this.iFace = this.device.interfaces[INTERFACE_INDEX];
    if (this.iFace.isKernelDriverActive()) {
      this.hasDetachedKernelDriver = true;
      this.iFace.detachKernelDriver();
    }
    this.iFace.claim();

    this.commandEp = this.iFace.endpoints.find(
      (e) => e.address === COMMAND_ENDPOINT
    );
    this.interruptEp = this.iFace.endpoints.find(
      (e) => e.address === INTERRUPT_ENDPOINT
    );
    console.log("device", this.device);
    // console.log("iFace", this.iFace);
    console.log("commandEp", this.commandEp);
    console.log("interruptEp", this.interruptEp);
  }

  async commandTransfer(data: Buffer): Promise<Buffer> {
    type TransferCb = Parameters<typeof this.commandEp.makeTransfer>[1];
    return new Promise((resolve, reject) => {
      const cb: TransferCb = (err, data, length) => {
        if (err) {
          return reject(err);
        }
        return resolve(data.slice(0, length));
      };

      const transfer = this.commandEp.makeTransfer(TIMEOUT, cb);
      transfer.submit(data, cb);
    });
  }

  async interruptTransfer(data: Buffer): Promise<Buffer> {
    type TransferCb = Parameters<typeof this.commandEp.makeTransfer>[1];
    return new Promise((resolve, reject) => {
      const cb: TransferCb = (err, data, length) => {
        if (err) {
          return reject(err);
        }
        return resolve(data.slice(0, length));
      };

      const transfer = this.interruptEp.makeTransfer(TIMEOUT, cb);
      transfer.submit(data, cb);
    });
  }

  async setBrightness(level: number): Promise<void> {
    let rxBuffer = Buffer.alloc(64);

    await this.commandTransfer(headerBuf);
    await this.interruptTransfer(rxBuffer);
    rxBuffer = Buffer.alloc(64);

    // Actual request
    const transferBuffer = allocAndSet(64, [
      0x04,
      0x08 + level,
      0x00,
      0x06,
      0x01,
      0x01,
      0x00,
      0x00,
      level,
    ]);
    await this.commandTransfer(transferBuffer);
    await this.interruptTransfer(rxBuffer);
    rxBuffer = Buffer.alloc(64);

    // Footer
    await this.commandTransfer(footerBuf);
    await this.interruptTransfer(rxBuffer);
  }

  async setColor(color: {
    red: number;
    green: number;
    blue: number;
  }): Promise<void> {
    console.log("start setColor");
    let rxBuffer = Buffer.alloc(72);

    const { red, green, blue } = color;
    const COMMAND_OP = 0x18;

    await this.commandTransfer(headerBuf);
    await this.interruptTransfer(rxBuffer);
    rxBuffer = Buffer.alloc(72);

    // Actual request
    const transferBuffer = allocAndSet(72, [
      A4TECH_MAGIC,
      COMMAND_OP,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      red,
      green,
      blue,
    ]);
    await this.commandTransfer(transferBuffer);
    // await this.interruptTransfer(rxBuffer);
    rxBuffer = Buffer.alloc(72);

    // Footer
    // await this.commandTransfer(footerBuf);
    // await this.interruptTransfer(rxBuffer);
  }

  async setLEDMode(mode: number): Promise<void> {
    let rxBuffer = Buffer.alloc(64);

    // Header
    await this.commandTransfer(headerBuf);
    await this.interruptTransfer(rxBuffer);
    rxBuffer = Buffer.alloc(64);

    // Actual request
    const transferBuffer = allocAndSet(64, [
      0x04,
      0x08 + mode,
      0x00,
      0x06,
      0x01,
      0x04,
      0x00,
      0x00,
      mode,
    ]);
    await this.commandTransfer(transferBuffer);
    await this.interruptTransfer(rxBuffer);
    rxBuffer = Buffer.alloc(64);

    // Footer
    await this.commandTransfer(footerBuf);
    await this.interruptTransfer(rxBuffer);
  }

  async setProfile(profile: number): Promise<void> {
    let rxBuffer = Buffer.alloc(64);

    const profile2 = profile * 2;

    // Status request?
    await this.commandTransfer(allocAndSet(64, [0x04, 0x2f, 0x00, 0x03, 0x2c]));
    const currentProfileResponse = Buffer.alloc(64);
    await this.interruptTransfer(currentProfileResponse);

    // Transaction 1
    await this.commandTransfer(headerBuf);
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      Buffer.from([
        0x04, 0x3d, 0x00, 0x05, 0x38, 0x00, 0x00, 0x00, 0x14, 0x03, 0x02, 0x00,
        0x01, 0xff, 0xff, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x06, 0x03, 0x02, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [0x04, 0x67, 0x00, 0x05, 0x38, 0x2a])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [0x04, 0x91, 0x00, 0x05, 0x38, 0x54])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(footerBuf);
    await this.interruptTransfer(rxBuffer);

    // Transaction 2
    await this.commandTransfer(headerBuf);
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [0x04, 0x47 + profile2, 0x00, 0x11, 0x36, 0x00, profile2])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      Buffer.from([
        0x04,
        0x73 + profile2,
        0x0a,
        0x11,
        0x36,
        0x36,
        profile2,
        0x00,
        0x00,
        0x00,
        0x00,
        0xff,
        0xff,
        0x00,
        0xff,
        0xff,
        0x00,
        0xff,
        0xff,
        0x00,
        0xff,
        0xff,
        0x00,
        0xff,
        0xff,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      Buffer.from([
        0x04,
        0xb0 + profile2,
        0x03,
        0x11,
        0x36,
        0x6c,
        profile2,
        0x00,
        0x00,
        0x00,
        0x00,
        0xff,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0xff,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0xff,
        0x00,
        0x00,
        0x00,
        0x00,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [
        0x04,
        0xe7 + profile2,
        0x02,
        0x11,
        0x36,
        0xa2,
        profile2,
        0x00,
        0xff,
        0x00,
        0x00,
        0xff,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [0x04, 0x1f + profile2, 0x01, 0x11, 0x36, 0xd8, profile2])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [
        0x04,
        0x56 + profile2,
        0x00,
        0x11,
        0x36,
        0x0e,
        1 + profile2,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [
        0x04,
        0x90 + profile2,
        0x00,
        0x11,
        0x36,
        0x44,
        1 + profile2,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      allocAndSet(64, [
        0x04,
        0xc6 + profile2,
        0x00,
        0x11,
        0x36,
        0x7a,
        1 + profile2,
      ])
    );
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(footerBuf);
    await this.interruptTransfer(rxBuffer);

    // Final transaction
    await this.commandTransfer(allocAndSet(64, [0x04, 0x2f, 0x00, 0x03, 0x2c]));
    await this.interruptTransfer(rxBuffer);

    await this.commandTransfer(
      Buffer.from([
        0x04,
        0xe2 + profile,
        0x03,
        0x04,
        0x2c,
        0x00,
        0x00,
        0x00,
        0x55,
        0xaa,
        0xff,
        0x02,
        0x45,
        0x0c,
        0x2f,
        0x65,
        0x05,
        0x01,
        profile,
        0x08,
        0x00,
        0x00,
        0x00,
        0x00,
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x08,
        0x07,
        0x09,
        0x0b,
        0x0a,
        0x0c,
        0x0d,
        0x0e,
        0x0f,
        0x10,
        0x11,
        0x12,
        0x14,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ])
    );
    await this.interruptTransfer(rxBuffer);
  }

  release() {
    this.iFace.release();
    if (this.hasDetachedKernelDriver) {
      this.iFace.attachKernelDriver();
    }
  }
}

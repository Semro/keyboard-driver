let dbus = require("dbus-next");
let Message = dbus.Message;

let bus = dbus.sessionBus();

// send a method call to list the names on the bus
let methodCall = new Message({
  destination: "org.freedesktop.DBus",
  path: "/org/freedesktop/DBus",
  interface: "org.freedesktop.DBus",
  member: "ListNames",
});

const start = async () => {
  let reply = await bus.call(methodCall);
  console.log("names on the bus: ", reply.body[0]);

  // add a custom handler for a particular method
  bus.addMethodHandler((msg) => {
    if (
      msg.path === "/org/test/path" &&
      msg.interface === "org.test.interface" &&
      msg.member === "SomeMethod"
    ) {
      // handle the method by sending a reply
      let someMethodReply = Message.newMethodReturn(msg, "s", ["hello"]);
      bus.send(someMethodReply);
      return true;
    }
  });

  // listen to any messages that are sent to the bus
  bus.on("message", (msg) => {
    console.log("got a message: ", msg);
  });
  bus.send;
};

start();

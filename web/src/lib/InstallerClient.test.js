import InstallerClient from "./InstallerClient";
import cockpit from "./cockpit";

const cockpitModule = {
  dbus: () => dbusClient,
  variant: cockpit.variant
};

const DBUS_PATH = "/org/opensuse/YaST/Installer";
const DBUS_IFACE = "org.opensuse.YaST.Installer";

const products = [{ name: "MicroOS", display_name: "openSUSE MicroOS" }];
const languages = { cs_CZ: ["Cestina", "Cestina", ".UTF-8", "", "Checo"] };
const disks = [{ name: "/dev/sda", model: "Some Brand", size: "0.5TiB" }];
const proposal = [
  { mount: "/", device: "/dev/sdb2", type: "btrfs", size: "117354528768" }
];

const methodResponses = {
  GetStatus: 0,
  GetProducts: products,
  GetLanguages: languages,
  GetDisks: disks,
  GetStorage: proposal
};

let dbusClient = {};

beforeEach(() => {
  dbusClient.call = jest.fn().mockImplementation((path, iface, method) => {
    if (path !== DBUS_PATH || iface !== DBUS_IFACE) {
      return Promise.reject();
    }
    return Promise.resolve([methodResponses[method]]);
  });
});

// at this time, it is undefined; but let's be prepared in case it changes
const unmockedFetch = window.fetch;
afterAll(() => {
  window.fetch = unmockedFetch;
});

describe("#authenticate", () => {
  it("resolves to true if the user was successfully authenticated", async () => {
    const client = new InstallerClient(cockpitModule);
    window.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ status: 200 }));
    client.authorize("linux", "password");
    expect(window.fetch).toHaveBeenCalledWith("/cockpit/login", {
      headers: {
        Authorization: "Basic bGludXg6cGFzc3dvcmQ=",
        "X-Superuser": "any"
      }
    });
  });

  it("resolves to false if the user was not authenticated", async () => {
    const client = new InstallerClient(cockpitModule);
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: "Password does not match"
      })
    );
    expect(client.authorize("linux", "password")).rejects.toBe(
      "Password does not match"
    );
  });
});

describe("#isLoggedIn", () => {
  beforeEach(() => {
    jest.spyOn(window, "fetch");
  });

  it("resolves to true if a user is logged in", async () => {
    const client = new InstallerClient(cockpitModule);
    window.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ status: 200 }));
    const logged = await client.isLoggedIn();
    expect(logged).toEqual(true);
    expect(window.fetch).toHaveBeenCalledWith("/cockpit/login");
  });

  it("resolves to false if a user was not logged in", async () => {
    const client = new InstallerClient(cockpitModule);
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: "Password does not match"
      })
    );
    const logged = await client.isLoggedIn();
    expect(logged).toEqual(false);
  });
});

describe("#currentUser", () => {
  it("returns the user name from cockpit", async () => {
    cockpitModule.user = jest.fn().mockResolvedValue("linux");
    const client = new InstallerClient(cockpitModule);
    const username = await client.currentUser();
    expect(username).toEqual("linux");
  });
});

describe("#getStatus", () => {
  it("returns the installer status", async () => {
    const client = new InstallerClient(cockpitModule);
    const status = await client.getStatus();
    expect(status).toEqual(0);
  });
});

describe("#getProducts", () => {
  it("returns the list of available products", async () => {
    const client = new InstallerClient(cockpitModule);
    const availableProducts = await client.getProducts();
    expect(availableProducts).toEqual(products);
  });
});

describe("#getLanguages", () => {
  it("returns the list of available languages", async () => {
    const client = new InstallerClient(cockpitModule);
    const availableLanguages = await client.getLanguages();
    expect(availableLanguages).toEqual([{ id: "cs_CZ", name: "Cestina" }]);
  });
});

describe("#getDisks", () => {
  it("returns the list of available disks", async () => {
    const client = new InstallerClient(cockpitModule);
    const availableDisks = await client.getDisks();
    expect(availableDisks).toEqual(disks);
  });
});

describe("#getStorage", () => {
  it("returns the storage proposal", async () => {
    const client = new InstallerClient(cockpitModule);
    const currentProposal = await client.getStorage();
    expect(currentProposal).toEqual(proposal);
  });
});

describe("#startInstallation", () => {
  it("returns the storage proposal", async () => {
    const client = new InstallerClient(cockpitModule);
    await client.startInstallation();
    expect(dbusClient.call).toHaveBeenCalledWith(
      DBUS_PATH,
      DBUS_IFACE,
      "Start"
    );
  });
});

describe("#getOption", () => {
  it("returns the value for the given option", async () => {
    dbusClient.call = jest.fn().mockResolvedValue([{ v: "/dev/sda", t: "s" }]);

    const client = new InstallerClient(cockpitModule);
    const value = await client.getOption("Disk");
    expect(value).toEqual("/dev/sda");

    expect(dbusClient.call).toHaveBeenCalledWith(
      "/org/opensuse/YaST/Installer",
      "org.freedesktop.DBus.Properties",
      "Get",
      ["org.opensuse.YaST.Installer", "Disk"]
    );
  });

  it("logs an error when the option does not exist", async () => {
    console.error = jest.fn();
    dbusClient.call = jest.fn().mockImplementation(() => {
      throw new Error("it does not exist");
    });

    const client = new InstallerClient(cockpitModule);
    const value = await client.getOption("Disk");
    expect(value).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error getting option "Disk"'),
      expect.anything()
    );
  });
});

describe("#setOption", () => {
  it("sets the value for the given option", async () => {
    dbusClient.call = jest.fn().mockResolvedValue();

    const client = new InstallerClient(cockpitModule);
    await client.setOption("Disk", "/dev/sda");

    expect(dbusClient.call).toHaveBeenCalledWith(
      "/org/opensuse/YaST/Installer",
      "org.freedesktop.DBus.Properties",
      "Set",
      ["org.opensuse.YaST.Installer", "Disk", cockpit.variant("s", "/dev/sda")]
    );
  });
});

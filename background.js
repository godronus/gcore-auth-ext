const storageBox = () => {
  let clientData = {};
  let _decData = {};
  let _key = null;
  let _activeTabId = null;

  const getStorageSettings = () =>
    new Promise((resolve) => {
      browser.storage.local.get(["netlify-auth-data"], function (storedData) {
        resolve(storedData["netlify-auth-data"]);
      });
    });

  setInterval(() => {
    const millis = new Date().getTime();
    const timePastMidnight = millis % 86400000;
    if (timePastMidnight < 3600000) {
      _key = null;
      _decData = {};
    }
  }, 1800000);

  const obfs = (data, code) => {
    // const simpleCrypto = new SimpleCrypto(code);
    // return simpleCrypto.decrypt(data);
    return data;
  };

  return {
    getData: (password, activeTabId) =>
      new Promise(async (resolve, reject) => {
        console.log("Farq: storageBox -> password", password);
        if (!_decData || !_decData.user || !_decData.clients || !_key) {
          if (!_key && !password) {
            _activeTabId = activeTabId;
            await browser.tabs.insertCSS({ file: "password.css" });
            browser.tabs.executeScript({ file: "password.js" }, (result) => {
              console.log("Farq: storageBox -> result", result);
              reject("Need to wait for password input");
            });
          } else if (!_key && password) {
            console.log("Farq: storageBox -> _key", _key);
            console.log("Farq: storageBox -> password", password);
            const storedData = await getStorageSettings();
            _key = password;
            try {
              _decData = obfs(storedData, _key);
            } catch (error) {
              _decData = {};
            }
            return resolve({
              data: { ..._decData },
              activeTabId: _activeTabId,
            });
          }
        } else {
          return resolve({ data: { ..._decData }, activeTabId: _activeTabId });
        }
      }),
    resetKey: () => (_key = null),
    getClients: (activeTabId) =>
      new Promise(async (resolve, reject) => {
        console.log(
          "Farq: storageBox -> getClients -> activeTabId",
          activeTabId
        );
        return resolve({
          clientData: {
            activeTabId,
            default: 4732724,
            clients: [
              { name: "dave", id: 5724298 },
              { name: "gordon", id: 4732724 },
            ],
          },
        });
      }),
    resetKey: () => (_key = null),
  };
};

const store = storageBox();

browser.browserAction.onClicked.addListener(function (tab) {
  console.log("Farq: background -> onClick -> tab", tab);
  browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    var activeTab = tabs[0];
    try {
      const { clientData } = await store.getClients(activeTab.id);
      await browser.tabs.insertCSS({ file: "client-selector.css" });
      browser.tabs.executeScript({ file: "client-selector.js" }, (result) => {
        if (browser.runtime.lastError) {
          console.error(browser.runtime.lastError);
          return;
        }
        // Send the clientData to the content script
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          browser.tabs.sendMessage(tabs[0].id, {
            message: "send_client_data",
            data: clientData,
          });
        });
      });
    } catch (error) {
      /* Do nothing.. Password invalid waiting on input*/
    }
  });
});

// Listen for when a page has finished loading
browser.webNavigation.onCompleted.addListener(async function (details) {
  console.log("Farq: webNavigation -> details", details);
  if (details.frameId === 0) {
    // Ensure it's the main frame
    console.log("Page loaded:", details.url);
  }
});

browser.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log(
    "Farq: background -> onMessage -> request.message",
    request.message
  );
  if (request.message === "client_id_picked") {
    // client_id_picked
    console.log("Farq: request.payload", request.payload);
    const { activeTabId } = request.payload;
    console.log("Farq: activeTabId", activeTabId);
    try {
      browser.tabs.sendMessage(activeTabId, {
        message: "clicked_icon_action",
        payload: request.payload,
      });
    } catch (error) {
      /* Error decrypting */
      console.error("oops....", error);
    }
  }
});

/* Context Menus */

browser.contextMenus.create({
  id: "gcore-auth-data",
  title: "Edit Clients",
  contexts: ["browser_action"],
});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "gcore-auth-data") {
    browser.tabs.create(
      {
        url: browser.extension.getURL("popup.html"),
        active: false,
      },
      function (tab) {
        const w = 1240;
        const h = 740;
        const left = screen.width / 2 - w / 2;
        const top = screen.height / 2 - h / 2;
        browser.windows.create({
          tabId: tab.id,
          type: "popup",
          allowScriptsToClose: true,
          focused: true,
          width: w,
          height: h,
          left: left,
          top: top,
        });
      }
    );
  }
});

/* Web Requests */

const networkFilters = {
  urls: [
    "*://*.staging.rawnet.one/configuration/features",
    "*://*.rawnet.one/configuration/features",
  ],
};

browser.webRequest.onBeforeRequest.addListener((details) => {
  console.log("Farq: details", details);
  const { url } = details;
  const clientName = url.slice(12, url.indexOf("."));
  browser.storage.local.set({ "api-client": clientName });
  browser.storage.local.set({
    "api-context": url.includes(".staging") ? "s" : "p",
  });
}, networkFilters);

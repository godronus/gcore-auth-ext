const storageBox = () => {
  const storageData = {};

  const getStorageData = (type) =>
    new Promise((resolve) => {
      const storageKey = `gcore-auth-${type}-data`;
      if (storageData[storageKey]) {
        return resolve(storageData[storageKey]);
      }
      browser.storage.local.get([storageKey], function (storedData) {
        console.log(
          "Farq: storageBox -> get storedData",
          storageKey,
          "data:",
          storedData
        );
        resolve(storedData);
      });
    });

  const setStorageData = (type, dataToStore, inMemoryOnly = false) =>
    new Promise((resolve) => {
      const storageKey = `gcore-auth-${type}-data`;
      if (inMemoryOnly) {
        storageData[storageKey] = dataToStore;
        return resolve(dataToStore);
      }
      browser.storage.local.set({ [storageKey]: dataToStore }, function (here) {
        console.log("Farq: storageBox -> setReturn", here);
        storageData[storageKey] = dataToStore;
        resolve(dataToStore);
      });
    });

  return {
    getClientData: (activeTabId) =>
      new Promise(async (resolve, reject) => {
        console.log(
          "Farq: storageBox -> getClients -> activeTabId",
          activeTabId
        );
        const clientData = await getStorageData("client");
        console.log("Farq: clientData", clientData);
        return resolve({
          activeTabId,
          ...clientData,
        });
      }),
    setClientData: (activeTabId) => {
      const clientData = {
        default: 4732724,
        clients: [
          { name: "dave", id: 5724298 },
          { name: "gordon", id: 4732724 },
        ],
      };
      return setStorageData("client", clientData);
    },
    getClientSelection: async (activeTabId) => {
      const selectedClients = await getStorageData("selected-client");
      return selectedClients[activeTabId] ?? 0;
    },
    setClientSelection: async (activeTabId, clientId) => {
      const selectedClients = await getStorageData("selected-client");
      console.log("Farq: selectedClients", selectedClients);
      selectedClients[activeTabId] = clientId;
      return await setStorageData(
        "selected-client",
        selectedClients,
        (inMemoryOnly = true)
      );
    },
    getPageHistory: async (activeTabId) => {
      const pageHistory = await getStorageData("page-history");
      return pageHistory[activeTabId];
    },
    setPageHistory: async (activeTabId, url) => {
      const pageHistory = await getStorageData("page-history");
      console.log("Farq: pageHistory", pageHistory);
      pageHistory[activeTabId] = url;
      return await setStorageData(
        "page-history",
        pageHistory,
        (inMemoryOnly = true)
      );
    },
    getPageRedirect: async (activeTabId) => {
      const pageRedirect = await getStorageData("page-redirect");
      return pageRedirect[activeTabId];
    },
    setPageRedirect: async (activeTabId, url) => {
      const pageRedirect = await getStorageData("page-redirect");
      console.log("Farq: pageRedirect", pageRedirect);
      pageRedirect[activeTabId] = url;
      return await setStorageData(
        "page-redirect",
        pageRedirect,
        (inMemoryOnly = true)
      );
    },
  };
};

const store = storageBox();

const urlRegexPatterns = (urlMatches) => {
  return urlMatches.map((pattern) => {
    // Escape special characters and replace * with .*
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\//g, "\\/")
      .replace(/\*/g, ".*");
    // Anchor the pattern
    return `^${regexPattern}$`;
  });
};

const regexSelectClientPatterns = urlRegexPatterns([
  "https://auth*",
  "http://auth*",
]);

browser.browserAction.onClicked.addListener(function (tab) {
  browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTabId = tabs?.[0]?.id;
    const url = tabs?.[0]?.url;
    try {
      // ?fix TEMPORARY HACK TO SET CLIENT DATA - DEVELOPMENT ONLY
      await store.setClientData();

      if (
        !regexSelectClientPatterns.some((regex) => new RegExp(regex).test(url))
      ) {
        // Not a page where we need to select a client
        return;
      }
      const clientData = await store.getClientData(activeTabId);
      await browser.tabs.insertCSS({ file: "client-selector.css" });
      browser.tabs.executeScript({ file: "client-selector.js" }, (result) => {
        if (browser.runtime.lastError) {
          console.error(browser.runtime.lastError);
          return;
        }
        // Send the clientData to the content script
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          browser.tabs.sendMessage(activeTabId, {
            message: "extension_icon_clicked",
            data: clientData,
          });
        });
      });
    } catch (error) {
      /* Do nothing.. cannot log from background script at present. */
    }
  });
});

const regexPageTrackingPatterns = urlRegexPatterns([
  "https://*.gplatform.local/*",
  "https://*.preprod.world/*",
  "https://*.admin.preprod.world/*",
  "https://*.ed-prod.p.gc.onl/*",
  "https://*.gcore.com/*",
  "https://*.gcore.top/*",
  "http://*.gplatform.local/*",
  "http://localhost/*",
  "http://0.0.0.0/*",
]);
// Listen for when a page has finished loading
browser.webNavigation.onCompleted.addListener(async function (details) {
  // Ensure it's the main frame
  if (details.frameId === 0) {
    const { url, tabId: activeTabId } = details;
    if (!url.includes("://auth")) {
      if (
        regexPageTrackingPatterns.some((regex) => new RegExp(regex).test(url))
      ) {
        const pageRedirectUrl = await store.getPageRedirect(activeTabId, url);
        if (pageRedirectUrl) {
          // Redirect to the saved page as this comes from login completion
          await store.setPageRedirect(activeTabId, null);
          return browser.tabs.update(activeTabId, { url: pageRedirectUrl });
        }
        // Native reload.. save history
        return await store.setPageHistory(activeTabId, url);
      }
    }
    if (url.includes("acs?session_id=")) {
      // This implies the login sequence has completed
      browser.tabs.sendMessage(activeTabId, {
        message: "login_sequence_complete_set_redirect_url",
        payload: { activeTabId },
      });
      if (url.includes("/#/acs?session_id=")) {
        // This is the client selection page loading after sso login
        const clientId = await store.getClientSelection(activeTabId);
        setTimeout(() => {
          browser.tabs.sendMessage(activeTabId, {
            message: "client_selection_form_loaded",
            payload: { clientId, activeTabId },
          });
        }, 1000);
      }
    }
  }
});

browser.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log(
    "Farq: background -> onMessage:",
    request.message,
    "payload:",
    request.payload
  );
  try {
    switch (request.message) {
      case "client_id_picked": {
        const { activeTabId, clientId } = request.payload;
        await store.setClientSelection(activeTabId, clientId);
        browser.tabs.sendMessage(activeTabId, {
          message: "start_login_sequence",
          payload: request.payload,
        });
        break;
      }
      case "login_sequence_complete": {
        const { activeTabId } = request.payload;
        console.log("Farq: activeTabId", activeTabId);
        const url = await store.getPageHistory(activeTabId);
        console.log("Farq: redirect -> SAVE -> url (from pageHistory)", url);
        await store.setPageRedirect(activeTabId, url);
      }
    }
  } catch (error) {
    /* Error decrypting */
    console.error("oops....", error);
  }
});

/* Context Menus */

browser.contextMenus.create({
  id: "gcore-auth-edit-clients",
  title: "Edit Clients",
  contexts: ["browser_action"],
});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "gcore-auth-edit-clients") {
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

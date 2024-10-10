const storageBox = () => {
  const storageData = {};

  const getStorageData = (type) =>
    new Promise((resolve) => {
      const storageKey = `gcore-auth-${type}-data`;
      if (storageData[storageKey]) {
        return resolve(storageData[storageKey]);
      }
      browser.storage.local.get([storageKey], function (storedData) {
        resolve(storedData[storageKey] ?? {});
      });
    });

  const setStorageData = (type, dataToStore, inMemoryOnly = false) =>
    new Promise((resolve) => {
      const storageKey = `gcore-auth-${type}-data`;
      if (inMemoryOnly) {
        storageData[storageKey] = dataToStore;
        return resolve(dataToStore);
      }
      browser.storage.local.set({ [storageKey]: dataToStore }, function () {
        storageData[storageKey] = dataToStore;
        resolve(dataToStore);
      });
    });

  return {
    getClientData: (activeTabId) => {
      return new Promise(async (resolve, reject) => {
        const clientData = await getStorageData("client");
        return resolve({
          activeTabId,
          ...clientData,
        });
      });
    },
    setClientData: (activeTabId, clientData) => {
      return setStorageData("client", clientData);
    },
    getClientSelection: async (activeTabId) => {
      const selectedClients = await getStorageData("selected-client");
      return selectedClients[activeTabId] ?? 0;
    },
    setClientSelection: async (activeTabId, clientId) => {
      const selectedClients = await getStorageData("selected-client");
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

const isAuthScreen = (url) => {
  return regexSelectClientPatterns.some((regex) => new RegExp(regex).test(url));
};

browser.browserAction.onClicked.addListener(function (tab) {
  browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTabId = tabs?.[0]?.id;
    const url = tabs?.[0]?.url;
    if (!isAuthScreen(url)) return; // Not a page where we can select a client
    try {
      browser.tabs.insertCSS({ file: "client-selector.css" });
      const clientData = await store.getClientData(activeTabId);
      browser.tabs.sendMessage(activeTabId, {
        message: "extension_icon_clicked",
        data: clientData,
      });
    } catch (error) {
      /* Do nothing.. cannot log from background script at present. */
    }
  });
});

const regexPageTrackingPatterns = urlRegexPatterns([
  "https://*.gplatform.local*",
  "https://*.preprod.world*",
  "https://*.admin.preprod.world*",
  "https://*.ed-prod.p.gc.onl*",
  "https://*.gcore.com*",
  "https://*.gcore.top*",
  "http://*.gplatform.local*",
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

browser.runtime.onMessage.addListener(
  async function (request, sender, sendResponse) {
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
          const url = await store.getPageHistory(activeTabId);
          await store.setPageRedirect(activeTabId, url);
        }
        case "client_selector_closed": {
          browser.tabs.removeCSS({ file: "client-selector.css" });
          break;
        }
        case "client_editor_closed": {
          browser.tabs.removeCSS({ file: "client-edit.css" });
          break;
        }
        case "client_info_save": {
          const { activeTabId, clientData } = request.payload;
          await store.setClientData(activeTabId, clientData);
          break;
        }
      }
    } catch (error) {
      /* Error decrypting */
      console.error("oops....", error);
    }
  }
);

/* Context Menus */

browser.contextMenus.create({
  id: "gcore-auth-edit-clients",
  title: "Edit Clients",
  contexts: ["browser_action"],
});

browser.contextMenus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId === "gcore-auth-edit-clients") {
    const { id: activeTabId, url } = tab;
    if (!isAuthScreen(url)) return; // Not a page where we can select a client
    try {
      await browser.tabs.insertCSS({ file: "client-edit.css" });
      const clientData = await store.getClientData(activeTabId);
      browser.tabs.sendMessage(activeTabId, {
        message: "edit_clients_clicked",
        data: clientData,
      });
    } catch (error) {
      /* Do nothing.. cannot log from background script at present. */
    }
  }
});

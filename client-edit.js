window.handleCListButtonClick = (activeTabId, action, clientId) => {
  if (action === "cancel") {
    window.closeClientEditPanel();
    return;
  }
  if (action === "save") {
    browser.runtime.sendMessage({
      message: "client_info_save",
      payload: {
        activeTabId,
        clientData: { defaultId: window.defaultId, clients: window.clients },
      },
    });
    window.closeClientEditPanel();
    return;
  }
  if (action === "remove") {
    window.clients = window.clients.filter((client) => client.id !== clientId);
  }
  if (action === "default") {
    window.defaultId = clientId;
  }
  window.renderClientListItems(activeTabId);
};

window.closeClientEditPanel = () => {
  window.getClientEditWrapper()?.remove();
  browser.runtime.sendMessage({
    message: "client_editor_closed",
    payload: { activeTabId },
  });
};

window.getClientEditWrapper = () =>
  document.getElementById("clist-client-edit-wrapper");

window.getClientListWrapper = () =>
  document.getElementById("clist-list-wrapper");

window.getClientListInner = () => document.getElementById("clist-list-inner");

window.clearClientListInner = () => {
  window.getClientListInner()?.remove();
  const clientListInner = document.createElement("div");
  clientListInner.id = "clist-list-inner";
  window.getClientListWrapper()?.appendChild(clientListInner);
};

window.createClientListEditor = function (activeTabId) {
  // create page layout
  const clientEditor = document.createElement("div");
  clientEditor.id = "clist-client-edit-wrapper";

  const header = document.createElement("div");
  header.className = "clist-header";
  clientEditor.appendChild(header);

  const headingLabel = document.createElement("h2");
  headingLabel.textContent = "Edit SSO Login Options:";
  header.appendChild(headingLabel);

  const dismissButton = document.createElement("button");
  dismissButton.className = "clist-dismiss-button clist-button";
  dismissButton.textContent = "X";
  dismissButton.addEventListener(
    "click",
    () => window.handleCListButtonClick(activeTabId, "cancel"),
    false
  );
  header.appendChild(dismissButton);

  const clientList = document.createElement("div");
  clientList.classname = "clist-list";

  const headingItem = document.createElement("div");
  headingItem.className = "clist-item clist-heading-row";
  headingItem.dataset.type = "heading";

  const clientTitle = document.createElement("span");
  clientTitle.className = "clist-item-heading clist-item-title";
  clientTitle.textContent = `Client`;
  headingItem.appendChild(clientTitle);

  const defaultTitle = document.createElement("span");
  defaultTitle.className = "clist-item-heading";
  defaultTitle.textContent = `Default (dbl-clk)`;
  headingItem.appendChild(defaultTitle);

  const clientAction = document.createElement("span");
  clientAction.className = "clist-item-heading";
  clientAction.textContent = "";
  headingItem.appendChild(clientAction);

  clientList.appendChild(headingItem);
  clientEditor.appendChild(clientList);

  const clientListWrapper = document.createElement("div");
  clientListWrapper.id = "clist-list-wrapper";
  clientEditor.appendChild(clientListWrapper);

  const footer = document.createElement("div");
  footer.className = "clist-footer";

  const cancelButton = document.createElement("button");
  cancelButton.className = "clist-cancel-button clist-button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener(
    "click",
    () => window.handleCListButtonClick(activeTabId, "cancel"),
    false
  );
  footer.appendChild(cancelButton);

  const saveButton = document.createElement("button");
  saveButton.className = "clist-save-button clist-button";
  saveButton.textContent = "Save";
  saveButton.addEventListener(
    "click",
    () => window.handleCListButtonClick(activeTabId, "save"),
    false
  );
  footer.appendChild(saveButton);
  clientEditor.appendChild(footer);
  document.body.appendChild(clientEditor);
};

window.createClientListItem = (activeTabId, defaultId, client) => {
  const clientListInner = window.getClientListInner();
  if (!clientListInner) return;

  const listItem = document.createElement("div");
  listItem.className = "clist-item";

  const itemTitle = document.createElement("span");
  itemTitle.className = "clist-item-title";
  itemTitle.textContent = `${client.name} (ID ${client.id})`;
  listItem.appendChild(itemTitle);

  const defaultButton = document.createElement("button");
  defaultButton.className = `clist-set-default-button ${
    defaultId === client.id ? "clist-selected" : ""
  }`;
  defaultButton.textContent = defaultId === client.id ? "•" : "";
  defaultButton.addEventListener(
    "click",
    () => window.handleCListButtonClick(activeTabId, "default", client.id),
    false
  );
  listItem.appendChild(defaultButton);

  const removeButton = document.createElement("button");
  removeButton.className = "clist-remove-button clist-button";
  removeButton.textContent = "X";
  removeButton.addEventListener(
    "click",
    () => window.handleCListButtonClick(activeTabId, "remove", client.id),
    false
  );
  listItem.appendChild(removeButton);

  clientListInner.appendChild(listItem);
};

window.clients = [];
window.defaultId = 0;

window.renderClientListItems = (activeTabId) => {
  window.clearClientListInner();
  window.clients.forEach((client) => {
    window.createClientListItem(activeTabId, window.defaultId, client);
  });
};

window.collectLoginClients = async (activeTabId) => {
  const newClients = [];
  try {
    const ulElement = document.querySelector(".account-list");
    if (ulElement) {
      const liElements = ulElement.querySelectorAll("li");
      for (let li of liElements) {
        const spanId =
          li.querySelector("span.account-id")?.textContent?.trim() ?? "";
        const spanName =
          li.querySelector("span.account-name")?.textContent?.trim() ?? "";
        if (spanId && spanName) {
          newClients.push({
            id: parseInt(spanId.replace(/\D/g, "")),
            name: spanName,
          });
        }
      }
    }
    window.mergeDedupedClients(activeTabId, newClients);
  } catch (error) {
    console.error("loginClientSelection -> error", error);
    // Do nothing could just be missing first step of sso login
  }
};

window.mergeDedupedClients = (activeTabId, clients = []) => {
  const uniqueClients = clients.filter((client) => {
    const found = window.clients.find((c) => c.id === client.id);
    return !found;
  });
  window.clients = [...window.clients, ...uniqueClients];
  window.renderClientListItems(activeTabId);
};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.message) {
    case "edit_clients_clicked": {
      const { clients, defaultId, activeTabId } = request.data;
      if (!window.getClientEditWrapper()) {
        createClientListEditor(activeTabId);
        window.defaultId = defaultId;
        window.mergeDedupedClients(activeTabId, clients);
      } else {
        window.collectLoginClients(activeTabId);
      }
      break;
    }
    case "extension_icon_clicked": {
      window.closeClientEditPanel();
      break;
    }
  }
});

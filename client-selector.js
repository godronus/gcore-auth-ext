window.handleSSOButtonClick = (clientId) => {
  const clientButtonWrapper = window.getSsoButtonWrapper();
  const activeTabId = parseInt(clientButtonWrapper.dataset.activeTabId ?? 0);
  if (clientId !== "cancel") {
    browser.runtime.sendMessage({
      message: "client_id_picked",
      payload: { activeTabId, clientId },
    });
  }
  window.closeSelectorPanel();
};

window.closeSelectorPanel = () => {
  window.getSsoPromptWrapper()?.remove();
  browser.runtime.sendMessage({
    message: "client_selector_closed",
    payload: { activeTabId },
  });
};

window.createClientPrompt = function () {
  // create page layout
  const prompt = document.createElement("div");
  prompt.id = "sso-client-prompt-wrapper";

  const header = document.createElement("div");
  header.className = "sso-header";
  prompt.appendChild(header);

  const headingLabel = document.createElement("h2");
  headingLabel.textContent = "Select Client ID:";
  header.appendChild(headingLabel);

  const dismissButton = document.createElement("button");
  dismissButton.className = "sso-dismiss-button sso-button";
  dismissButton.textContent = "X";
  dismissButton.addEventListener(
    "click",
    () => window.handleSSOButtonClick("cancel"),
    false
  );
  header.appendChild(dismissButton);

  const ssoButtonWrapper = document.createElement("div");
  ssoButtonWrapper.className = "sso-button-wrapper";
  prompt.appendChild(ssoButtonWrapper);

  const ssoButton = document.createElement("button");
  ssoButton.className = "sso-button";
  ssoButton.textContent = `SSO`;
  ssoButton.addEventListener(
    "click",
    () => window.handleSSOButtonClick(0),
    false
  );
  ssoButtonWrapper.appendChild(ssoButton);

  let clientButtonWrapper = window.getSsoButtonWrapper();
  if (!clientButtonWrapper) clientButtonWrapper = document.createElement("div");
  clientButtonWrapper.id = "sso-client-button-wrapper";
  prompt.appendChild(clientButtonWrapper);

  const footer = document.createElement("div");
  footer.className = "sso-footer";

  const cancelButton = document.createElement("button");
  cancelButton.className = "sso-cancel-button sso-button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener(
    "click",
    () => window.handleSSOButtonClick("cancel"),
    false
  );
  footer.appendChild(cancelButton);
  prompt.appendChild(footer);

  document.body.appendChild(prompt);
};

window.getSsoButtonWrapper = () =>
  document.getElementById("sso-client-button-wrapper");

window.getSsoPromptWrapper = () =>
  document.getElementById("sso-client-prompt-wrapper");

window.createClientButton = (defaultId, client, columns = "single") => {
  const clientButtonWrapper = window.getSsoButtonWrapper();
  if (!clientButtonWrapper) return;
  const clientButton = document.createElement("button");
  clientButton.className = `sso-button sso-client-button-${columns}`;
  if (defaultId === client.id) {
    clientButton.className += " sso-default-button";
  }
  clientButton.textContent = `${client.name} (${client.id})`;
  clientButton.addEventListener(
    "click",
    () => window.handleSSOButtonClick(client.id),
    false
  );
  clientButtonWrapper.appendChild(clientButton);
};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.message) {
    case "extension_icon_clicked": {
      const { activeTabId, clients, defaultId } = request.data;
      if (!window.getSsoPromptWrapper()) {
        createClientPrompt();
        const clientButtonWrapper = window.getSsoButtonWrapper();
        if (clientButtonWrapper?.children.length === 0) {
          clientButtonWrapper.dataset.activeTabId = activeTabId;
          const columns =
            clients.length < 12
              ? "single"
              : clients.length < 20
              ? "double"
              : "triple";

          clients.forEach((client) => {
            window.createClientButton(defaultId, client, columns);
          });
        }
      } else {
        browser.runtime.sendMessage({
          message: "client_id_picked",
          payload: { activeTabId, clientId: defaultId },
        });
        window.closeSelectorPanel();
      }
      break;
    }
    case "edit_clients_clicked": {
      window.closeSelectorPanel();
      break;
    }
  }
});

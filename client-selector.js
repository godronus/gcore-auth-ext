window.handleSSOButtonClick = (clientId) => {
  const clientButtonWrapper = window.getButtonWrapper();
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
  const clientPromptWrapper = document.getElementById("client-prompt-wrapper");
  if (clientPromptWrapper) {
    clientPromptWrapper.remove();
    delete window.selectorIsOpen;
  }
};

window.client_prompt = function () {
  if (window.selectorIsOpen) {
    return;
  }
  window.selectorIsOpen = true;

  // create page layout
  const prompt = document.createElement("div");
  prompt.id = "client-prompt-wrapper";

  const header = document.createElement("div");
  header.className = "sso-header";
  prompt.appendChild(header);

  const headingLabel = document.createElement("h2");
  headingLabel.textContent = "Select Client Id:";
  header.appendChild(headingLabel);

  const dismissButton = document.createElement("button");
  dismissButton.className = "dismiss-button";
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

  let clientButtonWrapper = window.getButtonWrapper();
  if (!clientButtonWrapper) clientButtonWrapper = document.createElement("div");
  clientButtonWrapper.id = "client-button-wrapper";
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

window.getButtonWrapper = () =>
  document.getElementById("client-button-wrapper");

window.createClientButton = (default_id, client, columns = "single") => {
  const clientButtonWrapper = window.getButtonWrapper();
  if (!clientButtonWrapper) return;
  const clientButton = document.createElement("button");

  clientButton.className = `sso-button sso-client-button-${columns}`;
  if (default_id === client.id) {
    clientButton.className += " sso-default-button";
  }
  clientButton.textContent = `${client.name} (${client.id})`;
  clientButton.addEventListener(
    "click",
    () => window.handleSSOButtonClick(client.id),
    false
  );
  clientButtonWrapper.appendChild(clientButton);
  console.log("innerHTML", clientButtonWrapper.innerHTML);
};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "extension_icon_clicked") {
    const clientButtonWrapper = window.getButtonWrapper();
    if (window.selectorIsOpen && clientButtonWrapper?.children.length === 0) {
      clientButtonWrapper.dataset.activeTabId = request.data.activeTabId;
      const columns =
        clientData.clients.length < 12
          ? "single"
          : clientData.clients.length < 20
          ? "double"
          : "triple";

      request.data.clients.forEach((client) => {
        window.createClientButton(request.data.default, client, columns);
      });
    }
  }
});

client_prompt();

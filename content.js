const waitForElement = (selector, timeout = 2000) => {
  console.log("Farq: waitForElement -> selector", selector);
  return new Promise((resolve, reject) => {
    const interval = 100; // Check every 100ms
    const endTime = Date.now() + timeout;

    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
        console.log("Farq: found -> element", element);
        resolve(element);
      } else if (Date.now() > endTime) {
        // Element with selector "${selector}" not found within ${timeout}ms
        reject(null);
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
};

const getSsoLoginButton = async () => {
  const [{ value: ssoBubble }, { value: ssoLink }] = await Promise.allSettled([
    waitForElement(".sso-bubble", 1000),
    waitForElement(".link.ng-star-inserted", 1000),
  ]);
  if (!ssoBubble && !ssoLink) {
    throw new Error("Cannot find sso-bubble or sso-link");
  }
  return ssoBubble || ssoLink;
};

const ssoLogin = async () => {
  try {
    const ssoButton = await getSsoLoginButton();
    console.log("Farq: ssoLogin -> ssoButton", ssoButton);
    if (ssoButton) {
      // Simulate a click on the button or link
      ssoButton.click();
    }
  } catch (error) {
    // Do nothing could just be missing first step of sso login
    console.log("Farq: Cannot find sso-login button or link");
  }

  await waitForElement("#sign-in-sso-domain");
  const ssoDomainInput = document.getElementsByClassName(
    "cdk-text-field-autofill-monitored"
  )?.[0];
  if (ssoDomainInput) {
    ssoDomainInput.value = "gcore.lu";
    ssoDomainInput.dispatchEvent(new Event("input", { bubbles: true }));
    // Click login
    const pendingButton = document.querySelector(".pending-button-component");
    if (pendingButton) {
      pendingButton.click();
    }
  }
};

const loginClientSelection = async (activeTabId, clientId) => {
  console.log(
    "Farq: loginClientSelection -> clientId",
    clientId,
    "activeTabId",
    activeTabId
  );
  try {
    await waitForElement(".account-list", 5000);
    const ulElement = document.querySelector(".account-list");
    console.log("Farq: clientLogin -> ulElement", ulElement);
    if (ulElement) {
      const liElements = ulElement.querySelectorAll("li");
      for (let li of liElements) {
        const span = li.querySelector("span.account-id");
        const link = li.querySelector("a");
        if (span && span.textContent.trim().includes(clientId)) {
          console.log("Farq: loginClientSelection -> li", li);
          browser.runtime.sendMessage({
            message: "login_sequence_complete",
            payload: { activeTabId },
          });
          return link.click();
        }
      }
    }
  } catch (error) {
    console.log("Farq: loginClientSelection -> error", error);
    // Do nothing could just be missing first step of sso login
  }
};

browser.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log("Farq: content-script.js: onMessage:", request.message);
  console.log("Farq: content-script.js: request", request);
  try {
    switch (request.message) {
      case "start_login_sequence": {
        await ssoLogin();

        break;
      }
      case "client_selection_form_loaded": {
        if (request.payload.clientId) {
          console.log("Farq: request.payload", request.payload);
          await loginClientSelection(
            request.payload.activeTabId,
            request.payload.clientId
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error(
      "Login Extension Error: Unable to navigate SSO Login controls"
    );
  }
});

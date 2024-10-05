const waitForElement = (selector, timeout = 2000) => {
  return new Promise((resolve, reject) => {
    const interval = 100; // Check every 100ms
    const endTime = Date.now() + timeout;

    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
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
    waitForElement(".footer-link > a.link", 1000),
  ]);
  if (!ssoBubble && !ssoLink) {
    throw new Error("Cannot find sso-bubble or sso-link");
  }
  return ssoBubble || ssoLink;
};

const getSignInButton = async () => {
  const [{ value: signIn }, { value: adminSignIn }] = await Promise.allSettled([
    waitForElement(".pending-button-component", 1000),
    waitForElement('[data-gc-id="signInButton"]', 1000),
  ]);
  if (!signIn && !adminSignIn) {
    throw new Error("Cannot find sign-in button");
  }
  return signIn || adminSignIn;
};

const ssoLogin = async () => {
  try {
    const ssoButton = await getSsoLoginButton();
    if (ssoButton) {
      // Simulate a click on the button or link
      ssoButton.click();
    }
  } catch (error) {
    // Do nothing could just be missing first step of sso login
    console.error("Cannot find sso-login button or link");
  }

  await waitForElement("#sign-in-sso-domain");
  const ssoDomainInput = document.getElementsByClassName(
    "cdk-text-field-autofill-monitored"
  )?.[0];
  if (ssoDomainInput) {
    ssoDomainInput.value = "gcore.lu";
    ssoDomainInput.dispatchEvent(new Event("input", { bubbles: true }));
    // Click login
    const signInButton = await getSignInButton();
    if (signInButton) {
      signInButton.click();
    }
  }
};

const sendLoginSequenceComplete = (activeTabId) => {
  browser.runtime.sendMessage({
    message: "login_sequence_complete",
    payload: { activeTabId },
  });
};

const loginClientSelection = async (activeTabId, clientId) => {
  try {
    const ulElement = await waitForElement(".account-list", 5000);
    if (ulElement) {
      const liElements = ulElement.querySelectorAll("li");
      for (let li of liElements) {
        const span = li.querySelector("span.account-id");
        const link = li.querySelector("a");
        if (span && span.textContent.trim().includes(clientId)) {
          sendLoginSequenceComplete(activeTabId);
          return link.click();
        }
      }
    }
  } catch (error) {
    console.error("loginClientSelection -> error", error);
    // Do nothing could just be missing first step of sso login
  }
};

browser.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  try {
    switch (request.message) {
      case "start_login_sequence": {
        await ssoLogin();
        break;
      }
      case "client_selection_form_loaded": {
        if (request.payload.clientId) {
          await loginClientSelection(
            request.payload.activeTabId,
            request.payload.clientId
          );
        }
        break;
      }
      case "login_sequence_complete_set_redirect_url": {
        if (request.payload.activeTabId) {
          await sendLoginSequenceComplete(request.payload.activeTabId);
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

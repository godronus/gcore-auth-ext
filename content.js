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

const ssoLogin = async (user, clientName, data) => {
  try {
    const ssoButton = await getSsoLoginButton();
    console.log("Farq: ssoLogin -> ssoButton", ssoButton);
    if (ssoButton) {
      // Simulate a click on the div
      ssoButton.click();
    }
  } catch (error) {
    // Do nothing could just be missing first step of sso login
    console.log("Farq: Cannot find sso-login button or link");
  }

  // try {
  //   await waitForElement(".link.ng-star-inserted", 1000);
  //   const ssoLink = document.querySelector(".link.ng-star-inserted");
  //   console.log("Farq: ssoLogin -> ssoLink", ssoLink);
  //   if (ssoLink) {
  //     // Simulate a click on the div
  //     ssoLink.click();
  //   }
  // } catch (error) {
  //   // Do nothing could just be missing first step of sso login
  //   console.log("Farq: Cannot find sso-link");
  // }

  await waitForElement("#sign-in-sso-domain");
  const ssoDomainInput = document.getElementsByClassName(
    "cdk-text-field-autofill-monitored"
  )?.[0];
  if (ssoDomainInput) {
    // Set the value of the input element
    ssoDomainInput.value = "gcore.lu";
    ssoDomainInput.dispatchEvent(new Event("input", { bubbles: true }));
    // Click login
    const pendingButton = document.querySelector(".pending-button-component");
    if (pendingButton) {
      pendingButton.click();
    }
  }
};

const clientLogin = async (user, clientName, data) => {
  try {
    await waitForElement(".account-list", 1000);
    const ul = document.querySelector(".account-list");
    console.log("Farq: clientLogin -> ul", ul);
    if (ul) {
    }
  } catch (error) {
    // Do nothing could just be missing first step of sso login
  }

  // await waitForElement("#sign-in-sso-domain");
  // const ssoDomainInput = document.getElementsByClassName(
  //   "cdk-text-field-autofill-monitored"
  // )?.[0];
  // if (ssoDomainInput) {
  //   // Set the value of the input element
  //   ssoDomainInput.value = "gcore.lu";
  //   ssoDomainInput.dispatchEvent(new Event("input", { bubbles: true }));
  //   // Click login
  //   const pendingButton = document.querySelector(".pending-button-component");
  //   if (pendingButton) {
  //     pendingButton.click();
  //   }
  // }
};

browser.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log("Farq 111111: request", request.message);
  if (request.message === "clicked_icon_action") {
    try {
      await ssoLogin();
      if (request.payload.clientId) {
        console.log("Farq: request.payload", request.payload);
        await clientLogin(request.payload.clientId);
      }
    } catch (error) {
      console.error(
        "Login Extension Error: Unable to navigate SSO Login controls"
      );
    }
    // const storageData = request.payload;
    // if (!storageData.clients) return;
    // const { origin } = window.location;
    // if (!window.document.getElementById("thisisone")) {
    //   let clientName = origin.replace(
    //     /(http:|https:|\/|.staging.rawnet.one|.rawnet.one|.staging.thisisone.tv|.thisisone.tv|localhost:\d+|0.0.0.0:\d+)/gi,
    //     ""
    //   );
    //   if (origin.includes("netlify.app")) {
    //     // branch deploy - e.g. 'one-1674-single-entry--banijaygroup-staging.netlify.app'
    //     const startIndex = origin.lastIndexOf("--") + 2;
    //     let endIndex = origin.indexOf("-staging.netlify.app");
    //     if (endIndex === -1) {
    //       endIndex = origin.indexOf("-production.netlify.app");
    //     }
    //     clientName = origin.slice(startIndex, endIndex);
    //   }
    //   sendNetlifyAuth(storageData.clients[clientName]["n"]);
    // } else {
    //   const apiClientName = await getClientName();
    //   sendOneLogin(
    //     storageData.user,
    //     apiClientName,
    //     storageData.clients[apiClientName]
    //   );
    // }
  }
});

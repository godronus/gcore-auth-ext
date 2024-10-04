const obfs = (data, passCode) => {
  const simpleCrypto = new SimpleCrypto(passCode);
  return simpleCrypto.encrypt(data);
};

document.getElementById("save-btn").onclick = function (e) {
  const passwords = (document.getElementById("passwords").value || "").replace(
    /[\n\s\r]+/g,
    ""
  );
  const passKey = (document.getElementById("passkey").value || "").replace(
    /[\n\s\r]+/g,
    ""
  );
  try {
    if (passKey.length === 0) {
      throw new Error("Missing Pass Key");
    }
    JSON.parse(passwords); //verify it is JSON
    const dataToStore = obfs(passwords, passKey);
    browser.runtime.getBackgroundPage(function () {
      browser.storage.local.set(
        { "netlify-auth-data": dataToStore },
        function () {
          window.close();
        }
      );
    });
  } catch (error) {
    alert("Cannot Parse data.. Invalid JSON or missing Pass Key");
  }
};

document.getElementById("cancel-btn").onclick = (e) => {
  window.close();
};

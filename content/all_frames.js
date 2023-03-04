let token;
let clicked;

async function handleClick(event) {
  let target = null;
  if (event.target.matches("input[type=file]:not([webkitdirectory])")) {
	  target = event.target;
  } else if (event.originalTarget.matches("input[type=file]:not([webkitdirectory])")) {
	  target = event.originalTarget;
  }
  if (target !== null) {
    event.preventDefault();

    // Reading the clipboard via the background page allows the add-on to work in non-secure contexts
    // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
    const clipboardImage = await browser.runtime.sendMessage({ type: "clipboardImage" });

    if (!clipboardImage) return target.showPicker();

    // Again, non-secure contexts...
    token = await browser.runtime.sendMessage({ type: "randomUUID" });
    clicked = target;

    const inputAttributes = {};

    for (attr of target.attributes) {
      inputAttributes[attr.name] = { name: attr.name, value: attr.value };
    }

    return browser.runtime.sendMessage({ type: "click", token, inputAttributes, clipboardImage });
  }
}

window.addEventListener("click", handleClick);

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.type === "fileChanged") {
    if (token === data.token) {
      clicked.files = structuredClone(data.files);
      clicked.dispatchEvent(new Event("input", { bubbles: true }));
      clicked.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  return false;
});

// Let the extension work on pages that stop propagation of input events (tinypng.com, etc.)
exportFunction(
  function () {
    this.stopPropagation();
    if (this.type === "click") handleClick(this);
  },
  Event.prototype,
  { defineAs: "stopPropagation" }
);
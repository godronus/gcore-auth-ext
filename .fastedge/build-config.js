const config = {
  "type": "static",
  "input": ".fastedge/static-index.js",
  "ignoreDotFiles": true,
  "ignoreDirs": [
    "./node_modules"
  ],
  "ignoreWellKnown": false,
  "output": ".fastedge/dist/fastedge.wasm",
  "publicDir": "./dist"
};

const serverConfig = {
  "type": "static",
  "extendedCache": [],
  "publicDirPrefix": "",
  "compression": [],
  "notFoundPage": "/404.html",
  "autoExt": [],
  "autoIndex": [
    "index.html",
    "index.htm"
  ],
  "spaEntrypoint": null
}

export { config, serverConfig };

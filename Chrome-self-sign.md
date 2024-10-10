To self-sign and publish a Chrome extension for your own hosting without a Chrome Developer account, you can follow these steps:

1. Prepare Your Extension: Ensure your extension's source code is ready and includes a valid manifest.json file.

2. Install crx Tool: If you haven't already, install the crx tool globally using npm.

```
npm install -g crx
```

3. Generate a Private Key: If you don't already have a private key, you can generate one using OpenSSL.

```
openssl genrsa -out key.pem 2048
```

4. Package the Extension: Use the crx tool to package your extension into a .crx file using the private key.

```
crx pack path/to/your/extension --key=path/to/key.pem --output=path/to/your/extension.crx
```

5. Host the Extension: Upload the .crx file to your web server.

6. Create an Update Manifest: Create an update.xml file that Chrome will use to check for updates. This file should be hosted on your server and should look something like this:

```
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="YOUR_EXTENSION_ID">
    <updatecheck codebase="https://yourserver.com/path/to/your/extension.crx" version="1.0" />
  </app>
</gupdate>
```

Replace YOUR_EXTENSION_ID with the ID of your extension (which you can find in the manifest.json file after loading the extension in Chrome), and update the codebase and version attributes accordingly.

7. Update Your manifest.json: Add the update_url field to your manifest.json file to point to your update.xml file.

```
{
  "manifest_version": 2,
  "name": "Your Extension",
  "version": "1.0",
  "description": "Description of your extension",
  "update_url": "https://yourserver.com/path/to/update.xml",
  // other fields...
}
```

Example

Assuming your extension's source code is in a directory called `my-extension`, here is a step-by-step example:

1. Navigate to Your Extension Directory:

   ```
   cd path/to/my-extension
   ```

2. Generate a Private Key:

```
openssl genrsa -out key.pem 2048
```

3. Package the Extension:

```
crx pack . --key=key.pem --output=my-extension.crx
```

4. Host the Extension: Upload my-extension.crx to your web server.

5. Create update.xml:

```
  <?xml version="1.0" encoding="UTF-8"?>
  <gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="YOUR_EXTENSION_ID">
  <updatecheck codebase="https://yourserver.com/path/to/my-extension.crx" version="1.0" />
  </app>
  </gupdate>
```

Update manifest.json:

```
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0",
  "description": "Description of my extension",
  "update_url": "https://yourserver.com/path/to/update.xml",
  // other fields...
}
```

By following these steps, you can self-sign and host your Chrome extension without needing a Chrome Developer account.

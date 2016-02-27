# atlas
Dispatcher dashboard for Onfleet replacement

Dependencies:
1. The socket.io client for javascript - This isn't hosted online anywhere so you have to download the
file from GitHub. The file is also distributed with the socket.io module for Node.js so you can use
npm to download the module and copy it over from there.

symlink js/config.js -> config/shared/local.js
`ln -s ../config/shared/local.js js/config.js`
Be sure to ignore the symlink in your `.gitignore`



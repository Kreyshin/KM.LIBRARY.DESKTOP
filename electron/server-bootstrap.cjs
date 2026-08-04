const Module = require('module');
const path = require('path');

const serverRoot = __dirname;
process.env.NODE_PATH = path.join(serverRoot, 'modules');
Module._initPaths();
require(path.join(serverRoot, 'dist', 'main.js'));

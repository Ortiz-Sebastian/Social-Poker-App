const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce the number of watched files to avoid EMFILE errors
config.watchFolders = [];
config.resolver.blockList = [
  /node_modules\/.*\/node_modules/,
  /\.git\/.*/,
];

module.exports = config;

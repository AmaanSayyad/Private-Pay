// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  console.log("Deploying Private DeFi programs to", provider.connection.rpcEndpoint);
  
  // Add your deploy script here.
  console.log("✅ Programs deployed successfully!");
  console.log("\nNext steps:");
  console.log("1. Initialize computation definitions for each program");
  console.log("2. Create swap pools or order books");
  console.log("3. Update frontend with deployed program IDs");
};

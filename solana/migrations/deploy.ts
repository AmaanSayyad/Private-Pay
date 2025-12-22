// Migrations are an early feature. Currently, they're nothing more than this
// temporary script that simply outputs the deploy transaction with a given
// signer that can be submitted to devnet/mainnet.

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider: any) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.
};







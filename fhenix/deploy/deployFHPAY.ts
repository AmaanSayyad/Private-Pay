import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("FHPAY", {
    from: deployer,
    log: true,
  });

  console.log(`FHPAY contract deployed at: ${deployed.address}`);

  const verificationArgs = {
    address: deployed.address,
    contract: "contracts/FHPAY.sol:FHPAY",
  };

  try {
    console.info("\nSubmitting verification request on Arbiscan...");
    await hre.run("verify:verify", verificationArgs);
  } catch (err) {
    console.warn("Verification failed (this can be ignored in dev):", err);
  }
};

export default func;
func.id = "deploy_FHPAY";
func.tags = ["FHPAY"];



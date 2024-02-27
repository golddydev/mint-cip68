import {
  Lucid,
  MintingPolicy,
  applyDoubleCborEncoding,
  applyParamsToScript,
} from 'https://deno.land/x/lucid@0.10.7/mod.ts';

import blueprint from '../plutus.json' assert { type: 'json' };

export const readMintingPolicy: () => MintingPolicy = () => {
  const validator = blueprint.validators[0];
  return {
    type: 'PlutusV2',
    script: validator.compiledCode,
  };
};

export const applyParamsToMintingPolicy: (
  mintingPolicy: MintingPolicy,
  priceInAda: bigint,
  creator: string,
  lucid: Lucid
) => {
  mintingPolicy: MintingPolicy;
  policyId: string;
} = (mintingPolicy, priceInAda, creator, lucid) => {
  const appliedMintingPolicyScript = applyParamsToScript(mintingPolicy.script, [
    BigInt(priceInAda),
    creator,
  ]);
  const appliedMintingPolicy: MintingPolicy = {
    type: 'PlutusV2',
    script: applyDoubleCborEncoding(appliedMintingPolicyScript),
  };
  const policyId = lucid.utils.validatorToScriptHash(appliedMintingPolicy);

  return {
    mintingPolicy: appliedMintingPolicy,
    policyId,
  };
};

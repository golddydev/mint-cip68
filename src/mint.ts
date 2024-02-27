import {
  Blockfrost,
  Data,
  Lucid,
  Constr,
  fromText,
  C,
} from 'https://deno.land/x/lucid@0.10.7/mod.ts';

// import dotenv
import 'https://deno.land/x/dotenv@v3.2.2/load.ts';

// import utils
import { readMintingPolicy, applyParamsToMintingPolicy } from './utils.ts';

const lucid = await Lucid.new(
  new Blockfrost(
    'https://cardano-preprod.blockfrost.io/api/v0',
    Deno.env.get('BLOCKFROST_API_KEY')
  ),
  'Preprod'
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile('./key.sk'));

const mintingPrice = 10000000n; // 10 ada
const creatorAddress =
  'addr_test1qz2vnfzpeuvdcym8y7v5qnz2mc289ue6tfr0xynyaqnm0rhuanngtqdu53qy0c0zxxed8hdnmkl66l0uvw68q8elp4ns9jqpas';
// payment cred key hash of creatorAddress
const creatorPaymentKeyHash =
  '94c9a441cf18dc13672799404c4ade1472f33a5a46f31264e827b78e';
// stake cred key hash of creatorAddresss
const creatorStakeKeyHash =
  'fcece68581bca44047e1e231b2d3ddb3ddbfad7dfc63b4701f3f0d67';

// token metadata detail
const assetName = 'Test NFT 1';
const ipfsURI = 'ipfs://Qme4khNziAZ4YveEL9MB1rkUprNnmwwirqUrCtKcDEyg3v';
const mediaType = 'image/jpeg';
const properties = [
  {
    key: 'type',
    value: 'announcement',
  },
  {
    key: 'snake',
    value: 'Konda',
  },
];

// make minting policy
const { policyId, mintingPolicy } = applyParamsToMintingPolicy(
  readMintingPolicy(),
  mintingPrice,
  creatorPaymentKeyHash,
  lucid
);

const contractWithStakeKeyAddress = lucid.utils.validatorToAddress(
  mintingPolicy,
  { type: 'Key', hash: creatorStakeKeyHash }
);

// build metadata datum

// build files_detail
const filesDetail = new Map();
filesDetail.set(fromText('name'), fromText(assetName));
filesDetail.set(fromText('src'), fromText(ipfsURI));
filesDetail.set(fromText('mediaType'), fromText(mediaType));

const metadata = new Map();
metadata.set(fromText('name'), fromText(assetName));
metadata.set(fromText('image'), fromText(ipfsURI));
filesDetail.set(fromText('mediaType'), fromText(mediaType));
metadata.set(fromText('files'), [filesDetail]);
// set properties
properties.forEach((property) =>
  metadata.set(fromText(property.key), fromText(property.value))
);

const datum = Data.to(
  new Constr(0, [
    metadata,
    1n,
    new Constr(0, [fromText(policyId), fromText(assetName)]),
  ])
);

// build minting tx

// Action::Mint
const mintRedeemer = Data.to(new Constr(0, []));
const utxos = await lucid?.wallet.getUtxos()!;
const utxo = utxos[0];

const tx = await lucid
  .newTx()
  .collectFrom([utxo])
  .attachMintingPolicy(mintingPolicy)
  .mintAssets(
    {
      [`${policyId}000643b0${fromText(assetName)}`]: 1n, // reference
      [`${policyId}000de140${fromText(assetName)}`]: 1n, // user
    },
    mintRedeemer
  )
  .payToAddress(creatorAddress, {
    lovelace: mintingPrice,
  })
  .payToAddressWithData(contractWithStakeKeyAddress, datum, {
    [`${policyId}000643b0${fromText(assetName)}`]: 1n, // reference
  })
  .complete();

const txSigned = await tx.sign().complete();
const txHash = await txSigned.submit();
console.log(txHash);

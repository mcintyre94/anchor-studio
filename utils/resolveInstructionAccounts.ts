import {
  bytesTypeNode,
  InstructionAccountNode,
  InstructionArgumentNode,
  InstructionNode,
  ProgramNode,
} from "codama";
import {
  type Address,
  getAddressEncoder,
  getProgramDerivedAddress,
  isAddress,
  ReadonlyUint8Array,
} from "@solana/kit";
import { getNodeCodec } from "@codama/dynamic-codecs";

export async function resolveInstructionAccounts<
  TAccounts extends InstructionAccountNode[] = InstructionAccountNode[],
  TArguments extends InstructionArgumentNode[] = InstructionArgumentNode[],
>(
  program: ProgramNode,
  instruction: InstructionNode<TAccounts, TArguments>,
  currentAccounts: Record<string, Address>,
  args: Record<string, any>,
  userAddress: Address
): Promise<Record<string, Address>> {
  const latestAccounts: Record<string, Address> = Object.fromEntries(
    // filter out accounts set to empty string or anything invalid
    Object.entries(currentAccounts).filter(([_name, value]) => isAddress(value))
  );

  const addressEncoder = getAddressEncoder();

  // first pass, handle the constants
  for (const account of instruction.accounts) {
    if (account.defaultValue) {
      if (account.defaultValue.kind === "publicKeyValueNode") {
        latestAccounts[account.name] = account.defaultValue
          .publicKey as Address;
      }

      if (account.defaultValue.kind === "payerValueNode") {
        latestAccounts[account.name] = userAddress;
      }
    }
  }

  console.log("first pass done", { currentAccounts, latestAccounts });

  // second pass, handle the PDAs
  // note we don't handle dependencies specially here, if PDAs are dependencies of each other they may not be resolved currently
  for (const account of instruction.accounts) {
    if (account.defaultValue) {
      if (account.defaultValue.kind === "pdaValueNode") {
        const { pda, seeds } = account.defaultValue;
        if (pda.kind === "pdaNode") {
          let missingSeed = false;
          let encodedSeeds: ReadonlyUint8Array[] = [];
          for (const seed of seeds) {
            if (seed.value.kind === "accountValueNode") {
              const accountName = seed.value.name;
              // use seed from latestAccounts, which we may have updated already
              if (latestAccounts[accountName]) {
                encodedSeeds.push(
                  addressEncoder.encode(latestAccounts[accountName])
                );
              } else {
                missingSeed = true;
              }
              continue;
            }

            // TODO: not tested yet
            if (seed.value.kind === "argumentValueNode") {
              const argName = seed.value.name;
              if (args[argName]) {
                const arg = instruction.arguments.find(
                  (a) => a.name === argName
                );
                if (arg?.type) {
                  encodedSeeds.push(
                    getNodeCodec([program, instruction, arg]).encode(
                      args[argName]
                    )
                  );
                } else {
                  missingSeed = true;
                }
              } else {
                missingSeed = true;
              }
              continue;
            }

            // constant seed node
            if (seed.value.kind === "bytesValueNode") {
              const { encoding, data } = seed.value;
              encodedSeeds.push(
                getNodeCodec([bytesTypeNode()], {
                  bytesEncoding: encoding,
                }).encode([encoding, data])
              );
              continue;
            }

            console.warn("unsupported seed.value kind: ", seed.value.kind, {
              seed,
            });
            missingSeed = true;
          }

          if (!missingSeed) {
            const programAddress = (pda.programId ??
              program.publicKey) as Address;
            const [pdaAddress] = await getProgramDerivedAddress({
              programAddress,
              seeds: encodedSeeds,
            });

            latestAccounts[account.name] = pdaAddress;
          }
        }
      }
    }
  }

  console.log("second pass done", { currentAccounts, latestAccounts });

  return latestAccounts;
}

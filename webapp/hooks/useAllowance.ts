import { useMemo } from 'react'
import { isNativeAddress } from 'utils/nativeToken'
import { type Address, type ContractFunctionArgs, erc20Abi } from 'viem'
import { type UseReadContractParameters, useReadContract } from 'wagmi'

type AllowanceArgs = ContractFunctionArgs<typeof erc20Abi, 'view', 'allowance'>

type Owner = AllowanceArgs[0]
type Spender = AllowanceArgs[1]

type Options = {
  args: { owner: Owner; spender: Spender }
  query?: UseReadContractParameters<typeof erc20Abi, 'allowance'>['query']
}

export const useAllowance = (
  erc20Address: Address,
  { args: { owner, spender }, query }: Options,
) =>
  useReadContract({
    abi: erc20Abi,
    address: erc20Address,
    args: useMemo(() => [owner, spender], [owner, spender]),
    functionName: 'allowance',
    query: {
      ...query,
      enabled:
        !isNativeAddress(erc20Address) &&
        !!owner &&
        !!spender &&
        query?.enabled !== false,
    },
  })

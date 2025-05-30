import {
  hemiPublicBitcoinKitActions,
  hemiPublicBitcoinTunnelManagerActions,
  hemiPublicSimpleBitcoinVaultActions,
  hemiPublicSimpleBitcoinVaultStateActions,
  hemiWalletBitcoinTunnelManagerActions,
  hemi as hemiMainnet,
  hemiSepolia,
} from 'hemi-viem'
import {
  hemiPublicStakeActions,
  hemiWalletStakeActions,
} from 'hemi-viem-stake-actions'
import { useMemo } from 'react'
import { hemiPublicExtraActions } from 'utils/hemiClientExtraActions'
import { type WalletClient, type PublicClient } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { useHemi } from './useHemi'

const defaultBitcoinVaults = {
  [hemiMainnet.id]: Number.parseInt(
    process.env.NEXT_PUBLIC_DEFAULT_BITCOIN_VAULT_MAINNET || '0',
  ),
  [hemiSepolia.id]: Number.parseInt(
    process.env.NEXT_PUBLIC_DEFAULT_BITCOIN_VAULT_SEPOLIA || '0',
  ),
}

export const publicClientToHemiClient = (publicClient: PublicClient) =>
  publicClient
    .extend(hemiPublicBitcoinKitActions())
    .extend(hemiPublicSimpleBitcoinVaultActions())
    .extend(hemiPublicSimpleBitcoinVaultStateActions())
    .extend(hemiPublicBitcoinTunnelManagerActions())
    .extend(hemiPublicStakeActions())
    .extend(hemiPublicExtraActions({ defaultBitcoinVaults }))

export const useHemiClient = function () {
  const hemi = useHemi()
  const hemiClient = usePublicClient({ chainId: hemi.id })
  return useMemo(() => publicClientToHemiClient(hemiClient), [hemiClient])
}

const walletClientToHemiClient = (walletClient: WalletClient) =>
  walletClient
    .extend(hemiWalletBitcoinTunnelManagerActions())
    .extend(hemiWalletStakeActions())

export const useHemiWalletClient = function () {
  const hemi = useHemi()
  const { data: hemiWalletClient, ...rest } = useWalletClient({
    chainId: hemi.id,
    query: { select: walletClientToHemiClient },
  })

  return {
    hemiWalletClient,
    ...rest,
  }
}

// I wish there was a better way to infer these types, so it wouldn't depend on the hook
export type HemiPublicClient = ReturnType<typeof useHemiClient>
export type HemiWalletClient = ReturnType<
  typeof useHemiWalletClient
>['hemiWalletClient']

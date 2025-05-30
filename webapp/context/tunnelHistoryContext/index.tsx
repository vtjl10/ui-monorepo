'use client'

import { useHemi } from 'hooks/useHemi'
import { useNetworks } from 'hooks/useNetworks'
import { useSyncHistory } from 'hooks/useSyncHistory'
import {
  SyncStatus,
  type HistoryReducerState,
} from 'hooks/useSyncHistory/types'
import dynamic from 'next/dynamic'
import { createContext, ReactNode } from 'react'
import { type RemoteChain } from 'types/chain'
import {
  type DepositTunnelOperation,
  type WithdrawTunnelOperation,
} from 'types/tunnel'
import { useAccount } from 'wagmi'

const BitcoinDepositsStatusUpdater = dynamic(
  () =>
    import('./bitcoinDepositsStatusUpdater').then(
      mod => mod.BitcoinDepositsStatusUpdater,
    ),
  { ssr: false },
)

const BitcoinWithdrawalsStatusUpdater = dynamic(
  () =>
    import('./bitcoinWithdrawalsStatusUpdater').then(
      mod => mod.BitcoinWithdrawalsStatusUpdater,
    ),
  { ssr: false },
)

const EvmDepositsStatusUpdater = dynamic(
  () =>
    import('./evmDepositsStatusUpdater').then(
      mod => mod.EvmDepositsStatusUpdater,
    ),
  { ssr: false },
)

const SyncHistoryWorker = dynamic(
  () => import('./syncHistoryWorker').then(mod => mod.SyncHistoryWorker),
  { ssr: false },
)

const WithdrawalsStateUpdater = dynamic(
  () =>
    import('./withdrawalsStateUpdater').then(
      mod => mod.WithdrawalsStateUpdater,
    ),
  { ssr: false },
)

const isReadyOrSyncing = (status: SyncStatus | undefined) =>
  !!status && ['ready', 'syncing'].includes(status)

const isChainReadyOrSyncing =
  (history: HistoryReducerState) => (chain: RemoteChain) =>
    isReadyOrSyncing(
      history.deposits.find(d => d.chainId === chain.id)?.status,
    ) ||
    isReadyOrSyncing(
      history.withdrawals.find(d => d.chainId === chain.id)?.status,
    )

type TunnelHistoryContext = {
  addDepositToTunnelHistory: (deposit: DepositTunnelOperation) => void
  addWithdrawalToTunnelHistory: (
    withdrawal: Omit<WithdrawTunnelOperation, 'timestamp'>,
  ) => void
  deposits: DepositTunnelOperation[]
  resyncHistory: () => void
  syncStatus: HistoryReducerState['status']
  updateDeposit: (
    deposit: DepositTunnelOperation,
    updates: Partial<DepositTunnelOperation>,
  ) => void
  updateWithdrawal: (
    withdrawal: WithdrawTunnelOperation,
    updates: Partial<WithdrawTunnelOperation>,
  ) => void
  withdrawals: WithdrawTunnelOperation[]
}

export const TunnelHistoryContext = createContext<TunnelHistoryContext>({
  addDepositToTunnelHistory: () => undefined,
  addWithdrawalToTunnelHistory: () => undefined,
  deposits: [],
  resyncHistory: () => undefined,
  syncStatus: 'idle',
  updateDeposit: () => undefined,
  updateWithdrawal: () => undefined,
  withdrawals: [],
})

type Props = {
  children: ReactNode
}

export const TunnelHistoryProvider = function ({ children }: Props) {
  const { address, isConnected } = useAccount()

  const l2ChainId = useHemi().id
  const { remoteNetworks } = useNetworks()

  const [history, dispatch, context] = useSyncHistory(l2ChainId)

  const historyChainSync = []

  // We need to be ready or syncing to return workers
  if (isConnected && address && ['ready', 'syncing'].includes(history.status)) {
    // Add workers for every pair L1-Hemi chain
    historyChainSync.push(
      ...remoteNetworks
        .filter(isChainReadyOrSyncing(history))
        .map(l1Chain => (
          <SyncHistoryWorker
            address={address}
            dispatch={dispatch}
            history={history}
            key={`${l1Chain.id}_${l2ChainId}_${address}`}
            l1ChainId={l1Chain.id}
            l2ChainId={l2ChainId}
          />
        )),
    )
  }

  return (
    <TunnelHistoryContext.Provider value={context}>
      {/* Track updates on bitcoin deposits, in bitcoin or in Hemi */}
      {<BitcoinDepositsStatusUpdater />}
      {/* Track updates on bitcoin withdrawals, from Hemi to Bitcoin */}
      {<BitcoinWithdrawalsStatusUpdater />}
      {/* Track updates on withdrawals from Hemi */}
      <WithdrawalsStateUpdater />
      {/* Track updates on deposits to Hemi, tracking any missing info */}
      <EvmDepositsStatusUpdater />
      {children}
      {/* Sync the transaction history per chain in the background */}
      {historyChainSync}
    </TunnelHistoryContext.Provider>
  )
}

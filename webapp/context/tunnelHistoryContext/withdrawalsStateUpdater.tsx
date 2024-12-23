import { MessageStatus } from '@eth-optimism/sdk'
import { WithWorker } from 'components/withWorker'
import { useConnectedToUnsupportedEvmChain } from 'hooks/useConnectedToUnsupportedChain'
import { useToEvmWithdrawals } from 'hooks/useToEvmWithdrawals'
import { useTunnelHistory } from 'hooks/useTunnelHistory'
import { hemiMainnet } from 'networks/hemiMainnet'
import { hemiTestnet } from 'networks/hemiTestnet'
import { useEffect } from 'react'
import { ToEvmWithdrawOperation } from 'types/tunnel'
import { hasKeys } from 'utils/utilities'
import { useAccount } from 'wagmi'
import {
  type AppToWorker,
  getUpdateWithdrawalKey,
} from 'workers/watchEvmWithdrawals'

const getSeconds = (seconds: number) => seconds * 1000
const getMinutes = (minutes: number) => getSeconds(minutes * 60)

// use different refetch intervals depending on the status and chain
const refetchInterval = {
  [hemiMainnet.id]: {
    [MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE]: getSeconds(12),
    [MessageStatus.FAILED_L1_TO_L2_MESSAGE]: false,
    [MessageStatus.STATE_ROOT_NOT_PUBLISHED]: getMinutes(1),
    [MessageStatus.READY_TO_PROVE]: getMinutes(1),
    [MessageStatus.IN_CHALLENGE_PERIOD]: getMinutes(3),
    [MessageStatus.READY_FOR_RELAY]: getMinutes(3),
    [MessageStatus.RELAYED]: false,
  },
  [hemiTestnet.id]: {
    [MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE]: getSeconds(12),
    [MessageStatus.FAILED_L1_TO_L2_MESSAGE]: false,
    [MessageStatus.STATE_ROOT_NOT_PUBLISHED]: getMinutes(1),
    [MessageStatus.READY_TO_PROVE]: getMinutes(2),
    [MessageStatus.IN_CHALLENGE_PERIOD]: getMinutes(2),
    [MessageStatus.READY_FOR_RELAY]: getMinutes(2),
    [MessageStatus.RELAYED]: false,
  },
} satisfies { [chainId: number]: { [status: number]: number | false } }

const WatchEvmWithdrawal = function ({
  withdrawal,
  worker,
}: {
  withdrawal: ToEvmWithdrawOperation
  worker: AppToWorker
}) {
  const { updateWithdrawal } = useTunnelHistory()

  useEffect(
    function watchWithdrawalUpdates() {
      // Not using useState as 1. this value is local to the effect and
      // 2. to avoid unsubscribing and resubscribing when the state value changes
      let hasWorkedPostedBack = false
      const saveUpdates = function (
        event: MessageEvent<{
          updates: Partial<ToEvmWithdrawOperation>
          type: string
        }>,
      ) {
        // This is needed because this component is rendered per-withdrawal, so each component will receive the posted message
        // for every withdrawal, as there are many withdrawals but only one worker.
        // Of all components, this "if" clause below will be true for only one rendered component - the one belonging to the withdrawal
        const { type, updates } = event.data
        if (type !== getUpdateWithdrawalKey(withdrawal)) {
          return
        }
        // next interval will poll again
        hasWorkedPostedBack = true
        if (hasKeys(updates)) {
          updateWithdrawal(withdrawal, updates)
        }
      }

      worker.addEventListener('message', saveUpdates)

      const interval = refetchInterval[withdrawal.l2ChainId][withdrawal.status]

      let intervalId
      // skip polling for disabled states (those whose interval is "false")
      if (typeof interval === 'number') {
        worker.postMessage({
          type: 'watch-withdrawal',
          withdrawal,
        })
        intervalId = setInterval(function () {
          if (!hasWorkedPostedBack) {
            return
          }
          worker.postMessage({
            type: 'watch-withdrawal',
            withdrawal,
          })
          // Block posting until a response is received
          hasWorkedPostedBack = false
        }, interval)
      }

      return function cleanup() {
        worker.removeEventListener('message', saveUpdates)
        if (intervalId) {
          clearInterval(intervalId)
        }
      }
    },
    [updateWithdrawal, withdrawal, worker],
  )

  return null
}

// See https://github.com/vercel/next.js/issues/31009#issuecomment-11463441611
// and https://github.com/vercel/next.js/issues/31009#issuecomment-1338645354
const getWorker = () =>
  new Worker(new URL('../../workers/watchEvmWithdrawals.ts', import.meta.url))

export const WithdrawalsStateUpdater = function () {
  const { isConnected } = useAccount()

  const withdrawals = useToEvmWithdrawals()

  const unsupportedChain = useConnectedToUnsupportedEvmChain()

  if (!isConnected || unsupportedChain) {
    return null
  }

  const withdrawalsToWatch = withdrawals.filter(
    w =>
      !w.timestamp ||
      w.status === undefined ||
      [
        MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE,
        MessageStatus.STATE_ROOT_NOT_PUBLISHED,
        MessageStatus.READY_TO_PROVE,
        MessageStatus.IN_CHALLENGE_PERIOD,
        MessageStatus.READY_FOR_RELAY,
      ].includes(w.status),
  )

  return (
    <WithWorker getWorker={getWorker}>
      {(worker: AppToWorker) => (
        // once the only worker is loaded, render these components that will post to the worker
        // the withdrawals to watch on intervals
        <>
          {withdrawalsToWatch.map(w => (
            <WatchEvmWithdrawal
              key={w.transactionHash}
              withdrawal={w}
              worker={worker}
            />
          ))}
        </>
      )}
    </WithWorker>
  )
}

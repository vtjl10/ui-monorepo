import { hemiTestnet } from 'networks/hemiTestnet'
import {
  type DepositTunnelOperation,
  type WithdrawTunnelOperation,
} from 'types/tunnel'

import { type HistoryActions, type HistoryReducerState } from './types'
import {
  addOperation,
  getSyncStatus,
  syncContent,
  updateChainSyncStatus,
  updateOperation,
} from './utils'

// the _:never is used to fail compilation if a case is missing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const compilationError = function (_: never): never {
  throw new Error('Missing implementation of action in reducer')
}

export const initialState: HistoryReducerState = {
  deposits: [],
  status: 'idle',
  withdrawals: [],
}

export const historyReducer = function (
  state: HistoryReducerState,
  action: HistoryActions,
): HistoryReducerState {
  const getNewState = function (): Omit<HistoryReducerState, 'status'> {
    const { type } = action
    switch (type) {
      case 'add-deposit': {
        const { payload: newDeposit } = action
        const deposits = addOperation(state.deposits, newDeposit)

        return {
          ...state,
          deposits,
        }
      }
      case 'add-withdraw': {
        const { payload: newWithdrawal } = action
        const withdrawals = addOperation(state.withdrawals, newWithdrawal)
        return {
          ...state,
          withdrawals,
        }
      }
      case 'reset':
        return { ...initialState }
      case 'restore': {
        const { payload } = action
        return {
          ...state,
          deposits: payload.deposits.map(chainDeposits => ({
            ...chainDeposits,
            // See https://github.com/hemilabs/ui-monorepo/issues/376
            content: chainDeposits.content.map(
              deposit =>
                ({
                  ...deposit,
                  l1ChainId: deposit.l1ChainId,
                  l2ChainId: deposit.l2ChainId ?? hemiTestnet.id,
                }) as DepositTunnelOperation,
            ),
            status: 'ready',
          })),
          withdrawals: payload.withdrawals.map(chainWithdrawals => ({
            ...chainWithdrawals,
            // See https://github.com/hemilabs/ui-monorepo/issues/376
            content: chainWithdrawals.content.map(
              withdrawal =>
                ({
                  ...withdrawal,
                  l1ChainId: withdrawal.l1ChainId,
                  l2ChainId: withdrawal.l2ChainId ?? hemiTestnet.id,
                }) as WithdrawTunnelOperation,
            ),
            status: 'ready',
          })),
        }
      }
      case 'sync': {
        const { chainId } = action.payload
        return updateChainSyncStatus(state, chainId, 'syncing')
      }
      case 'sync-deposits': {
        const { chainId } = action.payload
        const deposits = state.deposits.map(currentDeposits =>
          currentDeposits.chainId === chainId
            ? syncContent(currentDeposits, action.payload)
            : currentDeposits,
        )

        return {
          ...state,
          deposits,
        }
      }
      case 'sync-finished': {
        const { chainId } = action.payload
        return updateChainSyncStatus(state, chainId, 'finished')
      }
      case 'sync-withdrawals': {
        const { chainId } = action.payload
        const withdrawals = state.withdrawals.map(chainWithdrawals =>
          chainWithdrawals.chainId === chainId
            ? syncContent(chainWithdrawals, action.payload)
            : chainWithdrawals,
        )
        return {
          ...state,
          withdrawals,
        }
      }
      case 'update-deposit': {
        const { deposit, updates } = action.payload
        const deposits = updateOperation(state.deposits, {
          operation: deposit,
          updates,
        })

        return {
          ...state,
          deposits,
        }
      }
      case 'update-withdraw': {
        const { withdraw, updates } = action.payload
        const withdrawals = updateOperation(state.withdrawals, {
          operation: withdraw,
          updates,
        })

        return {
          ...state,
          withdrawals,
        }
      }
      default:
        // if a switch statement is missing on all possible actions
        // this will fail on compile time
        return compilationError(type)
    }
  }

  const newState = getNewState()
  return {
    ...newState,
    status: getSyncStatus(newState),
  }
}

import * as Sentry from '@sentry/nextjs'

const enabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN

const unsupportedWalletErrors = [
  '@polkadot/keyring requires direct dependencies',
  "Backpack couldn't override `window.ethereum`.",
  // Nightly wallet
  'Cannot set property ethereum of #<Window> which has only a getter',
  'shouldSetPelagusForCurrentProvider is not a function',
  'shouldSetTallyForCurrentProvider is not a function',
  'Talisman extension has not been configured yet',
]

const walletConnectErrors = [
  "No matching key. session topic doesn't exist",
  // See https://github.com/hemilabs/ui-monorepo/issues/1081
  'this.provider.disconnect is not a function',
]

function enableSentry() {
  const ignoreErrors = [
    // Nextjs errors when pre-fetching is aborted due to user navigation.
    // See https://github.com/vercel/next.js/pull/73975 and https://github.com/vercel/next.js/pull/73985
    // should not happen anymore after Next 15.3
    'Falling back to browser navigation',
    // user rejected a confirmation in the wallet
    'rejected the request',
    // React internal error thrown when something outside react modifies the DOM
    // This is usually because of a browser extension or Chrome's built-in translate. There's no action to do.
    // See https://blog.sentry.io/making-your-javascript-projects-less-noisy/#ignore-un-actionable-errors
    'The node to be removed is not a child of this node.',
    'The node before which the new node is to be inserted is not a child of this node.',
    // Thrown when firefox prevents an add-on from referencing a DOM element that has been removed.
    `TypeError: can't access dead object`,
    ...unsupportedWalletErrors,
    ...walletConnectErrors,
  ]

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled,
    ignoreErrors,
    integrations: [
      // See https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/captureconsole/
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
      // See https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/extraerrordata/
      Sentry.extraErrorDataIntegration(),
      // See https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/httpclient/
      Sentry.httpClientIntegration(),
      // This overrides the default implementation of the RewriteFrames
      // integration from sentry/nextjs. It adds the decodeURI() to fix a mismatch
      // of sourceMaps in reported issues.
      // ref: https://github.com/getsentry/sentry/issues/19713#issuecomment-696614341
      Sentry.rewriteFramesIntegration({
        iteratee(frame) {
          const { origin } = new URL(frame.filename)
          frame.filename = decodeURI(frame.filename.replace(origin, 'app://'))
          return frame
        },
      }),
      // See https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/filtering/#using-thirdpartyerrorfilterintegration
      Sentry.thirdPartyErrorFilterIntegration({
        // Should skip all errors that are entirely made of third party frames in the stack trace.
        // Let's start with this, we can make it more strict if needed.
        behaviour: 'drop-error-if-exclusively-contains-third-party-frames',
        filterKeys: [process.env.NEXT_PUBLIC_SENTRY_FILTER_KEY_ID],
      }),
    ],
    tracesSampleRate:
      process.env.NEXT_PUBLIC_TRACES_SAMPLE_RATE &&
      !Number.isNaN(process.env.NEXT_PUBLIC_TRACES_SAMPLE_RATE)
        ? Number(process.env.NEXT_PUBLIC_TRACES_SAMPLE_RATE)
        : undefined,
  })
}

if (enabled) {
  enableSentry()
}

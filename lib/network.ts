import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

// Connectivity state cached from a single long-lived NetInfo subscription.
//
// `NetInfo.fetch()` forces an active reachability probe (a real network round
// trip) every time it is called. The quiz flow used to do this 5+ times per
// screen interaction, adding hundreds of ms of latency. Instead we keep one
// subscription that pushes state updates into `cachedState` and read it
// synchronously via `isOnline()`.

let cachedState: NetInfoState | null = null;
let unsubscribe: (() => void) | null = null;

export function startNetworkMonitor(): void {
  if (unsubscribe) return; // already monitoring

  // Subscribe for live updates...
  unsubscribe = NetInfo.addEventListener((state) => {
    cachedState = state;
  });

  // ...and prime the cache immediately so the very first read is accurate.
  NetInfo.fetch()
    .then((state) => {
      cachedState = state;
    })
    .catch(() => {
      // Ignore — `isOnline()` falls back to optimistic "online".
    });
}

export function stopNetworkMonitor(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    cachedState = null;
  }
}

/**
 * Synchronous connectivity check backed by the NetInfo subscription.
 *
 * Defaults to optimistic "online" until the first state arrives — every caller
 * already falls back to the local cache when a network request fails, so an
 * optimistic guess is safe and only costs a single failed request at worst.
 */
export function isOnline(): boolean {
  if (!cachedState) return true;
  return !!cachedState.isConnected && cachedState.isInternetReachable !== false;
}

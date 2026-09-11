const SESSION_WALLET_KEY =
  "agrichain_authenticated_wallet";


export function setAuthenticatedWallet(
  address
) {
  sessionStorage.setItem(
    SESSION_WALLET_KEY,
    address.toLowerCase()
  );
}


export function getAuthenticatedWallet() {
  return sessionStorage.getItem(
    SESSION_WALLET_KEY
  );
}


export function clearAuthenticatedWallet() {
  sessionStorage.removeItem(
    SESSION_WALLET_KEY
  );
}


export function isAuthenticatedWallet(
  address
) {
  if (!address) {
    return false;
  }

  const stored =
    getAuthenticatedWallet();

  return (
    stored ===
    address.toLowerCase()
  );
}
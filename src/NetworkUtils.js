export const isLocalNetwork = function (hostname = window.location.hostname) {
  return (
    ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.0.") ||
    hostname.endsWith(".local")
  );
};

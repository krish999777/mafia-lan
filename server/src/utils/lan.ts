import os from 'os';

/**
 * Discovers the preferred local IPv4 network address of this machine.
 * Ignores loopback and non-IPv4 addresses.
 */
export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;

    for (const net of netList) {
      // Skip internal (127.0.0.1) and non-IPv4
      if (!net.internal && net.family === 'IPv4') {
        // Prioritize standard local network ranges
        if (
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(net.address)
        ) {
          return net.address;
        }
        candidates.push(net.address);
      }
    }
  }

  return candidates[0] || 'localhost';
}

function isPrivateIp(ip: string) {
  if (!ip || ip === "—") return true;
  if (ip === "::1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

async function lookupOne(ip: string): Promise<string> {
  if (isPrivateIp(ip)) return "Local network";

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return ip;
    const data = (await res.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
    };
    if (!data.success) return ip;

    const parts = [data.city, data.region, data.country].filter(Boolean);
    if (!parts.length) return ip;
    return `${parts.join(", ")} · ${ip}`;
  } catch {
    return ip;
  }
}

/** Resolve many IPs to "City, Region, Country · IP" labels (deduped). */
export async function enrichIpLocations(ips: string[]) {
  const unique = [...new Set(ips.filter((ip) => ip && ip !== "—"))];
  const map = new Map<string, string>();

  await Promise.all(
    unique.map(async (ip) => {
      map.set(ip, await lookupOne(ip));
    })
  );

  return map;
}

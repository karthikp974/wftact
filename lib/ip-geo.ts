function isPrivateIp(ip: string) {
  if (!ip || ip === "—") return true;
  if (ip === "::1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

function metaNum(meta: Record<string, unknown> | null | undefined, key: string) {
  const v = meta?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: { "User-Agent": "wftact-hub/1.0 (contact@workflowtech.info)" },
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
      display_name?: string;
    };
    const a = data.address;
    if (a) {
      const city = a.city ?? a.town ?? a.village;
      const parts = [city, a.state, a.country].filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
    return data.display_name?.split(",").slice(0, 3).join(", ").trim() ?? null;
  } catch {
    return null;
  }
}

export type LocationInput = {
  ip: string;
  latitude: number | null;
  longitude: number | null;
};

export type LocationLabel = {
  location: string;
  ip: string;
};

async function resolveOne(input: LocationInput): Promise<LocationLabel> {
  const ip = input.ip && input.ip !== "—" ? input.ip : "—";

  if (input.latitude != null && input.longitude != null) {
    const name = await reverseGeocode(input.latitude, input.longitude);
    if (name) return { location: name, ip };
    return {
      location: `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`,
      ip
    };
  }

  if (ip !== "—" && !isPrivateIp(ip)) {
    return { location: "Location not shared", ip };
  }

  return { location: "Location not shared", ip: "—" };
}

function locationKey(input: LocationInput) {
  if (input.latitude != null && input.longitude != null) {
    return `geo:${input.latitude.toFixed(5)}:${input.longitude.toFixed(5)}`;
  }
  return `ip:${input.ip}`;
}

/** Turn device GPS (preferred) into city/country labels for the dashboard. */
export async function enrichSessionLocations(inputs: LocationInput[]) {
  const unique = new Map<string, LocationInput>();
  for (const input of inputs) {
    unique.set(locationKey(input), input);
  }

  const map = new Map<string, LocationLabel>();
  for (const [key, input] of unique) {
    map.set(key, await resolveOne(input));
  }

  return (input: LocationInput) => map.get(locationKey(input)) ?? { location: "Location not shared", ip: input.ip };
}

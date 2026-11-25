// Logging in to the demo household over plain HTTP, the way kop.it's forms do it.
import { DEMO } from "./kopit";

export type Cookies = Record<string, string>;

function take(res: Response, jar: Cookies) {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
}

const header = (jar: Cookies) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

export async function post(base: string, path: string, form: Record<string, string>, jar: Cookies) {
  const res = await fetch(base + path, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: header(jar), origin: base },
    body: new URLSearchParams(form),
  });
  take(res, jar);
  if (res.status >= 400) throw new Error(`POST ${path}: ${res.status} ${await res.text()}`);
  return res;
}

export async function get(base: string, path: string, jar: Cookies) {
  const res = await fetch(base + path, { redirect: "manual", headers: { cookie: header(jar) } });
  take(res, jar);
  return res;
}

/** A logged-in jar for the demo household, as `person`. */
export async function login(base: string, person: string, profileId: number): Promise<Cookies> {
  const jar: Cookies = {};
  await post(base, "/login", { username: DEMO.username, pin: DEMO.pin }, jar);
  if (!jar.kopit_session) throw new Error("login failed: no session cookie");
  await post(base, "/profile", { profileId: String(profileId) }, jar);
  if (!jar.kopit_profile) throw new Error(`picking ${person} failed`);
  return jar;
}

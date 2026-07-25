/**
 * MVP shortcut: our subname naming convention pins <label>.chaish.eth to the
 * matching <label>.chai.sh atproto handle (see functions/api/create-account.ts).
 * We can therefore map an .chaish.eth handle back to something atproto can
 * resolve without any onchain lookup.
 *
 * Replace this with real ENS resolution (plan §3.1: atproto-identity resolver
 * against UniversalResolverV2) once that lands.
 */
export function toResolvableHandle(handle: string): string {
  if (handle.endsWith('.chaish.eth')) {
    return handle.slice(0, -'.chaish.eth'.length) + '.chai.sh'
  }
  return handle
}

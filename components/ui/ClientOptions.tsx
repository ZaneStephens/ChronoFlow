import React from "react";
import { Client } from "../../types";

/** Shared ordering for every client selector. Legacy clients remain selectable. */
export default function ClientOptions({ clients }: { clients: Client[] }) {
  const sorted = [...clients].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }),
  );
  const managers = new Map<string, { label: string; clients: Client[] }>();
  const internal: Client[] = [];
  const unassigned: Client[] = [];
  for (const client of sorted) {
    const manager = client.accountManager?.trim();
    if (client.isInternal) internal.push(client);
    else if (!manager) unassigned.push(client);
    else {
      const key = manager.toLocaleLowerCase("en");
      const group = managers.get(key) || { label: manager, clients: [] };
      group.clients.push(client);
      managers.set(key, group);
    }
  }
  const groups = [
    ...(internal.length
      ? [{ label: "Internal", clients: internal, key: "internal" }]
      : []),
    ...[...managers.entries()]
      .sort(([, a], [, b]) =>
        b.label.localeCompare(a.label, "en", {
          sensitivity: "base",
          numeric: true,
        }),
      )
      .map(([key, group]) => ({ ...group, key: `manager:${key}` })),
    ...(unassigned.length
      ? [{ label: "Unassigned", clients: unassigned, key: "unassigned" }]
      : []),
  ];
  return (
    <>
      {groups.map((group) => (
        <optgroup key={group.key} label={group.label}>
          {group.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

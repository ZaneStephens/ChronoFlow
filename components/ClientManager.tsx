import React, { useState } from "react";
import { Client } from "../types";
import {
  Plus,
  Search,
  Mail,
  UserRound,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import Dialog from "./ui/Dialog";
interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, "id">) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}
export default function ClientManager({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientManagerProps) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#62835c");
  const [accountManager, setAccountManager] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [services, setServices] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const open = (client?: Client) => {
    setEditing(client || null);
    setName(client?.name || "");
    setColor(client?.color || "#62835c");
    setAccountManager(client?.accountManager || "");
    setContactName(client?.contactName || "");
    setContactEmail(client?.contactEmail || "");
    setServices(client?.services || "");
    setIsInternal(client?.isInternal || false);
    setFormOpen(true);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const values = {
      name: name.trim(),
      color,
      accountManager: accountManager.trim() || undefined,
      contactName,
      contactEmail,
      services,
      isInternal,
    };
    if (editing) onUpdateClient({ ...editing, ...values });
    else onAddClient(values);
    setFormOpen(false);
  };
  const filtered = [...clients]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((c) =>
      `${c.name} ${c.accountManager || ""} ${c.contactName || ""} ${c.services || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <div id="client-manager" className="workspace-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE PEOPLE BEHIND THE WORK</p>
          <h1>Great work. Good relationships.</h1>
          <p>Keep the right people and the details that matter close by.</p>
        </div>
        <button className="button primary" onClick={() => open()}>
          <Plus size={17} /> New client
        </button>
      </div>
      <div className="client-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search clients"
            placeholder="Find a client, contact or service…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="client-summary">
          {clients.filter((c) => !c.isInternal).length} clients ·{" "}
          {clients.filter((c) => c.isInternal).length} internal
        </span>
      </div>
      <div className="client-grid">
        {filtered.map((client) => (
          <article className="client-card" key={client.id}>
            <div className="client-card-heading">
              <span
                className="client-monogram"
                style={{ borderColor: client.color }}
              >
                {client.name.slice(0, 2).toUpperCase()}
              </span>
              <button
                className="icon-button subtle"
                aria-label={`Edit ${client.name}`}
                onClick={() => open(client)}
              >
                <Pencil size={16} />
              </button>
            </div>
            <h2>{client.name}</h2>
            <span className="status-pill">
              {client.isInternal ? "Internal team" : "Client workspace"}
            </span>
            {!client.isInternal && (
              <p className="client-contact">
                Account manager: {client.accountManager || "Unassigned"}
              </p>
            )}
            <p className="client-contact">
              <UserRound size={14} />
              {client.contactName || "No contact added yet"}
            </p>
            {client.contactEmail && (
              <a
                className="client-contact"
                href={`mailto:${client.contactEmail}`}
              >
                <Mail size={14} />
                {client.contactEmail}
              </a>
            )}
            <p className="client-services">
              {client.services ||
                "Add services or agreement details to keep them handy."}
            </p>
            <div className="client-actions">
              <button className="text-button" onClick={() => open(client)}>
                Manage details
              </button>
              <button
                className="icon-button subtle"
                aria-label={`Delete ${client.name}`}
                onClick={() => setDeleting(client)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <Users size={30} />
          <h3>
            {query ? "No clients found." : "It starts with a connection."}
          </h3>
          <p>
            {query
              ? "Try a different name or service."
              : "Add a client or your internal team to organise your work."}
          </p>
          {!query && (
            <button className="button primary" onClick={() => open()}>
              Add your first client
            </button>
          )}
        </div>
      )}
      {formOpen && (
        <Dialog
          title={
            editing ? "Keep the details current." : "Who are we working with?"
          }
          onClose={() => setFormOpen(false)}
        >
          <p className="dialog-description">
            Start with a name. Contacts and services can come later.
          </p>
          <form className="workspace-form" onSubmit={submit}>
            <div className="form-columns">
              <label>
                Client name
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Northside Studio"
                />
              </label>
              <label>
                Client colour
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ height: 40, padding: 4 }}
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />{" "}
              This is an internal team
            </label>
            {!isInternal && (
              <label>
                Account manager (optional)
                <input
                  value={accountManager}
                  onChange={(e) => setAccountManager(e.target.value)}
                  placeholder="e.g. Zane"
                />
              </label>
            )}
            <div className="form-columns">
              <label>
                Contact name
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                Contact email
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
            <label>
              Services & agreement notes
              <textarea
                rows={4}
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Managed services, contact preferences, useful context…"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={!name.trim()}
              >
                {editing ? "Save details" : "Add client"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog title="Remove this client?" onClose={() => setDeleting(null)}>
          <p className="dialog-description">
            “{deleting.name}” will be removed from your portfolio. Tasks and
            time entries will remain, but will no longer show this client’s
            details.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep client
            </button>
            <button
              className="button destructive"
              onClick={() => {
                onDeleteClient(deleting.id);
                setDeleting(null);
              }}
            >
              Remove client
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

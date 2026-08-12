"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Hint } from "./studio-hint";
import { useStudioNotes } from "../lib/use-studio-notes";

type NotesVariant = "inline" | "drawer";
type NotesView = "notes" | "board";

function relativeTime(value: string | null) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SaveState({ state, at }: { state?: "idle" | "saving" | "saved" | "error"; at: string | null }) {
  if (state === "saving") return <span className="studio-notes-save is-saving">Saving…</span>;
  if (state === "error") return <span className="studio-notes-save is-error">Couldn’t save</span>;
  if (state === "saved") return <span className="studio-notes-save is-saved">Saved · {relativeTime(at)}</span>;
  return null;
}

export default function StudioNotes({ variant }: { variant: NotesVariant }) {
  const notes = useStudioNotes(true);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<NotesView>("notes");
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [boardDraft, setBoardDraft] = useState("");
  const [relativeTick, setRelativeTick] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    setOpen(window.localStorage.getItem("studio.notesOpen") === "true");
    setView(window.localStorage.getItem("studio.notesView") === "board" ? "board" : "notes");
  }, []);

  useEffect(() => {
    if (!notes.activeNote || editingTitle) return;
    setDraftTitle(notes.activeNote.title);
  }, [editingTitle, notes.activeNote]);

  useEffect(() => {
    if (!notes.activeNote || notes.saveStates[notes.activeNote.id]?.state !== "saved") return;
    const timer = window.setInterval(() => setRelativeTick((current) => current + 1), 30000);
    return () => window.clearInterval(timer);
  }, [notes.activeNote, notes.saveStates]);

  useEffect(() => {
    if (variant !== "drawer" || !open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 320);
    return () => window.clearTimeout(timer);
  }, [open, variant, view]);

  useEffect(() => {
    if (variant !== "drawer" || !open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !tabRef.current?.contains(target)) {
        setOpen(false);
        window.localStorage.setItem("studio.notesOpen", "false");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.localStorage.setItem("studio.notesOpen", "false");
        tabRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, variant]);

  if (!mounted && variant === "drawer") return null;

  const active = notes.activeNote;
  const saveState = active ? notes.saveStates[active.id] : undefined;
  const setDrawerOpen = (next: boolean) => {
    setOpen(next);
    window.localStorage.setItem("studio.notesOpen", String(next));
  };
  const selectView = (next: NotesView) => {
    setView(next);
    window.localStorage.setItem("studio.notesView", next);
  };
  const beginRename = () => {
    if (!active) return;
    setDraftTitle(active.title);
    setEditingTitle(true);
  };
  const commitRename = () => {
    if (!active) return;
    const title = draftTitle.trim().slice(0, 120) || "Untitled";
    notes.updateNote(active.id, { title });
    setDraftTitle(title);
    setEditingTitle(false);
  };
  const submitBoardPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await notes.addBoardPost(boardDraft)) setBoardDraft("");
  };

  const content = (
    <section className={`studio-notes ${variant === "drawer" ? "studio-notes-drawer" : "studio-notes-inline"}`} aria-label="Studio notes">
      <div className="studio-notes-heading">
        <div>
          <p className="studio-notes-kicker">Private workspace</p>
          <h2>Studio notes</h2>
        </div>
        <SaveState state={saveState?.state} at={saveState?.at ?? null} />
      </div>
      <div className="studio-notes-tabs" role="tablist" aria-label="Studio note pages">
        {notes.notes.map((note) => (
          <button className={`studio-notes-tab ${view === "notes" && note.id === active?.id ? "is-active" : ""}`} key={note.id} onClick={() => { selectView("notes"); notes.chooseNote(note.id); }} role="tab" aria-selected={view === "notes" && note.id === active?.id} type="button">
            {note.title || "Untitled"}
          </button>
        ))}
        <Hint id="notesAdd"><button aria-label="Add notes page" className="studio-notes-icon" onClick={() => void notes.addNote()} type="button">＋</button></Hint>
        <Hint id="notesBoardToggle"><button className={`studio-notes-tab studio-notes-board-tab ${view === "board" ? "is-active" : ""}`} onClick={() => selectView("board")} role="tab" aria-selected={view === "board"} type="button">Team board</button></Hint>
      </div>
      {notes.error && <p className="studio-notes-error" role="alert">{notes.error}</p>}
      {notes.loading ? <div className="studio-notes-loading" aria-label="Loading notes"><span /></div> : view === "board" ? (
        <div className="studio-board" role="tabpanel">
          {!notes.hasTeam ? <div className="studio-board-empty"><span className="studio-notes-mark">✦</span><h3>A board for the whole studio</h3><p>Invite a teammate and this shared space will be ready for ideas, handoffs, and gentle reminders.</p></div> : <>
            <div className="studio-board-feed">
              {notes.boardPosts.length === 0 ? <p className="studio-board-muted">Nothing posted yet. Start the conversation.</p> : notes.boardPosts.map((post) => <article className="studio-board-post" key={post.id}><div><p>{post.body}</p><small>Studio member · {new Date(post.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</small></div><Hint id="notesBoardDelete"><button aria-label="Delete team-board note" className="studio-notes-icon is-danger" onClick={() => void notes.deleteBoardPost(post.id)} type="button">×</button></Hint></article>)}
            </div>
            <form className="studio-board-composer" onSubmit={submitBoardPost}><label htmlFor={`studio-board-${variant}`}>Share with the team<textarea id={`studio-board-${variant}`} maxLength={5000} onChange={(event) => setBoardDraft(event.target.value)} placeholder="A note for the studio…" rows={3} value={boardDraft} /></label><button className="studio-notes-submit" disabled={!boardDraft.trim()} type="submit">Post to board</button></form>
          </>}
        </div>
      ) : active ? (
        <div className="studio-notes-editor" role="tabpanel">
          <div className="studio-notes-page-heading">
            {editingTitle ? <input aria-label="Note page title" autoFocus maxLength={120} onBlur={commitRename} onChange={(event) => setDraftTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitRename(); } if (event.key === "Escape") { setEditingTitle(false); setDraftTitle(active.title); } }} value={draftTitle} /> : <h3>{active.title || "Untitled"}</h3>}
            <div className="studio-notes-page-actions">
              <Hint id="notesRename"><button aria-label="Rename notes page" className="studio-notes-icon" onClick={beginRename} type="button">✎</button></Hint>
              <Hint id="notesDelete"><button aria-label="Delete notes page" className="studio-notes-icon is-danger" disabled={notes.notes.length <= 1} onClick={() => void notes.deleteNote(active.id)} type="button">×</button></Hint>
            </div>
          </div>
          <textarea ref={textareaRef} aria-label={`${active.title || "Untitled"} note`} className="studio-notes-textarea" maxLength={50000} onChange={(event) => notes.updateNote(active.id, { body: event.target.value })} placeholder="Let the thoughts arrive…" value={active.body} />
          <div className="studio-notes-footer"><span>{active.body.length.toLocaleString()} / 50,000</span><span className="studio-notes-relative">{relativeTick >= 0 && saveState?.state === "saved" ? `Last saved ${relativeTime(saveState.at)}` : ""}</span></div>
        </div>
      ) : null}
    </section>
  );

  if (variant === "inline") return content;
  return createPortal(<div className={`studio-notes-drawer-layer ${open ? "is-open" : ""}`}>
    <button ref={tabRef} aria-controls="studio-notes-drawer-panel" aria-expanded={open} aria-label={open ? "Close Studio notes" : "Open Studio notes"} className="studio-notes-drawer-tab" onClick={() => setDrawerOpen(!open)} type="button">Notes</button>
    <aside id="studio-notes-drawer-panel" ref={panelRef} aria-hidden={!open} className="studio-notes-drawer-panel">{content}</aside>
  </div>, document.body);
}

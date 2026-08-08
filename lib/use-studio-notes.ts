"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioBoardPost, StudioNote } from "./supabase/types";
import { createClient } from "./supabase/client";

export type NoteSaveState = "idle" | "saving" | "saved" | "error";

const TITLE_LIMIT = 120;
const BODY_LIMIT = 50000;
const SAVE_DELAY = 600;

export function useStudioNotes(enabled = true) {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<StudioNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, { state: NoteSaveState; at: string | null }>>({});
  const [boardPosts, setBoardPosts] = useState<StudioBoardPost[]>([]);
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const notesRef = useRef<StudioNote[]>([]);
  const saveTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const loadBoard = useCallback(async () => {
    if (!supabase || !hasTeam) return;
    const { data, error: boardError } = await supabase
      .from("studio_board")
      .select("*")
      .order("created_at", { ascending: false });
    if (!boardError) setBoardPosts((data ?? []) as StudioBoardPost[]);
  }, [hasTeam, supabase]);

  useEffect(() => {
    if (!enabled || !supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) {
        if (!cancelled) { setError("Sign in to use Studio notes."); setLoading(false); }
        return;
      }
      userIdRef.current = authData.user.id;

      const [{ data: noteRows, error: notesError }, { count: memberCount }] = await Promise.all([
        client.from("studio_notes").select("*").order("position", { ascending: true }),
        client.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      if (notesError) {
        setError("Notes could not be loaded.");
        setLoading(false);
        return;
      }

      let loadedNotes = (noteRows ?? []) as StudioNote[];
      if (loadedNotes.length === 0) {
        const { data: created, error: createError } = await client
          .from("studio_notes")
          .insert({ user_id: authData.user.id, title: "Notes", body: "", position: 0 })
          .select("*")
          .single();
        if (createError || !created) {
          setError("Your first note could not be created.");
          setLoading(false);
          return;
        }
        loadedNotes = [created as StudioNote];
      }

      const rememberedId = window.localStorage.getItem("studio.notesActiveId");
      const nextActive = loadedNotes.some((note) => note.id === rememberedId) ? rememberedId : loadedNotes[0].id;
      setNotes(loadedNotes);
      setActiveId(nextActive);
      setHasTeam((memberCount ?? 1) > 1);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [enabled, supabase]);

  useEffect(() => {
    if (enabled && hasTeam) void loadBoard();
  }, [enabled, hasTeam, loadBoard]);

  useEffect(() => () => {
    Object.values(saveTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const chooseNote = useCallback((id: string) => {
    setActiveId(id);
    window.localStorage.setItem("studio.notesActiveId", id);
  }, []);

  const saveNote = useCallback((note: StudioNote) => {
    if (!supabase || !userIdRef.current) return;
    const id = note.id;
    if (saveTimers.current[id]) window.clearTimeout(saveTimers.current[id]);
    setSaveStates((current) => ({ ...current, [id]: { state: "saving", at: current[id]?.at ?? note.updated_at } }));
    saveTimers.current[id] = window.setTimeout(async () => {
      const { data, error: saveError } = await supabase
        .from("studio_notes")
        .upsert({
          id: note.id,
          user_id: userIdRef.current as string,
          title: note.title.slice(0, TITLE_LIMIT) || "Untitled",
          body: note.body.slice(0, BODY_LIMIT),
          position: note.position,
        }, { onConflict: "id" })
        .select("*")
        .single();
      if (saveError || !data) {
        setSaveStates((current) => ({ ...current, [id]: { state: "error", at: current[id]?.at ?? null } }));
        return;
      }
      const saved = data as StudioNote;
      setNotes((current) => current.map((item) => item.id === id ? saved : item));
      setSaveStates((current) => ({ ...current, [id]: { state: "saved", at: saved.updated_at } }));
      delete saveTimers.current[id];
    }, SAVE_DELAY);
  }, [supabase]);

  const updateNote = useCallback((id: string, patch: Partial<Pick<StudioNote, "title" | "body">>) => {
    const current = notesRef.current.find((note) => note.id === id);
    if (!current) return;
    const changed: StudioNote = {
      ...current,
      title: patch.title === undefined ? current.title : patch.title.slice(0, TITLE_LIMIT),
      body: patch.body === undefined ? current.body : patch.body.slice(0, BODY_LIMIT),
    };
    setNotes((items) => items.map((note) => note.id === id ? changed : note));
    saveNote(changed);
  }, [saveNote]);

  const addNote = useCallback(async () => {
    if (!supabase || !userIdRef.current) return;
    const position = notesRef.current.reduce((max, note) => Math.max(max, note.position), -1) + 1;
    const { data, error: insertError } = await supabase
      .from("studio_notes")
      .insert({ user_id: userIdRef.current, title: "Untitled", body: "", position })
      .select("*")
      .single();
    if (insertError || !data) {
      setError("Could not add a notes page.");
      return;
    }
    const note = data as StudioNote;
    setNotes((current) => [...current, note]);
    chooseNote(note.id);
  }, [chooseNote, supabase]);

  const deleteNote = useCallback(async (id: string) => {
    if (!supabase || notesRef.current.length <= 1) return;
    if (!window.confirm("Delete this notes page?")) return;
    if (saveTimers.current[id]) window.clearTimeout(saveTimers.current[id]);
    const { error: deleteError } = await supabase.from("studio_notes").delete().eq("id", id);
    if (deleteError) {
      setError("Could not delete that notes page.");
      return;
    }
    const remaining = notesRef.current.filter((note) => note.id !== id);
    setNotes(remaining);
    if (activeId === id) chooseNote(remaining[0].id);
  }, [activeId, chooseNote, supabase]);

  const addBoardPost = useCallback(async (body: string) => {
    if (!supabase || !userIdRef.current || !hasTeam) return false;
    const cleanBody = body.trim().slice(0, 5000);
    if (!cleanBody) return false;
    const { data, error: insertError } = await supabase
      .from("studio_board")
      .insert({ author_id: userIdRef.current, body: cleanBody })
      .select("*")
      .single();
    if (insertError || !data) {
      setError("Could not post to the team board.");
      return false;
    }
    setBoardPosts((current) => [data as StudioBoardPost, ...current]);
    return true;
  }, [hasTeam, supabase]);

  return {
    notes,
    activeId,
    activeNote: notes.find((note) => note.id === activeId) ?? notes[0] ?? null,
    chooseNote,
    updateNote,
    addNote,
    deleteNote,
    saveStates,
    boardPosts,
    hasTeam,
    addBoardPost,
    loading,
    error,
  };
}

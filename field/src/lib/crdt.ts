// field/src/lib/crdt.ts
// Yjs CRDT provider for GeoCollect Field.
// - Offline: persists doc state to IndexedDB via y-indexeddb
// - Online:  syncs via WebSocket (y-websocket) to the API ws-server
//
// Usage:
//   const { doc, awareness, connect, disconnect } = useYjsRoom(projectId);

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider }    from "y-websocket";
import { getAuth }              from "./db";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

/** Per-room Yjs state. One room = one project feature layer. */
export interface YjsRoom {
  doc:          Y.Doc;
  features:     Y.Map<Y.Map<unknown>>;  // featureId → attribute map
  idbProvider:  IndexeddbPersistence;
  wsProvider:   WebsocketProvider | null;
  connect:      () => Promise<void>;
  disconnect:   () => void;
}

const rooms = new Map<string, YjsRoom>();

export async function getYjsRoom(projectId: string): Promise<YjsRoom> {
  if (rooms.has(projectId)) return rooms.get(projectId)!;

  const doc      = new Y.Doc();
  const features = doc.getMap<Y.Map<unknown>>("features");

  // Offline persistence — loads existing state from IDB before returning
  const idbProvider = new IndexeddbPersistence(`gc-yjs-${projectId}`, doc);
  await idbProvider.whenSynced;

  const room: YjsRoom = {
    doc, features, idbProvider, wsProvider: null,

    connect: async () => {
      if (room.wsProvider?.wsconnected) return;
      const { token } = await getAuth();
      if (!token) return;

      room.wsProvider = new WebsocketProvider(
        `${WS_URL}/sync/${projectId}`,
        projectId,
        doc,
        { params: { token } }
      );

      room.wsProvider.on("status", ({ status }: { status: string }) => {
        console.log(`[Yjs] Room ${projectId}: ${status}`);
      });
    },

    disconnect: () => {
      room.wsProvider?.destroy();
      room.wsProvider = null;
    },
  };

  rooms.set(projectId, room);
  return room;
}

/**
 * Update a feature's attributes in the Yjs doc.
 * This is the CRDT write — all connected peers will receive the delta.
 */
export function setFeatureAttributes(
  room: YjsRoom,
  featureId: string,
  attrs: Record<string, unknown>
): void {
  doc_transaction(room.doc, () => {
    let featureMap = room.features.get(featureId);
    if (!featureMap) {
      featureMap = new Y.Map<unknown>();
      room.features.set(featureId, featureMap);
    }
    for (const [k, v] of Object.entries(attrs)) {
      featureMap.set(k, v);
    }
  });
}

function doc_transaction(doc: Y.Doc, fn: () => void) {
  doc.transact(fn);
}

/**
 * Read a feature's current attribute state from the Yjs doc.
 */
export function getFeatureAttributes(
  room: YjsRoom,
  featureId: string
): Record<string, unknown> {
  const featureMap = room.features.get(featureId);
  if (!featureMap) return {};
  return Object.fromEntries(featureMap.entries());
}

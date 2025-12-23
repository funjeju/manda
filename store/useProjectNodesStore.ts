import { create } from 'zustand';
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Node, NodeType } from '@/lib/types';

interface ProjectNodesState {
    nodesById: Record<string, Node>;
    focusNodeId: string | null;
    loading: boolean;
    error: string | null;
    projectId: string | null;

    // Actions
    subscribeNodes: (projectId: string) => () => void;
    setFocusNodeId: (nodeId: string | null) => void;
    createNode: (parentId: string | null, slotIndex: number, data: Partial<Node>) => Promise<string>;
    updateNode: (nodeId: string, data: Partial<Node>) => Promise<void>;
    moveNode: (nodeId: string, targetParentId: string | null, targetSlotIndex: number) => Promise<void>;

    // Selectors (Helper functions to get derived state)
    getNode: (id: string) => Node | undefined;
    getChildrenForNode: (parentId: string | null) => (Node | { nodeType: 'EMPTY', id: string, slotIndex: number, parentId: string | null, depth: number })[];
    getBreadcrumbPath: (nodeId: string | null) => Node[];
    getAllTasks: () => Node[];
    // Overall progress for a project (average of node.progress)
    getOverallProgress: (projectId: string) => number;
    findFirstEmptySlot: (parentId: string) => number | null;
}

export const useProjectNodesStore = create<ProjectNodesState>((set, get) => ({
    nodesById: {},
    focusNodeId: null,
    loading: false,
    error: null,
    projectId: null,

    subscribeNodes: (projectId: string) => {
        set({ loading: true, projectId, nodesById: {} }); // Reset on switch

        // We get ALL nodes for the project. For < 1000 nodes this is fine for MVP.
        // For production, we might need pagination or depth-based loading, 
        // but Mandalart structure is usually dense enough to just load all for a smooth UX.
        const colRef = collection(db, `projects/${projectId}/nodes`);
        const unsubscribe = onSnapshot(colRef, (snapshot) => {
            const nodesMap: Record<string, Node> = {};
            let rootId: string | null = null;
            snapshot.docs.forEach(d => {
                const data = d.data();
                const sanitizedNode = {
                    ...data,
                    id: d.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
                } as Node;
                nodesMap[d.id] = sanitizedNode;
                // Root detection: explicit parentId null check, or depth 0
                if (data.parentId === null || data.depth === 0) {
                    rootId = d.id;
                }
            });

            // Fallback: If no root found, pick the first GOAL node (likely root)
            if (!rootId) {
                const firstGoal = Object.values(nodesMap).find(n => n.nodeType === 'GOAL');
                if (firstGoal) rootId = firstGoal.id;
            }

            set(state => {
                // Auto-set focus to root if not set or if invalid
                const currentFocus = state.focusNodeId;
                // Verify current focus still exists in new map
                const isFocusValid = currentFocus && nodesMap[currentFocus];

                // If current focus is invalid, fallback to rootId.
                // If rootId is still null (e.g. empty collection?), preserve null (will show empty/error state).
                const newFocus = isFocusValid ? currentFocus : rootId;

                // If focus is still null (no root found), user sees nothing.
                // Try to find ANY goal to focus on if rootId failed.
                const finalFocus = newFocus || (Object.keys(nodesMap).length > 0 ? Object.keys(nodesMap)[0] : null);

                return {
                    nodesById: nodesMap,
                    loading: false,
                    focusNodeId: finalFocus
                };
            });
        }, (err) => {
            console.error("Nodes sync error", err);
            set({ error: err.message, loading: false });
        });

        return unsubscribe;
    },

    setFocusNodeId: (nodeId) => set({ focusNodeId: nodeId }),

    createNode: async (parentId, slotIndex, data) => {
        const { projectId, nodesById } = get();
        if (!projectId) throw new Error("No active project");

        // Calculate depth
        let depth = 0;
        if (parentId && nodesById[parentId]) {
            depth = nodesById[parentId].depth + 1;
        }

        const newNodeRef = doc(collection(db, `projects/${projectId}/nodes`));
        const newNode: Partial<Node> = {
            ...data,
            id: newNodeRef.id,
            projectId,
            parentId,
            slotIndex,
            depth,
            createdAt: serverTimestamp() as any, // Cast for local
            updatedAt: serverTimestamp() as any
        };

        // Sanitize: Remove undefined fields (Firestore doesn't support them)
        Object.keys(newNode).forEach(key => {
            if ((newNode as any)[key] === undefined) {
                delete (newNode as any)[key];
            }
        });

        await setDoc(newNodeRef, newNode);
        return newNodeRef.id;
    },

    updateNode: async (nodeId, data) => {
        const { projectId } = get();
        if (!projectId) throw new Error("No active project");
        const nodeRef = doc(db, `projects/${projectId}/nodes`, nodeId);
        await updateDoc(nodeRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    },

    moveNode: async (nodeId, targetParentId, targetSlotIndex) => {
        const { projectId, nodesById } = get();
        if (!projectId) throw new Error("No active project");

        const node = nodesById[nodeId];
        if (!node) throw new Error("Node not found");

        // 1. Check if moving to descendant (Cycle detection)
        let current = targetParentId ? nodesById[targetParentId] : null;
        while (current) {
            if (current.id === nodeId) throw new Error("Cannot move node into its own descendant");
            current = current.parentId ? nodesById[current.parentId] : null;
        }

        // 2. Check if target slot is occupied
        const siblings = Object.values(nodesById).filter(n => n.parentId === targetParentId);
        if (siblings.some(n => n.slotIndex === targetSlotIndex)) {
            throw new Error("Target slot is already occupied");
        }

        // 3. Calculate Depth Delta
        const newParent = targetParentId ? nodesById[targetParentId] : null;
        const newDepth = newParent ? newParent.depth + 1 : 0;
        const depthDelta = newDepth - node.depth;

        // 4. Batch Update (Node + All Descendants)
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);

        // Update the moved node itself
        const nodeRef = doc(db, `projects/${projectId}/nodes`, nodeId);
        batch.update(nodeRef, {
            parentId: targetParentId,
            slotIndex: targetSlotIndex,
            depth: newDepth,
            updatedAt: serverTimestamp()
        });

        // Update all descendants' depth
        const updateDescendants = (parentId: string, currentDelta: number) => {
            const children = Object.values(nodesById).filter(n => n.parentId === parentId);
            children.forEach(child => {
                const childRef = doc(db, `projects/${projectId}/nodes`, child.id);
                batch.update(childRef, {
                    depth: child.depth + currentDelta,
                    updatedAt: serverTimestamp()
                });
                updateDescendants(child.id, currentDelta);
            });
        };

        if (depthDelta !== 0) {
            updateDescendants(nodeId, depthDelta);
        }

        await batch.commit();
    },

    getNode: (id) => get().nodesById[id],

    getChildrenForNode: (parentId) => {
        const { nodesById } = get();
        // 1. Find existing children
        const children = Object.values(nodesById).filter(n => n.parentId === parentId);

        // 2. Map to 3x3 grid (slots 0-8)
        // Slot 0 is always the parent itself (Center) in UI representation, 
        // BUT in data model, children occupy slots 1-8 around the parent.
        // Wait, the prompt says: "0 is center fixed, 1-8 are surrounding".
        // Usually, the "Zoomed In" view shows the PARENT in the center (slot 0)
        // and its CHILDREN in slots 1-8.
        // So slot 0 is NOT a child. It's the focus node.
        // If we are looking for children of parentId, we expect them in slots 1-8.

        // However, for the grid rendering, we need array of 9 items.

        // Let's create an array of 9 items.
        // Item at index 0 should be the parent node itself (Visual only? Or is there a child at slot 0?)
        // "SlotIndex (0~8 중 0은 center 고정, 1~8이 주변 칸)"
        // The "center" of a 3x3 grid usually represents the GOAL of that grid.
        // So if I am focused on Node A, Node A is at slot 0.
        // Its children are at slots 1-8.

        const parentNode = parentId ? nodesById[parentId] : null;

        // Prepare result array
        const grid: any[] = new Array(9).fill(null);

        // If parentNode exists, place it in slot 0? 
        // Or does the UI handle "Center = Focus Node"? 
        // Let's assume the UI asks for "Cell Data for Slot K".
        // If K=0, it renders the current focus node.
        // If K=1..8, it renders the child at that slot.

        // Use this logic:
        // Slot 0: Returns the parent node itself (as a "Self" reference for the center)
        if (parentNode) {
            grid[0] = parentNode;
        }

        // Slots 1-8: Fill with children or Virtual Empty
        for (let i = 1; i <= 8; i++) {
            const child = children.find(c => c.slotIndex === i);
            if (child) {
                grid[i] = child;
            } else {
                // Virtual Empty
                grid[i] = {
                    nodeType: 'EMPTY',
                    id: `virtual-empty-${parentId}-${i}`,
                    projectId: parentNode?.projectId,
                    parentId: parentId,
                    slotIndex: i,
                    depth: parentNode ? parentNode.depth + 1 : 0,
                };
            }
        }
        return grid;
    },

    getBreadcrumbPath: (nodeId) => {
        const { nodesById } = get();
        const path: Node[] = [];
        let current = nodeId ? nodesById[nodeId] : null;
        while (current) {
            path.unshift(current);
            if (current.parentId) {
                current = nodesById[current.parentId];
            } else {
                current = null;
            }
        }
        return path;
    },

    getAllTasks: () => {
        const { nodesById } = get();
        return Object.values(nodesById).filter(n => n.nodeType === 'TASK');
    },
    // Overall progress for a project (average of node.progress)
    getOverallProgress: (projectId: string) => {
        const { nodesById } = get();
        const nodes = Object.values(nodesById).filter(n => n.projectId === projectId);
        if (nodes.length === 0) return 0;
        const total = nodes.reduce((sum, n) => sum + (n.progress ?? 0), 0);
        return Math.round(total / nodes.length);
    },

    findFirstEmptySlot: (parentId: string) => {
        const { nodesById } = get();
        const children = Object.values(nodesById).filter(n => n.parentId === parentId);
        const occupiedSlots = children.map(n => n.slotIndex);

        // Slots 1-8 are valid for children
        for (let i = 1; i <= 8; i++) {
            if (!occupiedSlots.includes(i)) {
                return i;
            }
        }
        return null; // Full
    }
}));

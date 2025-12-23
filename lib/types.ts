export type User = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
};

export type ProjectMode = 'SOLO' | 'TEAM';

export type Project = {
    id: string;
    title: string;
    description?: string; // New optional description field
    mode: ProjectMode;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    timezone: string;
    institutionName?: string;
    organizationId?: string;
    ownerId: string;
    members: string[]; // User UIDs
    rootNodeId: string;
    colorTag: string; // Hex color for global todo differentiation
    isSample?: boolean;
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
};

export type NodeType = 'EMPTY' | 'GOAL' | 'TASK';
export type NodeStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'REVIEW';



// --- Advanced Features ---

export type TaskConfig = {
    dueDate?: string;
    isRecurring: boolean;
    estimatedDuration?: number; // In minutes
    targetCount?: number;
    currentCount?: number;
    unitLabel?: string;
    resultsSummary?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type LogAction = 'CREATE_NODE' | 'UPDATE_NODE' | 'DELETE_NODE' | 'MOVE_NODE' | 'APPROVE_CHANGE' | 'REJECT_CHANGE';

export type LogEntry = {
    id: string;
    projectId: string;
    userId: string;
    userName: string;
    action: LogAction;
    targetId: string; // Node ID or Project ID
    targetName: string;
    details?: string; // Human readable summary ("Moved X to Y")
    timestamp: string; // ISO String
};

export type ApprovalRequest = {
    id: string;
    projectId: string;
    userId: string;
    userName: string;
    action: LogAction;
    payload: any; // The data to be applied if approved
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
};

export type Node = {
    id: string;
    projectId: string;
    parentId: string | null;
    depth: number;
    slotIndex: number; // 0-8. 0 is center.
    title: string;
    description?: string; // New optional description field
    nodeType: NodeType;
    dateRange: {
        startDate: string;
        endDate: string;
    } | null;
    assignee: {
        id: string;
        name: string;
        photoURL?: string;
    } | null;
    department?: string;
    status: NodeStatus;
    progress: number; // 0-100
    taskConfig?: TaskConfig;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
};

export type ArtifactType = 'TEXT' | 'LINK' | 'FILE' | 'IMAGE' | 'NUMBER';

export type Artifact = {
    id: string;
    projectId: string;
    nodeId: string;
    type: ArtifactType;
    value: string;
    fileRef?: string;
    createdBy: string;
    createdAt: string;
};

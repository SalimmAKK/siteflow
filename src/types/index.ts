export type UserRole = 'manager' | 'member';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
}

export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type TaskStatus = 'Todo' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Invitation {
  id: string;
  email: string;
  projectId: string;
  projectName: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'cancelled';
  createdAt: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: any;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  /** Target completion date — set via the create/edit form and used by computeSiteHealth(). */
  dueDate: any;
  managerId: string;
  managerName: string;
  teamMemberIds: string[];
  createdAt: any;
  /** Random bearer token for the public client portal (/share/:token). Generated on creation. */
  shareToken?: string;
  /** Site location — used to pull a per-project weather forecast (Open-Meteo). */
  lat?: number;
  lng?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: any;
  assignedUserId: string;
  assignedUserName: string;
  projectId: string;
  projectName: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  createdAt: any;
  /** Weather-sensitive work (e.g. concrete pour, roofing, exterior finishing) — flagged when scheduled on a risky-weather day. */
  isWeatherSensitive?: boolean;
}

export interface SiteDiaryEntry {
  id: string;
  projectId: string;
  /** The day this entry logs, stored as a Firestore Timestamp. */
  date: any;
  authorId: string;
  weatherCondition: string;
  crewPresent: number;
  equipmentOnSite: string[];
  notes: string;
  /** Server write time — used for stable ordering/tie-breaking. */
  createdAt?: any;
}

export interface Activity {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'project_created' | 'member_added';
  userId: string;
  userName: string;
  targetId: string;
  targetName: string;
  description: string;
  timestamp: any;
}

export type Role = 'admin' | 'user';

export interface User {
  username: string;
  role: Role;
  name: string;
  unit: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
}

export interface Highlight {
  id: string;
  event: string;
  date: string;
  venue: string;
  description: string;
  image?: string;
}

export interface Complaint {
  complaintID: string;
  name: string;
  phone: string;
  category: string;
  complaint: string;
  progress: 'Pending' | 'In Progress' | 'Resolved';
  date?: string;
}

export interface AttendanceRecord {
  date: string;
  name: string;
  unit: string;
  program: string;
}

export interface Program {
  ProgramID: string;
  ProgramName: string;
  Code: string;
  Status: 'Active' | 'Closed';
}

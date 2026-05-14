export interface Workspace {
  id: string
  ownerId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
}

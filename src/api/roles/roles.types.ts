export interface Role {
  id: string;
  code: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleWithAssignableRoles extends Role {
  assignableRoles: Role[];
}

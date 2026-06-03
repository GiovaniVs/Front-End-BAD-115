import { UserRole } from './user-role.model';

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

import { UserRole } from './user-role.model';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

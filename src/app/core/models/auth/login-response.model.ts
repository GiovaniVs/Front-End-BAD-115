//definimos la estructura de como respondera el servidor del backend
import { UserRole } from "./user-role.model";
 
export interface LoginResponse{
  token?: string; 
  fullName?: string; 
  username?: string;
  role?: UserRole; 
  idRol?: number;
  rol?: {
    idRol: number;
    nombreRol?: string;
    nombre?: string;
  };
  roles?: Array<{
    authority?: string;
  }>;
}

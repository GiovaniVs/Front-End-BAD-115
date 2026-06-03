//definimos la estructura de como respondera el servidor del backend
import { UserRole } from "./user-role.model";
 
export interface LoginResponse{
  token : string; 
  fullName: string; 
  role: UserRole; 
}
export interface RegisterRequest {
  username: string;
  password: string;
  correo: string;
  rol: {
    idRol: number;
  };
  debeCambiarPass: boolean;
}

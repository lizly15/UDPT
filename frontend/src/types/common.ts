// Dùng chung (auth). KHÔNG sửa file này khi làm module riêng.
export interface AuthResult {
  access_token: string;
  refresh_token: string;
  roles: string[];
  user_id: string;
  full_name: string;
}
export interface Me {
  id: string;
  username: string;
  full_name: string;
  department: string;
  roles: string[];
}

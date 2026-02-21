export interface Message {
  role: "user" | "model";
  content: string;
}

export interface UserProfile {
  name?: string;
  hobbies?: string;
  goals?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  zone?: string; // e.g. "Buenos Aires", "Mendoza", "Córdoba"
}

export interface ResponseIndividual {
  member: string; // Member name
  availableDays: string[]; // Days of the week (e.g., ["Lunes", "Viernes"])
  preferredTime?: string; // "Mañana", "Tarde", "Noche"
  planType?: string; // "Cine", "Comida", "Senderismo", "Deporte", "Arte", "Otro"
  budget: number;
}

export interface Group {
  id: string;
  name: string;
  code: string; // 8 characters
  creator: string; // creator userId
  members: string[]; // list of member names
  responses: ResponseIndividual[];
  createdAt: string; // ISO string
}

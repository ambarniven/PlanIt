import { Group, ResponseIndividual } from "../types";

export const MOCK_USERS = [
  { name: "María", email: "maria@email.com" },
  { name: "Juan", email: "juan@email.com" },
  { name: "Sofía", email: "sofia@email.com" },
  { name: "Lucas", email: "lucas@email.com" }
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: "group-viernes-cine",
    name: "Viernes de amigxs 🍿",
    code: "X4K9Z2M1",
    creator: "user-maria-id",
    members: ["María", "Juan", "Sofía", "Lucas"],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    responses: [
      {
        member: "María",
        availableDays: ["Viernes", "Sábado"],
        preferredTime: "Noche",
        planType: "Cine",
        budget: 18000
      },
      {
        member: "Juan",
        availableDays: ["Viernes", "Domingo"],
        preferredTime: "Noche",
        planType: "Comida",
        budget: 15000
      },
      {
        member: "Sofía",
        availableDays: ["Viernes", "Sábado"],
        preferredTime: "Tarde",
        planType: "Cine",
        budget: 22000
      }
    ]
  },
  {
    id: "group-picnic-montana",
    name: "Picnic en la montaña 🌲",
    code: "M7L3N5Q8",
    creator: "user-juan-id",
    members: ["Juan", "María", "Sofía", "Andrés"],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    responses: [
      {
        member: "Juan",
        availableDays: ["Sábado", "Domingo"],
        preferredTime: "Tarde",
        planType: "Senderismo",
        budget: 12000
      },
      {
        member: "María",
        availableDays: ["Sábado"],
        preferredTime: "Mañana",
        planType: "Senderismo",
        budget: 16000
      },
      {
        member: "Sofía",
        availableDays: ["Sábado", "Domingo"],
        preferredTime: "Tarde",
        planType: "Otro",
        budget: 14000
      }
    ]
  }
];

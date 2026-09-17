export type RoomType = "STANDARD" | "DELUXE" | "SUITE" | "FAMILY";

export type RoomStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "CLEANING"
  | "MAINTENANCE";

export interface Room {
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  pricePerNight: number;
  status: RoomStatus;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}